from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_, or_
from database import get_db
import models
from typing import Optional

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    total_claims = db.query(models.Claim).count()
    total_ar = db.query(func.sum(models.Claim.charge_amount)).scalar() or 0
    total_paid = db.query(func.sum(models.Claim.paid_amount)).scalar() or 0
    total_allowed = db.query(func.sum(models.Claim.allowed_amount)).scalar() or 0
    denied_claims = db.query(models.Claim).filter(models.Claim.denial_code != None).count()
    high_risk = db.query(models.Claim).filter(models.Claim.risk_score == "High").count()
    avg_aging = db.query(func.avg(models.Claim.aging_days)).scalar() or 0
    paid_claims = db.query(models.Claim).filter(models.Claim.claim_status == "Paid").count()
    resolved_claims = db.query(models.Claim).filter(models.Claim.claim_status == "Resolved").count()

    gross_collection = round((float(total_paid) / float(total_ar) * 100) if total_ar else 0, 1)
    net_collection = round((float(total_paid) / float(total_allowed) * 100) if total_allowed else 0, 1)
    clean_claim_rate = round(((total_claims - denied_claims) / total_claims * 100) if total_claims else 0, 1)
    revenue_leakage = round(float(total_ar) - float(total_paid or 0), 2)

    return {
        "total_claims": total_claims,
        "total_ar_value": round(float(total_ar), 2),
        "total_paid": round(float(total_paid or 0), 2),
        "total_allowed": round(float(total_allowed or 0), 2),
        "denied_claims": denied_claims,
        "denial_rate": round((denied_claims / total_claims * 100) if total_claims else 0, 1),
        "high_risk_count": high_risk,
        "avg_aging_days": round(float(avg_aging), 1),
        "paid_claims": paid_claims,
        "resolved_claims": resolved_claims,
        "gross_collection_rate": gross_collection,
        "net_collection_rate": net_collection,
        "clean_claim_rate": clean_claim_rate,
        "revenue_leakage": round(revenue_leakage, 2),
    }

@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    total_claims = db.query(models.Claim).count()
    total_ar = db.query(func.sum(models.Claim.charge_amount)).scalar() or 0
    total_paid = db.query(func.sum(models.Claim.paid_amount)).scalar() or 0
    total_allowed = db.query(func.sum(models.Claim.allowed_amount)).scalar() or 0
    denied_claims = db.query(models.Claim).filter(models.Claim.denial_code != None).count()
    high_risk = db.query(models.Claim).filter(models.Claim.risk_score == "High").count()
    avg_aging = db.query(func.avg(models.Claim.aging_days)).scalar() or 0

    ar_over_90 = db.query(models.Claim).filter(models.Claim.aging_days > 90).count()
    ar_over_90_value = db.query(func.sum(models.Claim.charge_amount)).filter(models.Claim.aging_days > 90).scalar() or 0
    high_balance = db.query(models.Claim).filter(models.Claim.charge_amount >= 5000).count()
    high_balance_value = db.query(func.sum(models.Claim.charge_amount)).filter(models.Claim.charge_amount >= 5000).scalar() or 0
    appealed = db.query(models.Claim).filter(models.Claim.claim_status == "Appealed").count()
    appealed_value = db.query(func.sum(models.Claim.charge_amount)).filter(models.Claim.claim_status == "Appealed").scalar() or 0

    unworked = db.query(models.Claim).filter(
        or_(models.Claim.claim_status == "Created", models.Claim.claim_status == "Submitted", models.Claim.claim_status == "No Response")
    ).count()
    unworked_value = db.query(func.sum(models.Claim.charge_amount)).filter(
        or_(models.Claim.claim_status == "Created", models.Claim.claim_status == "Submitted", models.Claim.claim_status == "No Response")
    ).scalar() or 0

    tfl_risk = db.query(models.Claim).filter(models.Claim.aging_days > 120, models.Claim.denial_code == None).count()
    tfl_risk_value = db.query(func.sum(models.Claim.charge_amount)).filter(
        models.Claim.aging_days > 120, models.Claim.denial_code == None
    ).scalar() or 0

    high_value_at_risk = db.query(models.Claim).filter(
        models.Claim.charge_amount >= 10000, models.Claim.risk_score == "High"
    ).count()
    high_value_at_risk_val = db.query(func.sum(models.Claim.charge_amount)).filter(
        models.Claim.charge_amount >= 10000, models.Claim.risk_score == "High"
    ).scalar() or 0

    underpayment_val = db.query(
        func.sum(models.Claim.allowed_amount - models.Claim.paid_amount)
    ).filter(
        models.Claim.paid_amount != None,
        models.Claim.allowed_amount != None,
        models.Claim.paid_amount < models.Claim.allowed_amount
    ).scalar() or 0

    denial_value = db.query(func.sum(models.Claim.charge_amount)).filter(models.Claim.denial_code != None).scalar() or 0

    writeoff_value = db.query(func.sum(models.Claim.charge_amount)).filter(
        models.Claim.aging_days > 180, models.Claim.denial_code != None
    ).scalar() or 0

    denial_recovery = db.query(models.Claim).filter(
        models.Claim.claim_status.in_(["Appealed", "Resolved"]),
        models.Claim.denial_code != None
    ).count()
    denial_recovery_rate = round((denial_recovery / denied_claims * 100) if denied_claims else 0, 1)

    paid_claims = db.query(models.Claim).filter(models.Claim.claim_status == "Paid").count()
    resolved_claims = db.query(models.Claim).filter(models.Claim.claim_status == "Resolved").count()
    in_process = db.query(models.Claim).filter(models.Claim.claim_status == "In Process").count()

    gross_collection = round((float(total_paid) / float(total_ar) * 100) if total_ar else 0, 1)
    net_collection = round((float(total_paid) / float(total_allowed) * 100) if total_allowed else 0, 1)
    clean_claim_rate = round(((total_claims - denied_claims) / total_claims * 100) if total_claims else 0, 1)

    return {
        "revenue_health": {
            "total_ar": round(float(total_ar), 2),
            "total_paid": round(float(total_paid or 0), 2),
            "total_allowed": round(float(total_allowed or 0), 2),
            "gross_collection_rate": gross_collection,
            "net_collection_rate": net_collection,
            "revenue_leakage": round(float(total_ar) - float(total_paid or 0), 2),
            "expected_reimbursement": round(float(total_allowed or 0), 2),
            "denial_value": round(float(denial_value), 2),
            "writeoff_value": round(float(writeoff_value), 2),
        },
        "ar_health": {
            "ar_over_90_pct": round((ar_over_90 / total_claims * 100) if total_claims else 0, 1),
            "ar_over_90_count": ar_over_90,
            "ar_over_90_value": round(float(ar_over_90_value), 2),
            "high_balance_count": high_balance,
            "high_balance_value": round(float(high_balance_value), 2),
            "denied_ar_count": denied_claims,
            "denied_ar_value": round(float(denial_value), 2),
            "appealed_count": appealed,
            "appealed_value": round(float(appealed_value), 2),
        },
        "denial_intelligence": {
            "denial_rate": round((denied_claims / total_claims * 100) if total_claims else 0, 1),
            "denial_value": round(float(denial_value), 2),
            "denial_recovery_rate": denial_recovery_rate,
            "writeoff_due_to_denial": round(float(writeoff_value), 2),
            "denied_claims": denied_claims,
        },
        "risk_indicators": {
            "high_value_at_risk_count": high_value_at_risk,
            "high_value_at_risk_value": round(float(high_value_at_risk_val), 2),
            "tfl_risk_count": tfl_risk,
            "tfl_risk_value": round(float(tfl_risk_value), 2),
            "appeals_pending": appealed,
            "appeals_value": round(float(appealed_value), 2),
            "underpayment_value": round(float(underpayment_val), 2),
            "unworked_count": unworked,
            "unworked_value": round(float(unworked_value), 2),
        },
        "operational": {
            "total_claims": total_claims,
            "avg_aging_days": round(float(avg_aging), 1),
            "high_risk_count": high_risk,
            "clean_claim_rate": clean_claim_rate,
            "paid_claims": paid_claims,
            "resolved_claims": resolved_claims,
            "in_process": in_process,
            "ar_backlog": unworked,
            "denial_rate": round((denied_claims / total_claims * 100) if total_claims else 0, 1),
        },
    }

@router.get("/drilldown")
def get_drilldown(dimension: str = Query("payer"), db: Session = Depends(get_db)):
    if dimension == "payer":
        col = models.Claim.payer
    elif dimension == "specialty":
        col = models.Claim.specialty
    elif dimension == "facility":
        col = models.Claim.provider
    else:
        col = models.Claim.payer

    rows = db.query(
        col,
        func.count(models.Claim.id).label("total_claims"),
        func.sum(models.Claim.charge_amount).label("total_charged"),
        func.sum(models.Claim.paid_amount).label("total_paid"),
        func.sum(models.Claim.allowed_amount).label("total_allowed"),
        func.avg(models.Claim.aging_days).label("avg_aging"),
    ).group_by(col).order_by(func.sum(models.Claim.charge_amount).desc()).all()

    result = []
    for r in rows:
        denied = db.query(models.Claim).filter(col == r[0], models.Claim.denial_code != None).count()
        high_risk = db.query(models.Claim).filter(col == r[0], models.Claim.risk_score == "High").count()
        ar_over_90 = db.query(models.Claim).filter(col == r[0], models.Claim.aging_days > 90).count()

        result.append({
            "name": r[0],
            "total_claims": r.total_claims,
            "total_charged": round(float(r.total_charged or 0), 2),
            "total_paid": round(float(r.total_paid or 0), 2),
            "total_allowed": round(float(r.total_allowed or 0), 2),
            "avg_aging": round(float(r.avg_aging or 0), 1),
            "denied_claims": denied,
            "denial_rate": round((denied / r.total_claims * 100) if r.total_claims else 0, 1),
            "high_risk": high_risk,
            "ar_over_90": ar_over_90,
        })
    return result

@router.get("/payer-intelligence")
def get_payer_intelligence(db: Session = Depends(get_db)):
    rows = db.query(
        models.Claim.payer,
        func.count(models.Claim.id).label("total_claims"),
        func.sum(models.Claim.charge_amount).label("total_charged"),
        func.sum(models.Claim.paid_amount).label("total_paid"),
        func.sum(models.Claim.allowed_amount).label("total_allowed"),
        func.avg(models.Claim.aging_days).label("avg_days_to_pay"),
    ).group_by(models.Claim.payer).order_by(func.sum(models.Claim.charge_amount).desc()).all()

    result = []
    for r in rows:
        denied = db.query(models.Claim).filter(
            models.Claim.payer == r.payer, models.Claim.denial_code != None
        ).count()
        ar_over_60 = db.query(func.sum(models.Claim.charge_amount)).filter(
            models.Claim.payer == r.payer, models.Claim.aging_days > 60
        ).scalar() or 0
        underpaid = db.query(
            func.sum(models.Claim.allowed_amount - models.Claim.paid_amount)
        ).filter(
            models.Claim.payer == r.payer,
            models.Claim.paid_amount != None,
            models.Claim.allowed_amount != None,
            models.Claim.paid_amount < models.Claim.allowed_amount
        ).scalar() or 0
        escalations = db.query(models.Claim).filter(
            models.Claim.payer == r.payer,
            models.Claim.claim_status.in_(["Appealed", "Rejected"])
        ).count()

        result.append({
            "payer": r.payer,
            "total_claims": r.total_claims,
            "total_charged": round(float(r.total_charged or 0), 2),
            "total_paid": round(float(r.total_paid or 0), 2),
            "avg_days_to_pay": round(float(r.avg_days_to_pay or 0), 1),
            "denial_rate": round((denied / r.total_claims * 100) if r.total_claims else 0, 1),
            "underpayment_rate": round((float(underpaid) / float(r.total_charged or 1) * 100), 1),
            "ar_over_60": round(float(ar_over_60), 2),
            "escalations": escalations,
        })
    return result

@router.get("/risk-indicators")
def get_risk_indicators(db: Session = Depends(get_db)):
    high_value = db.query(models.Claim).filter(
        models.Claim.charge_amount >= 10000, models.Claim.risk_score == "High"
    ).all()

    tfl_risk = db.query(models.Claim).filter(
        models.Claim.aging_days > 120, models.Claim.denial_code == None
    ).all()

    appeals_risk = db.query(models.Claim).filter(
        models.Claim.claim_status == "Appealed"
    ).all()

    underpaid = db.query(models.Claim).filter(
        models.Claim.paid_amount != None,
        models.Claim.allowed_amount != None,
        models.Claim.paid_amount < models.Claim.allowed_amount
    ).all()

    unworked = db.query(models.Claim).filter(
        models.Claim.claim_status.in_(["Created", "Submitted", "No Response"])
    ).all()

    def claim_to_dict(c):
        return {
            "claim_id": c.claim_id, "patient_name": c.patient_name, "payer": c.payer,
            "charge_amount": c.charge_amount, "aging_days": c.aging_days,
            "denial_code": c.denial_code, "risk_score": c.risk_score,
            "specialty": c.specialty, "claim_status": c.claim_status,
        }

    return {
        "high_value_at_risk": [claim_to_dict(c) for c in high_value[:20]],
        "timely_filing_risk": [claim_to_dict(c) for c in tfl_risk[:20]],
        "appeals_deadline_risk": [claim_to_dict(c) for c in appeals_risk[:20]],
        "underpayment_claims": [claim_to_dict(c) for c in underpaid[:20]],
        "unworked_ar": [claim_to_dict(c) for c in unworked[:20]],
        "counts": {
            "high_value_at_risk": len(high_value),
            "timely_filing_risk": len(tfl_risk),
            "appeals_deadline_risk": len(appeals_risk),
            "underpayment": len(underpaid),
            "unworked": len(unworked),
        }
    }

@router.get("/aging-distribution")
def get_aging_distribution(db: Session = Depends(get_db)):
    buckets = [
        ("0-30 Days", 0, 30),
        ("31-60 Days", 31, 60),
        ("61-90 Days", 61, 90),
        ("91-120 Days", 91, 120),
        (">120 Days", 121, 99999),
    ]
    result = []
    for label, low, high in buckets:
        count = db.query(models.Claim).filter(
            models.Claim.aging_days >= low,
            models.Claim.aging_days <= high
        ).count()
        value = db.query(func.sum(models.Claim.charge_amount)).filter(
            models.Claim.aging_days >= low,
            models.Claim.aging_days <= high
        ).scalar() or 0
        result.append({"bucket": label, "count": count, "value": round(float(value), 2)})
    return result

@router.get("/denial-breakdown")
def get_denial_breakdown(db: Session = Depends(get_db)):
    rows = db.query(
        models.Claim.denial_code,
        models.Claim.denial_description,
        func.count(models.Claim.id).label("count"),
        func.sum(models.Claim.charge_amount).label("total_value")
    ).filter(models.Claim.denial_code != None).group_by(
        models.Claim.denial_code, models.Claim.denial_description
    ).order_by(func.count(models.Claim.id).desc()).all()

    return [
        {
            "denial_code": r.denial_code,
            "description": r.denial_description or "",
            "count": r.count,
            "total_value": round(float(r.total_value or 0), 2)
        }
        for r in rows
    ]

@router.get("/payer-performance")
def get_payer_performance(db: Session = Depends(get_db)):
    rows = db.query(
        models.Claim.payer,
        func.count(models.Claim.id).label("total_claims"),
        func.sum(models.Claim.charge_amount).label("total_charged"),
        func.sum(models.Claim.paid_amount).label("total_paid"),
    ).group_by(models.Claim.payer).order_by(func.sum(models.Claim.charge_amount).desc()).all()

    result = []
    for r in rows:
        denied = db.query(models.Claim).filter(
            models.Claim.payer == r.payer,
            models.Claim.denial_code != None
        ).count()
        denial_rate = round((denied / r.total_claims * 100) if r.total_claims else 0, 1)
        result.append({
            "payer": r.payer,
            "total_claims": r.total_claims,
            "total_charged": round(float(r.total_charged or 0), 2),
            "total_paid": round(float(r.total_paid or 0), 2),
            "denial_rate": denial_rate,
        })
    return result

@router.get("/risk-distribution")
def get_risk_distribution(db: Session = Depends(get_db)):
    result = []
    for risk in ["High", "Medium", "Low"]:
        count = db.query(models.Claim).filter(models.Claim.risk_score == risk).count()
        value = db.query(func.sum(models.Claim.charge_amount)).filter(
            models.Claim.risk_score == risk
        ).scalar() or 0
        result.append({"risk": risk, "count": count, "value": round(float(value), 2)})
    return result

@router.get("/specialty-breakdown")
def get_specialty_breakdown(db: Session = Depends(get_db)):
    rows = db.query(
        models.Claim.specialty,
        func.count(models.Claim.id).label("count"),
        func.sum(models.Claim.charge_amount).label("total_value")
    ).group_by(models.Claim.specialty).order_by(func.count(models.Claim.id).desc()).all()

    return [
        {"specialty": r.specialty, "count": r.count, "total_value": round(float(r.total_value or 0), 2)}
        for r in rows
    ]

@router.get("/insights")
def get_insights(db: Session = Depends(get_db)):
    total = db.query(models.Claim).count()

    auth_denials = db.query(models.Claim).filter(models.Claim.denial_code == "CO-197").count()
    timely_filing = db.query(models.Claim).filter(models.Claim.denial_code == "CO-29").count()
    aging_120 = db.query(models.Claim).filter(models.Claim.aging_days > 120).count()
    high_dollar = db.query(models.Claim).filter(models.Claim.charge_amount >= 5000).count()
    high_risk_count = db.query(models.Claim).filter(models.Claim.risk_score == "High").count()

    insights = []

    if total > 0:
        auth_pct = round(auth_denials / total * 100, 1)
        if auth_pct > 0:
            insights.append(f"Authorization denials (CO-197) represent {auth_pct}% of the total AR backlog.")

        tf_pct = round(timely_filing / total * 100, 1)
        if tf_pct > 0:
            insights.append(f"Timely filing denials account for {tf_pct}% of claims — review submission workflows.")

        aging_pct = round(aging_120 / total * 100, 1)
        if aging_pct > 0:
            insights.append(f"{aging_pct}% of claims are aged over 120 days and are at risk of write-off.")

        hd_pct = round(high_dollar / total * 100, 1)
        insights.append(f"High-dollar claims (>$5,000) represent {hd_pct}% of inventory by volume.")

        hr_pct = round(high_risk_count / total * 100, 1)
        insights.append(f"{hr_pct}% of claims are classified as High Risk — immediate action recommended.")

    ortho_auth = db.query(models.Claim).filter(
        models.Claim.specialty == "Orthopedic Surgery",
        models.Claim.denial_code == "CO-197"
    ).count()
    ortho_total = db.query(models.Claim).filter(models.Claim.specialty == "Orthopedic Surgery").count()
    if ortho_total > 0:
        ortho_pct = round(ortho_auth / ortho_total * 100, 1)
        insights.append(f"Authorization denials represent {ortho_pct}% of AR backlog for orthopedic claims.")

    return {"insights": insights}

@router.get("/team-dashboard")
def get_team_dashboard(db: Session = Depends(get_db)):
    total = db.query(models.Claim).count()
    assigned = db.query(models.Claim).filter(models.Claim.work_queue != None).count()
    unassigned = total - assigned
    denied_today = db.query(models.Claim).filter(models.Claim.denial_code != None).count()
    paid_today = db.query(models.Claim).filter(models.Claim.claim_status == "Paid").count()
    in_process = db.query(models.Claim).filter(models.Claim.claim_status == "In Process").count()
    pending = db.query(models.Claim).filter(
        models.Claim.claim_status.in_(["Created", "Submitted", "No Response"])
    ).count()

    queue_breakdown = db.query(
        models.Claim.work_queue,
        func.count(models.Claim.id).label("count"),
        func.sum(models.Claim.charge_amount).label("value")
    ).filter(models.Claim.work_queue != None).group_by(models.Claim.work_queue).all()

    return {
        "total_claims": total,
        "assigned_claims": assigned,
        "unassigned_claims": unassigned,
        "claims_worked": paid_today + in_process,
        "claims_pending": pending,
        "resolution_rate": round((paid_today / total * 100) if total else 0, 1),
        "queue_breakdown": [
            {"queue": r[0], "count": r.count, "value": round(float(r.value or 0), 2)}
            for r in queue_breakdown
        ],
    }
