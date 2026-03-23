import random
from datetime import datetime

DENIAL_KNOWLEDGE_BASE = {
    "CO-4": {
        "root_cause": "Procedure code inconsistent with modifier or place of service",
        "action": "Review CPT/modifier combination and resubmit",
        "confidence": 0.92
    },
    "CO-16": {
        "root_cause": "Claim/service lacks information or has submission/billing error",
        "action": "Identify missing fields and resubmit with complete information",
        "confidence": 0.88
    },
    "CO-22": {
        "root_cause": "Coordination of Benefits - Another payer may be primary",
        "action": "Verify primary insurance, submit to correct payer first",
        "confidence": 0.85
    },
    "CO-29": {
        "root_cause": "Timely filing limit exceeded based on payer contract",
        "action": "Gather proof of timely filing (EDI confirmation, postmark) and appeal",
        "confidence": 0.79
    },
    "CO-45": {
        "root_cause": "Charge exceeds fee schedule or contracted rate",
        "action": "Accept contractual adjustment - no further action required",
        "confidence": 0.97
    },
    "CO-96": {
        "root_cause": "Non-covered charge - not medically necessary per payer policy",
        "action": "Submit appeal with medical necessity documentation and clinical notes",
        "confidence": 0.81
    },
    "CO-97": {
        "root_cause": "Payment included in allowance for another service",
        "action": "Review bundling rules - appeal if services are separately billable",
        "confidence": 0.83
    },
    "CO-109": {
        "root_cause": "Claim not covered by this payer - may be covered by another",
        "action": "Verify correct payer and resubmit or bill secondary",
        "confidence": 0.86
    },
    "CO-167": {
        "root_cause": "Diagnosis is not covered based on payer LCD/NCD policy",
        "action": "Review diagnosis codes and submit appeal with clinical justification",
        "confidence": 0.80
    },
    "CO-197": {
        "root_cause": "Precertification or authorization absent or exceeded",
        "action": "Request retroactive authorization immediately; escalate if urgent",
        "confidence": 0.94
    },
    "PR-1": {
        "root_cause": "Deductible amount applied to patient responsibility",
        "action": "Bill patient for deductible amount per EOB",
        "confidence": 0.96
    },
    "PR-2": {
        "root_cause": "Coinsurance amount applied to patient responsibility",
        "action": "Bill patient for coinsurance per EOB",
        "confidence": 0.96
    },
    "PR-3": {
        "root_cause": "Co-payment amount due from patient",
        "action": "Collect copay from patient",
        "confidence": 0.96
    },
    "OA-23": {
        "root_cause": "Payment adjusted to contracted fee schedule amount",
        "action": "Accept payment - contractual adjustment only",
        "confidence": 0.95
    },
}

def run_claim_status_agent(claim: dict) -> dict:
    status_options = ["Received", "In Process", "Paid", "Denied", "Pending Review"]
    weights = [0.15, 0.25, 0.30, 0.20, 0.10]

    if claim.get("denial_code"):
        status = "Denied"
    elif (claim.get("paid_amount") or 0) > 0:
        status = "Paid"
    else:
        status = random.choices(status_options, weights=weights)[0]

    return {
        "agent": "Claim Status Agent",
        "status": "completed",
        "result": {
            "claim_status": status,
            "payer_reference": f"REF-{random.randint(100000, 999999)}",
            "last_checked": datetime.now().isoformat(),
            "estimated_payment_date": "N/A" if status in ["Denied", "Pending Review"] else "7-14 business days"
        },
        "confidence": round(random.uniform(0.82, 0.98), 2)
    }

def run_eligibility_agent(claim: dict) -> dict:
    payer = claim.get("payer", "")
    denial_code = claim.get("denial_code", "")

    if denial_code in ["CO-22", "PR-1", "PR-2", "PR-3"]:
        coverage_status = "Coverage Issue Detected"
        patient_responsibility = round(random.uniform(50, 500), 2)
    else:
        coverage_status = "Coverage Active"
        patient_responsibility = round(random.uniform(0, 150), 2)

    return {
        "agent": "Eligibility Agent",
        "status": "completed",
        "result": {
            "coverage_status": coverage_status,
            "payer": payer,
            "plan_type": random.choice(["PPO", "HMO", "EPO", "POS", "HDHP"]),
            "patient_responsibility": f"${patient_responsibility:.2f}",
            "in_network": random.choice([True, True, True, False]),
            "effective_date": "01/01/2025",
            "termination_date": "12/31/2025",
            "deductible_met": random.choice([True, False]),
            "out_of_pocket_remaining": f"${round(random.uniform(0, 3000), 2):.2f}"
        },
        "confidence": round(random.uniform(0.85, 0.97), 2)
    }

def run_authorization_agent(claim: dict) -> dict:
    auth_required = claim.get("auth_required", False)
    denial_code = claim.get("denial_code", "")

    if denial_code == "CO-197":
        auth_status = "Authorization Missing"
        action = "Request Retro Authorization Immediately"
    elif auth_required:
        auth_status = random.choice(["Authorization Present", "Authorization Present", "Authorization Missing"])
        action = "Retro Auth Required" if auth_status == "Authorization Missing" else "Authorization Verified"
    else:
        auth_status = "Authorization Not Required"
        action = "Proceed with claim processing"

    return {
        "agent": "Authorization Agent",
        "status": "completed",
        "result": {
            "auth_status": auth_status,
            "auth_number": f"AUTH-{random.randint(10000, 99999)}" if "Present" in auth_status else None,
            "recommended_action": action,
            "urgency": "High" if denial_code == "CO-197" else "Normal"
        },
        "confidence": round(random.uniform(0.88, 0.99), 2)
    }

def run_denial_analysis_agent(claim: dict) -> dict:
    denial_code = claim.get("denial_code", "")

    if not denial_code:
        return {
            "agent": "Denial Analysis Agent",
            "status": "completed",
            "result": {
                "denial_found": False,
                "message": "No denial code present on this claim"
            },
            "confidence": 0.99
        }

    kb_entry = DENIAL_KNOWLEDGE_BASE.get(denial_code, {
        "root_cause": f"Unknown denial reason for code {denial_code}",
        "action": "Manual review required",
        "confidence": 0.60
    })

    return {
        "agent": "Denial Analysis Agent",
        "status": "completed",
        "result": {
            "denial_found": True,
            "denial_code": denial_code,
            "denial_description": claim.get("denial_description", ""),
            "root_cause": kb_entry["root_cause"],
            "recommended_action": kb_entry["action"],
            "appeal_window": f"{random.choice([30, 60, 90, 180])} days",
            "recovery_probability": f"{random.randint(45, 92)}%"
        },
        "confidence": kb_entry["confidence"]
    }

def run_all_agents(claim: dict) -> list:
    return [
        run_claim_status_agent(claim),
        run_eligibility_agent(claim),
        run_authorization_agent(claim),
        run_denial_analysis_agent(claim)
    ]
