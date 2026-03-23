def calculate_risk_score(claim) -> tuple[float, str]:
    score = 0.0

    if claim.get("aging_days", 0) > 120:
        score += 35
    elif claim.get("aging_days", 0) > 90:
        score += 25
    elif claim.get("aging_days", 0) > 60:
        score += 15
    elif claim.get("aging_days", 0) > 30:
        score += 8

    charge = claim.get("charge_amount", 0)
    if charge > 10000:
        score += 30
    elif charge > 5000:
        score += 20
    elif charge > 2000:
        score += 10
    elif charge > 1000:
        score += 5

    if claim.get("denial_code"):
        score += 25

    if claim.get("auth_required", False):
        score += 10

    payer = claim.get("payer", "").lower()
    if "medicaid" in payer:
        score += 5

    if score >= 60:
        return round(score, 1), "High"
    elif score >= 30:
        return round(score, 1), "Medium"
    else:
        return round(score, 1), "Low"


def get_recommended_action(claim) -> str:
    denial_code = claim.get("denial_code", "")
    aging = claim.get("aging_days", 0)

    if not denial_code:
        if aging > 120:
            return "Immediate Follow-Up - Aging Critical"
        elif aging > 90:
            return "Priority Follow-Up - Approaching Write-Off"
        elif aging > 60:
            return "Follow-Up Required"
        else:
            return "Monitor - Within Normal Aging"

    denial_map = {
        "CO-4": "Correct CPT Code and Resubmit",
        "CO-16": "Add Missing Information and Resubmit",
        "CO-22": "Coordinate Benefits - Secondary Insurance",
        "CO-29": "Appeal - Timely Filing - Provide Proof",
        "CO-45": "Accept Contractual Adjustment",
        "CO-96": "Appeal with Medical Records",
        "CO-97": "Appeal - Duplicate Claim Investigation",
        "CO-109": "Appeal with Authorization Documentation",
        "CO-119": "Review Patient Responsibility",
        "CO-167": "Appeal with Medical Necessity Documentation",
        "CO-197": "Request Retro Authorization Immediately",
        "PR-1": "Bill Patient - Primary Coverage Applied",
        "PR-2": "Verify Coinsurance and Bill Patient",
        "PR-3": "Verify Deductible Status and Bill Patient",
        "PR-96": "Resubmit with Additional Documentation",
        "OA-23": "Adjust Billing to Contracted Rate",
        "PI-97": "Verify Benefits and Resubmit",
    }

    return denial_map.get(denial_code, f"Review Denial {denial_code} and Appeal")


def assign_work_queue(claim) -> str:
    denial_code = claim.get("denial_code", "")
    aging = claim.get("aging_days", 0)
    charge = claim.get("charge_amount", 0)
    payer = claim.get("payer", "").lower()
    auth_required = claim.get("auth_required", False)

    if charge >= 5000:
        return "High Dollar AR"
    if denial_code in ["CO-197", "CO-109"] or auth_required:
        return "Authorization Denials"
    if denial_code in ["CO-22", "PR-1", "PR-2", "PR-3"]:
        return "Eligibility Issues"
    if aging > 120:
        return "Aging >120 Days"
    if "medicaid" in payer:
        return "Medicaid Claims"
    return "General AR"
