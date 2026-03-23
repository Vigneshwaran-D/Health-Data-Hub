import random
from datetime import datetime, timedelta

PAYER_EDI_CONFIGS = {
    "Aetna": {"payer_id": "60054", "endpoint": "edi.aetna.com:5500", "format": "ANSI X12"},
    "Blue Cross Blue Shield": {"payer_id": "BCBS0", "endpoint": "edi.bcbs.com:5500", "format": "ANSI X12"},
    "Cigna": {"payer_id": "62308", "endpoint": "edi.cigna.com:5500", "format": "ANSI X12"},
    "UnitedHealthcare": {"payer_id": "87726", "endpoint": "edi.uhc.com:5500", "format": "ANSI X12"},
    "Humana": {"payer_id": "61101", "endpoint": "edi.humana.com:5500", "format": "ANSI X12"},
    "Medicare": {"payer_id": "00882", "endpoint": "edi.cms.gov:5500", "format": "ANSI X12"},
    "Medicaid - State": {"payer_id": "77027", "endpoint": "edi.medicaid.gov:5500", "format": "ANSI X12"},
    "Molina Healthcare": {"payer_id": "20554", "endpoint": "edi.molinahealthcare.com:5500", "format": "ANSI X12"},
    "Anthem": {"payer_id": "47198", "endpoint": "edi.anthem.com:5500", "format": "ANSI X12"},
    "Centene": {"payer_id": "68069", "endpoint": "edi.centene.com:5500", "format": "ANSI X12"},
    "Optum": {"payer_id": "41211", "endpoint": "edi.optum.com:5500", "format": "ANSI X12"},
    "WellCare": {"payer_id": "34192", "endpoint": "edi.wellcare.com:5500", "format": "ANSI X12"},
}

TRANSACTION_TYPES = {
    "837P": {"name": "Professional Claim Submission", "direction": "Outbound"},
    "837I": {"name": "Institutional Claim Submission", "direction": "Outbound"},
    "835": {"name": "Payment/Remittance Advice", "direction": "Inbound"},
    "276": {"name": "Claim Status Inquiry", "direction": "Outbound"},
    "277": {"name": "Claim Status Response", "direction": "Inbound"},
    "270": {"name": "Eligibility Inquiry", "direction": "Outbound"},
    "271": {"name": "Eligibility Response", "direction": "Inbound"},
    "278": {"name": "Prior Authorization Request", "direction": "Outbound"},
    "999": {"name": "Acknowledgment", "direction": "Inbound"},
}


def generate_edi_837_segment(claim: dict) -> str:
    now = datetime.now()
    isa_date = now.strftime("%y%m%d")
    isa_time = now.strftime("%H%M")
    control_num = f"{random.randint(100000000, 999999999)}"

    segment = f"""ISA*00*          *00*          *ZZ*SUBMITTER_ID   *ZZ*{claim.get('payer_id', 'PAYERID')}       *{isa_date}*{isa_time}*^*00501*{control_num}*0*P*:~
GS*HC*SUBMITTER_ID*{claim.get('payer_id', 'PAYERID')}*{now.strftime('%Y%m%d')}*{isa_time}*1*X*005010X222A1~
ST*837*0001*005010X222A1~
BHT*0019*00*{claim.get('claim_id', 'CLM001')}*{now.strftime('%Y%m%d')}*{isa_time}*CH~
NM1*41*1*{claim.get('provider', 'PROVIDER')}****46*{random.randint(1000000000, 9999999999)}~
NM1*40*2*{claim.get('payer', 'PAYER')}****46*{claim.get('payer_id', 'PAYERID')}~
NM1*IL*1*{claim.get('patient_name', 'PATIENT').split()[-1]}*{claim.get('patient_name', 'PATIENT').split()[0]}****MI*{claim.get('insurance_id', 'INS123456789')}~
CLM*{claim.get('claim_id', 'CLM001')}*{claim.get('charge_amount', 0):.2f}***11:B:1*Y*A*Y*I~
DTP*472*D8*{claim.get('dos', '20250101').replace('-', '')}~
SV1*HC:{claim.get('cpt', '99213')}*{claim.get('charge_amount', 0):.2f}*UN*1***1~
SE*12*0001~
GE*1*1~
IEA*1*{control_num}~"""
    return segment


def generate_edi_276_segment(claim: dict) -> str:
    now = datetime.now()
    control_num = f"{random.randint(100000000, 999999999)}"

    segment = f"""ISA*00*          *00*          *ZZ*SUBMITTER_ID   *ZZ*{claim.get('payer_id', 'PAYERID')}       *{now.strftime('%y%m%d')}*{now.strftime('%H%M')}*^*00501*{control_num}*0*P*:~
GS*HR*SUBMITTER_ID*{claim.get('payer_id', 'PAYERID')}*{now.strftime('%Y%m%d')}*{now.strftime('%H%M')}*1*X*005010X212~
ST*276*0001*005010X212~
BHT*0010*13*{claim.get('claim_id', 'CLM001')}*{now.strftime('%Y%m%d')}*{now.strftime('%H%M')}~
NM1*41*1*{claim.get('provider', 'PROVIDER')}****46*{random.randint(1000000000, 9999999999)}~
NM1*PR*2*{claim.get('payer', 'PAYER')}****PI*{claim.get('payer_id', 'PAYERID')}~
NM1*IL*1*{claim.get('patient_name', 'PATIENT').split()[-1]}*{claim.get('patient_name', 'PATIENT').split()[0]}****MI*{claim.get('insurance_id', 'INS123456789')}~
TRN*1*{claim.get('claim_id', 'CLM001')}*SUBMITTER_ID~
DTP*472*D8*{claim.get('dos', '20250101').replace('-', '')}~
SE*9*0001~
GE*1*1~
IEA*1*{control_num}~"""
    return segment


def simulate_edi_277_response(claim: dict) -> dict:
    status_options = [
        {"code": "A1", "description": "Claim Acknowledged/Forwarded", "category": "Acknowledged"},
        {"code": "A2", "description": "Claim Accepted", "category": "Accepted"},
        {"code": "A3", "description": "Claim Rejected - Missing/Invalid Information", "category": "Rejected"},
        {"code": "A4", "description": "Claim Pending - Additional Information Needed", "category": "Pending"},
        {"code": "F1", "description": "Finalized - Paid", "category": "Finalized"},
        {"code": "F2", "description": "Finalized - Denied", "category": "Finalized"},
    ]

    if claim.get("denial_code"):
        status = random.choice([s for s in status_options if s["code"] in ["A3", "F2", "A4"]])
    elif claim.get("paid_amount") and claim["paid_amount"] > 0:
        status = {"code": "F1", "description": "Finalized - Paid", "category": "Finalized"}
    else:
        status = random.choice(status_options)

    return {
        "claim_id": claim.get("claim_id"),
        "payer_claim_ref": f"PCN-{random.randint(100000, 999999)}",
        "status_code": status["code"],
        "status_description": status["description"],
        "category": status["category"],
        "effective_date": datetime.now().strftime("%Y-%m-%d"),
        "total_charged": claim.get("charge_amount", 0),
        "total_paid": claim.get("paid_amount") or 0,
    }


def simulate_edi_835_response(claims: list) -> dict:
    total_paid = 0
    total_charged = 0
    payment_details = []

    for claim in claims:
        charged = claim.get("charge_amount", 0)
        total_charged += charged

        if claim.get("denial_code"):
            paid = 0
            adj_reason = claim.get("denial_code", "CO-16")
        else:
            paid = round(charged * random.uniform(0.65, 0.95), 2)
            adj_reason = "CO-45"

        total_paid += paid
        payment_details.append({
            "claim_id": claim.get("claim_id"),
            "charged": charged,
            "paid": paid,
            "adjustment_code": adj_reason,
            "patient_responsibility": round(charged - paid, 2) if paid > 0 else 0,
        })

    return {
        "check_number": f"EFT-{random.randint(1000000, 9999999)}",
        "payment_date": datetime.now().strftime("%Y-%m-%d"),
        "payer_name": claims[0].get("payer", "Unknown") if claims else "Unknown",
        "total_charged": round(total_charged, 2),
        "total_paid": round(total_paid, 2),
        "total_claims": len(claims),
        "payment_details": payment_details,
    }
