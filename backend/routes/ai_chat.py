from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
import models
from pydantic import BaseModel
import re

router = APIRouter(prefix="/api/ai", tags=["ai"])

class ChatMessage(BaseModel):
    message: str

QUERY_PATTERNS = [
    {
        "patterns": [r"total ar.*over 90|ar.*>.*90|ar.*90.*day|aging.*90"],
        "handler": "ar_over_90"
    },
    {
        "patterns": [r"denial.*rate|denied.*rate"],
        "handler": "denial_rate"
    },
    {
        "patterns": [r"highest denial.*payer|payer.*highest denial|denial.*by payer|payer.*denial"],
        "handler": "denial_by_payer"
    },
    {
        "patterns": [r"ar.*aging.*specialty|aging.*by.*specialty|specialty.*ar|ar.*by.*specialty"],
        "handler": "ar_by_specialty"
    },
    {
        "patterns": [r"total ar|total.*account.*receiv|ar.*value|outstanding"],
        "handler": "total_ar"
    },
    {
        "patterns": [r"high.*risk|risk.*claim"],
        "handler": "high_risk"
    },
    {
        "patterns": [r"collection.*rate|net.*collection|gross.*collection"],
        "handler": "collection_rate"
    },
    {
        "patterns": [r"payer.*performance|payer.*comparison|compare.*payer"],
        "handler": "payer_performance"
    },
    {
        "patterns": [r"denial.*code|top.*denial|denial.*breakdown"],
        "handler": "denial_codes"
    },
    {
        "patterns": [r"revenue.*leak|leakage|lost.*revenue"],
        "handler": "revenue_leakage"
    },
    {
        "patterns": [r"clean.*claim|clean.*rate"],
        "handler": "clean_claim_rate"
    },
    {
        "patterns": [r"timely.*fil|tfl.*risk"],
        "handler": "tfl_risk"
    },
    {
        "patterns": [r"unworked|backlog|pending.*claim"],
        "handler": "unworked"
    },
    {
        "patterns": [r"appeal|appealed"],
        "handler": "appeals"
    },
    {
        "patterns": [r"underpay|under.*pay"],
        "handler": "underpayment"
    },
    {
        "patterns": [r"claim.*status|status.*breakdown|status.*distribution"],
        "handler": "status_breakdown"
    },
    {
        "patterns": [r"help|what can you|what.*do|capabilities"],
        "handler": "help"
    },
]

def match_query(message):
    msg_lower = message.lower().strip()
    for qp in QUERY_PATTERNS:
        for pattern in qp["patterns"]:
            if re.search(pattern, msg_lower):
                return qp["handler"]
    return None

def handle_ar_over_90(db):
    count = db.query(models.Claim).filter(models.Claim.aging_days > 90).count()
    value = db.query(func.sum(models.Claim.charge_amount)).filter(models.Claim.aging_days > 90).scalar() or 0
    total = db.query(models.Claim).count()
    pct = round((count / total * 100) if total else 0, 1)

    by_payer = db.query(
        models.Claim.payer,
        func.count(models.Claim.id).label("count"),
        func.sum(models.Claim.charge_amount).label("value")
    ).filter(models.Claim.aging_days > 90).group_by(models.Claim.payer).order_by(func.sum(models.Claim.charge_amount).desc()).limit(8).all()

    return {
        "text": f"Total AR over 90 days: **{count} claims** worth **${value:,.2f}** ({pct}% of total inventory). This represents a significant portion of aging receivables that require immediate follow-up to prevent write-offs.",
        "chart": {
            "type": "bar",
            "title": "AR Over 90 Days by Payer",
            "data": [{"name": r[0][:20], "value": round(float(r[2] or 0), 2), "count": r[1]} for r in by_payer]
        },
        "metrics": [
            {"label": "Claims > 90 Days", "value": str(count)},
            {"label": "Total Value", "value": f"${value:,.0f}"},
            {"label": "% of Total AR", "value": f"{pct}%"},
        ]
    }

def handle_denial_rate(db):
    total = db.query(models.Claim).count()
    denied = db.query(models.Claim).filter(models.Claim.denial_code != None).count()
    rate = round((denied / total * 100) if total else 0, 1)
    denial_value = db.query(func.sum(models.Claim.charge_amount)).filter(models.Claim.denial_code != None).scalar() or 0

    return {
        "text": f"Current denial rate is **{rate}%** ({denied} out of {total} claims). Total denied AR value: **${denial_value:,.2f}**. Industry benchmark is 5-10%. {'Your denial rate is above benchmark — consider root cause analysis.' if rate > 10 else 'Your denial rate is within acceptable range.'}",
        "metrics": [
            {"label": "Denial Rate", "value": f"{rate}%"},
            {"label": "Denied Claims", "value": str(denied)},
            {"label": "Denied Value", "value": f"${denial_value:,.0f}"},
        ]
    }

def handle_denial_by_payer(db):
    rows = db.query(
        models.Claim.payer,
        func.count(models.Claim.id).label("total"),
    ).group_by(models.Claim.payer).all()

    payer_data = []
    for r in rows:
        denied = db.query(models.Claim).filter(
            models.Claim.payer == r.payer, models.Claim.denial_code != None
        ).count()
        rate = round((denied / r.total * 100) if r.total else 0, 1)
        payer_data.append({"name": r.payer, "denial_rate": rate, "denied": denied, "total": r.total})

    payer_data.sort(key=lambda x: x["denial_rate"], reverse=True)
    top = payer_data[0] if payer_data else {"name": "N/A", "denial_rate": 0}

    return {
        "text": f"**{top['name']}** has the highest denial rate at **{top['denial_rate']}%**. Here's the breakdown across all payers:",
        "chart": {
            "type": "bar",
            "title": "Denial Rate by Payer",
            "data": [{"name": p["name"][:20], "value": p["denial_rate"], "count": p["denied"]} for p in payer_data[:10]]
        },
        "table": {
            "headers": ["Payer", "Denial Rate", "Denied", "Total Claims"],
            "rows": [[p["name"], f"{p['denial_rate']}%", str(p["denied"]), str(p["total"])] for p in payer_data]
        }
    }

def handle_ar_by_specialty(db):
    rows = db.query(
        models.Claim.specialty,
        func.count(models.Claim.id).label("count"),
        func.sum(models.Claim.charge_amount).label("value"),
        func.avg(models.Claim.aging_days).label("avg_aging")
    ).group_by(models.Claim.specialty).order_by(func.sum(models.Claim.charge_amount).desc()).all()

    return {
        "text": f"AR aging breakdown by specialty — {len(rows)} specialties in the system. Top AR concentration is in **{rows[0][0]}** with ${float(rows[0][2] or 0):,.0f} in outstanding AR." if rows else "No specialty data available.",
        "chart": {
            "type": "bar",
            "title": "AR Value by Specialty",
            "data": [{"name": r[0][:20], "value": round(float(r[2] or 0), 2), "count": r[1]} for r in rows]
        },
        "table": {
            "headers": ["Specialty", "Claims", "AR Value", "Avg Aging"],
            "rows": [[r[0], str(r[1]), f"${float(r[2] or 0):,.0f}", f"{float(r[3] or 0):.0f} days"] for r in rows]
        }
    }

def handle_total_ar(db):
    total_ar = db.query(func.sum(models.Claim.charge_amount)).scalar() or 0
    total_paid = db.query(func.sum(models.Claim.paid_amount)).scalar() or 0
    total_claims = db.query(models.Claim).count()

    buckets = [("0-30", 0, 30), ("31-60", 31, 60), ("61-90", 61, 90), ("91-120", 91, 120), (">120", 121, 99999)]
    bucket_data = []
    for label, low, high in buckets:
        val = db.query(func.sum(models.Claim.charge_amount)).filter(
            models.Claim.aging_days >= low, models.Claim.aging_days <= high
        ).scalar() or 0
        cnt = db.query(models.Claim).filter(
            models.Claim.aging_days >= low, models.Claim.aging_days <= high
        ).count()
        bucket_data.append({"name": label, "value": round(float(val), 2), "count": cnt})

    return {
        "text": f"Total outstanding AR: **${float(total_ar):,.2f}** across **{total_claims}** claims. Total payments collected: **${float(total_paid or 0):,.2f}**.",
        "chart": {
            "type": "bar",
            "title": "AR by Aging Bucket",
            "data": bucket_data
        },
        "metrics": [
            {"label": "Total AR", "value": f"${float(total_ar):,.0f}"},
            {"label": "Total Paid", "value": f"${float(total_paid or 0):,.0f}"},
            {"label": "Total Claims", "value": str(total_claims)},
        ]
    }

def handle_high_risk(db):
    count = db.query(models.Claim).filter(models.Claim.risk_score == "High").count()
    value = db.query(func.sum(models.Claim.charge_amount)).filter(models.Claim.risk_score == "High").scalar() or 0
    total = db.query(models.Claim).count()

    by_payer = db.query(
        models.Claim.payer,
        func.count(models.Claim.id).label("count"),
    ).filter(models.Claim.risk_score == "High").group_by(models.Claim.payer).order_by(func.count(models.Claim.id).desc()).limit(8).all()

    return {
        "text": f"**{count} high-risk claims** valued at **${float(value):,.2f}** ({round(count/total*100,1) if total else 0}% of total). These claims require immediate attention to prevent revenue loss.",
        "chart": {
            "type": "bar",
            "title": "High Risk Claims by Payer",
            "data": [{"name": r[0][:20], "value": r[1], "count": r[1]} for r in by_payer]
        },
        "metrics": [
            {"label": "High Risk Claims", "value": str(count)},
            {"label": "At-Risk Value", "value": f"${float(value):,.0f}"},
            {"label": "% of Total", "value": f"{round(count/total*100,1) if total else 0}%"},
        ]
    }

def handle_collection_rate(db):
    total_ar = db.query(func.sum(models.Claim.charge_amount)).scalar() or 0
    total_paid = db.query(func.sum(models.Claim.paid_amount)).scalar() or 0
    total_allowed = db.query(func.sum(models.Claim.allowed_amount)).scalar() or 0
    gross = round((float(total_paid) / float(total_ar) * 100) if total_ar else 0, 1)
    net = round((float(total_paid) / float(total_allowed) * 100) if total_allowed else 0, 1)

    return {
        "text": f"Gross Collection Rate: **{gross}%** | Net Collection Rate: **{net}%**. Industry benchmark for net collection is 95-98%.",
        "metrics": [
            {"label": "Gross Collection", "value": f"{gross}%"},
            {"label": "Net Collection", "value": f"{net}%"},
            {"label": "Total Collected", "value": f"${float(total_paid or 0):,.0f}"},
        ]
    }

def handle_payer_performance(db):
    rows = db.query(
        models.Claim.payer,
        func.count(models.Claim.id).label("total"),
        func.sum(models.Claim.charge_amount).label("charged"),
        func.sum(models.Claim.paid_amount).label("paid"),
        func.avg(models.Claim.aging_days).label("avg_aging"),
    ).group_by(models.Claim.payer).order_by(func.sum(models.Claim.charge_amount).desc()).all()

    return {
        "text": f"Payer performance comparison across {len(rows)} payers:",
        "chart": {
            "type": "bar",
            "title": "Payer Performance - Charged vs Paid",
            "data": [{"name": r[0][:20], "value": round(float(r[2] or 0), 2), "paid": round(float(r[3] or 0), 2)} for r in rows]
        },
        "table": {
            "headers": ["Payer", "Claims", "Charged", "Paid", "Avg Aging"],
            "rows": [[r[0], str(r[1]), f"${float(r[2] or 0):,.0f}", f"${float(r[3] or 0):,.0f}", f"{float(r[4] or 0):.0f}d"] for r in rows]
        }
    }

def handle_denial_codes(db):
    rows = db.query(
        models.Claim.denial_code,
        models.Claim.denial_description,
        func.count(models.Claim.id).label("count"),
        func.sum(models.Claim.charge_amount).label("value")
    ).filter(models.Claim.denial_code != None).group_by(
        models.Claim.denial_code, models.Claim.denial_description
    ).order_by(func.count(models.Claim.id).desc()).all()

    return {
        "text": f"Top denial codes across {sum(r[2] for r in rows)} denied claims:",
        "chart": {
            "type": "bar",
            "title": "Denial Code Distribution",
            "data": [{"name": r[0], "value": r[2], "count": r[2]} for r in rows[:10]]
        },
        "table": {
            "headers": ["Code", "Description", "Count", "Value"],
            "rows": [[r[0], r[1] or "", str(r[2]), f"${float(r[3] or 0):,.0f}"] for r in rows]
        }
    }

def handle_revenue_leakage(db):
    total_ar = db.query(func.sum(models.Claim.charge_amount)).scalar() or 0
    total_paid = db.query(func.sum(models.Claim.paid_amount)).scalar() or 0
    leakage = float(total_ar) - float(total_paid or 0)
    denial_value = db.query(func.sum(models.Claim.charge_amount)).filter(models.Claim.denial_code != None).scalar() or 0
    writeoff = db.query(func.sum(models.Claim.charge_amount)).filter(
        models.Claim.aging_days > 180, models.Claim.denial_code != None
    ).scalar() or 0

    return {
        "text": f"Revenue leakage analysis: Total leakage **${leakage:,.2f}**. Denied AR: **${float(denial_value):,.2f}**. Potential write-offs: **${float(writeoff):,.2f}**.",
        "metrics": [
            {"label": "Revenue Leakage", "value": f"${leakage:,.0f}"},
            {"label": "Denied AR", "value": f"${float(denial_value):,.0f}"},
            {"label": "Write-off Risk", "value": f"${float(writeoff):,.0f}"},
        ]
    }

def handle_clean_claim_rate(db):
    total = db.query(models.Claim).count()
    denied = db.query(models.Claim).filter(models.Claim.denial_code != None).count()
    rate = round(((total - denied) / total * 100) if total else 0, 1)

    return {
        "text": f"Clean claim rate is **{rate}%** ({total - denied} of {total} claims processed without denial). Industry target is 95%+. {'On track!' if rate >= 95 else 'Below benchmark — review front-end edits and eligibility verification.'}",
        "metrics": [
            {"label": "Clean Claim Rate", "value": f"{rate}%"},
            {"label": "Clean Claims", "value": str(total - denied)},
            {"label": "Total Claims", "value": str(total)},
        ]
    }

def handle_tfl_risk(db):
    count = db.query(models.Claim).filter(models.Claim.aging_days > 120, models.Claim.denial_code == None).count()
    value = db.query(func.sum(models.Claim.charge_amount)).filter(
        models.Claim.aging_days > 120, models.Claim.denial_code == None
    ).scalar() or 0

    return {
        "text": f"**{count} claims** at risk of timely filing expiration, valued at **${float(value):,.2f}**. These claims are over 120 days old and need immediate submission or follow-up.",
        "metrics": [
            {"label": "TFL Risk Claims", "value": str(count)},
            {"label": "At-Risk Value", "value": f"${float(value):,.0f}"},
        ]
    }

def handle_unworked(db):
    count = db.query(models.Claim).filter(
        models.Claim.claim_status.in_(["Created", "Submitted", "No Response"])
    ).count()
    value = db.query(func.sum(models.Claim.charge_amount)).filter(
        models.Claim.claim_status.in_(["Created", "Submitted", "No Response"])
    ).scalar() or 0

    return {
        "text": f"**{count} unworked claims** in the backlog, valued at **${float(value):,.2f}**. These claims have not been actively worked and require assignment to AR executives.",
        "metrics": [
            {"label": "Unworked Claims", "value": str(count)},
            {"label": "Backlog Value", "value": f"${float(value):,.0f}"},
        ]
    }

def handle_appeals(db):
    count = db.query(models.Claim).filter(models.Claim.claim_status == "Appealed").count()
    value = db.query(func.sum(models.Claim.charge_amount)).filter(models.Claim.claim_status == "Appealed").scalar() or 0

    return {
        "text": f"**{count} claims** currently in appeal status, valued at **${float(value):,.2f}**. Monitor appeal deadlines to prevent missed filing windows.",
        "metrics": [
            {"label": "Appeals Pending", "value": str(count)},
            {"label": "Appeal Value", "value": f"${float(value):,.0f}"},
        ]
    }

def handle_underpayment(db):
    count = db.query(models.Claim).filter(
        models.Claim.paid_amount != None,
        models.Claim.allowed_amount != None,
        models.Claim.paid_amount < models.Claim.allowed_amount
    ).count()
    value = db.query(
        func.sum(models.Claim.allowed_amount - models.Claim.paid_amount)
    ).filter(
        models.Claim.paid_amount != None,
        models.Claim.allowed_amount != None,
        models.Claim.paid_amount < models.Claim.allowed_amount
    ).scalar() or 0

    return {
        "text": f"**{count} underpaid claims** detected with total underpayment of **${float(value):,.2f}**. These should be reviewed against contracted fee schedules.",
        "metrics": [
            {"label": "Underpaid Claims", "value": str(count)},
            {"label": "Underpayment Value", "value": f"${float(value):,.0f}"},
        ]
    }

def handle_status_breakdown(db):
    statuses = ["Created", "Submitted", "Rejected", "Received", "No Response", "In Process", "Denied", "Paid", "Appealed", "Resolved"]
    data = []
    for status in statuses:
        count = db.query(models.Claim).filter(models.Claim.claim_status == status).count()
        if count > 0:
            data.append({"name": status, "value": count, "count": count})

    return {
        "text": f"Claim status distribution across all {sum(d['count'] for d in data)} claims:",
        "chart": {
            "type": "bar",
            "title": "Claim Status Distribution",
            "data": data
        }
    }

def handle_help(db):
    return {
        "text": """I can help you analyze your RCM data. Try asking questions like:

• **"What is the total AR over 90 days?"** — AR aging analysis
• **"Which payer has the highest denial rate?"** — Payer denial comparison
• **"Show AR aging by specialty"** — Specialty breakdown
• **"What is the denial rate?"** — Overall denial metrics
• **"Show collection rate"** — Gross and net collection rates
• **"Show payer performance"** — Payer comparison with charges vs paid
• **"What are the top denial codes?"** — Denial code breakdown
• **"Show revenue leakage"** — Revenue gap analysis
• **"What is the clean claim rate?"** — Clean claim percentage
• **"Show timely filing risk"** — TFL risk analysis
• **"How many unworked claims?"** — Backlog analysis
• **"Show appeals status"** — Pending appeals
• **"Show underpayment analysis"** — Underpaid claims
• **"Show claim status breakdown"** — Status distribution""",
        "metrics": []
    }

HANDLERS = {
    "ar_over_90": handle_ar_over_90,
    "denial_rate": handle_denial_rate,
    "denial_by_payer": handle_denial_by_payer,
    "ar_by_specialty": handle_ar_by_specialty,
    "total_ar": handle_total_ar,
    "high_risk": handle_high_risk,
    "collection_rate": handle_collection_rate,
    "payer_performance": handle_payer_performance,
    "denial_codes": handle_denial_codes,
    "revenue_leakage": handle_revenue_leakage,
    "clean_claim_rate": handle_clean_claim_rate,
    "tfl_risk": handle_tfl_risk,
    "unworked": handle_unworked,
    "appeals": handle_appeals,
    "underpayment": handle_underpayment,
    "status_breakdown": handle_status_breakdown,
    "help": handle_help,
}

@router.post("/chat")
def ai_chat(msg: ChatMessage, db: Session = Depends(get_db)):
    handler_name = match_query(msg.message)
    if handler_name and handler_name in HANDLERS:
        result = HANDLERS[handler_name](db)
        return {
            "response": result.get("text", ""),
            "chart": result.get("chart"),
            "table": result.get("table"),
            "metrics": result.get("metrics", []),
            "query_type": handler_name,
        }

    return {
        "response": "I can help you analyze your RCM data. Try asking about AR aging, denial rates, payer performance, collection rates, risk indicators, or claim status. Type **'help'** to see all available queries.",
        "chart": None,
        "table": None,
        "metrics": [],
        "query_type": "unknown",
    }
