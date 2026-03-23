import random
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
import models
from models import Base
from services.risk_engine import calculate_risk_score, get_recommended_action, assign_work_queue

Base.metadata.create_all(bind=engine)

PAYERS = [
    "Aetna", "Blue Cross Blue Shield", "Cigna", "UnitedHealthcare",
    "Humana", "Medicare", "Medicaid - State", "Molina Healthcare",
    "Anthem", "Centene", "Optum", "WellCare"
]
SPECIALTIES = [
    "Orthopedic Surgery", "Cardiology", "Primary Care", "Radiology",
    "Oncology", "Emergency Medicine", "Neurology", "Internal Medicine",
    "Pediatrics", "Obstetrics/Gynecology"
]
PROVIDERS = [
    "Dr. James Mitchell", "Dr. Sarah Chen", "Dr. Robert Williams",
    "Dr. Maria Garcia", "Dr. David Johnson", "Dr. Lisa Thompson",
    "Dr. Michael Brown", "Dr. Jennifer Davis", "Dr. Carlos Rodriguez",
    "Dr. Amanda Wilson"
]
CPT_CODES = ["99213", "99214", "99215", "27447", "27130", "93000", "71046",
             "70553", "99285", "27486", "93306", "45378", "66984", "29827"]
ICD_CODES = ["M17.11", "I10", "Z00.00", "J18.9", "E11.9", "M54.5",
             "K21.0", "F32.9", "J06.9", "N39.0", "R07.9", "Z79.4"]
DENIAL_CODES = [
    ("CO-197", "Precertification/Authorization Absent"),
    ("CO-29", "Timely Filing Limit Exceeded"),
    ("CO-22", "Coordination of Benefits"),
    ("CO-96", "Non-covered charge - Not medically necessary"),
    ("CO-16", "Claim lacks information or has billing error"),
    ("CO-45", "Charge exceeds contracted fee schedule"),
    ("CO-4", "Procedure code inconsistent with modifier"),
    ("CO-167", "Diagnosis not covered per payer policy"),
    ("PR-1", "Deductible - Patient Responsibility"),
    ("PR-2", "Coinsurance - Patient Responsibility"),
    ("OA-23", "Payment adjusted to contracted amount"),
]

FIRST_NAMES = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer",
               "Michael", "Linda", "William", "Barbara", "David", "Elizabeth",
               "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah",
               "Charles", "Karen", "Christopher", "Lisa", "Daniel", "Nancy",
               "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra"]
LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia",
              "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez",
              "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore",
              "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris"]

def seed_users(db):
    users = [
        {"username": "clientlead", "password": "nova123", "role": "Client Leadership", "full_name": "Client Leadership"},
        {"username": "opslead", "password": "nova123", "role": "Operations Leadership", "full_name": "Operations Leadership"},
        {"username": "opsmgr", "password": "nova123", "role": "Operations Manager", "full_name": "Operations Manager"},
        {"username": "teamlead", "password": "nova123", "role": "Team Lead", "full_name": "Team Lead"},
        {"username": "arexec", "password": "nova123", "role": "AR Executive", "full_name": "AR Executive"},
        {"username": "qaauditor", "password": "nova123", "role": "QA Auditor", "full_name": "QA Auditor"},
    ]
    for u in users:
        existing = db.query(models.User).filter(models.User.username == u["username"]).first()
        if not existing:
            db.add(models.User(**u))
        elif existing.full_name != u["full_name"]:
            existing.full_name = u["full_name"]
    db.commit()
    print("Users seeded.")

def seed_work_queues(db):
    queues = [
        {"name": "High Dollar AR", "description": "Claims with charges over $5,000", "priority": "Critical"},
        {"name": "Authorization Denials", "description": "CO-197 and auth-related denials", "priority": "High"},
        {"name": "Eligibility Issues", "description": "Coordination of benefits and eligibility", "priority": "High"},
        {"name": "Aging >120 Days", "description": "Claims aged over 120 days", "priority": "Critical"},
        {"name": "Medicaid Claims", "description": "All Medicaid payer claims", "priority": "Medium"},
        {"name": "General AR", "description": "Standard AR follow-up queue", "priority": "Normal"},
    ]
    for q in queues:
        existing = db.query(models.WorkQueue).filter(models.WorkQueue.name == q["name"]).first()
        if not existing:
            db.add(models.WorkQueue(**q))
    db.commit()
    print("Work queues seeded.")

def seed_claims(db, count=300):
    existing = db.query(models.Claim).count()
    if existing >= count:
        print(f"Claims already seeded ({existing} records).")
        return

    from datetime import date, timedelta
    base_date = date(2025, 1, 1)
    records = []

    for i in range(1, count + 1):
        patient_name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        dos_offset = random.randint(10, 350)
        dos = base_date + timedelta(days=dos_offset)
        aging = (date(2026, 3, 6) - dos).days

        payer = random.choice(PAYERS)
        specialty = random.choice(SPECIALTIES)
        provider = random.choice(PROVIDERS)
        cpt = random.choice(CPT_CODES)
        icd = random.choice(ICD_CODES)

        charge = round(random.choice([
            random.uniform(150, 500),
            random.uniform(500, 2000),
            random.uniform(2000, 6000),
            random.uniform(6000, 25000),
        ]), 2)

        scenario_roll = random.random()
        if scenario_roll < 0.22:
            denial_code, denial_desc = "CO-197", "Precertification/Authorization Absent"
            auth_required = True
            auth_status = "Missing"
        elif scenario_roll < 0.35:
            denial_code, denial_desc = "CO-29", "Timely Filing Limit Exceeded"
            auth_required = False
            auth_status = None
        elif scenario_roll < 0.46:
            denial_code, denial_desc = "CO-22", "Coordination of Benefits"
            auth_required = False
            auth_status = None
        elif scenario_roll < 0.55:
            denial_code, denial_desc = "CO-96", "Non-covered Charge"
            auth_required = False
            auth_status = None
        elif scenario_roll < 0.62:
            code_pair = random.choice(DENIAL_CODES)
            denial_code, denial_desc = code_pair
            auth_required = random.choice([True, False])
            auth_status = "Present" if auth_required else None
        else:
            denial_code = None
            denial_desc = None
            auth_required = random.choice([False, False, False, True])
            auth_status = "Present" if auth_required else None

        if "Medicaid" in payer:
            charge = round(charge * 0.6, 2)

        allowed = round(charge * random.uniform(0.65, 0.95), 2) if not denial_code else None
        paid = round(allowed * random.uniform(0.8, 1.0), 2) if allowed and random.random() > 0.4 else None

        claim_data = {
            "claim_id": f"CLM-{2025000 + i}",
            "patient_name": patient_name,
            "patient_dob": f"{random.randint(1940,2005)}-{random.randint(1,12):02d}-{random.randint(1,28):02d}",
            "dos": dos.isoformat(),
            "payer": payer,
            "payer_id": f"PAY-{random.randint(1000,9999)}",
            "cpt": cpt,
            "icd": icd,
            "charge_amount": charge,
            "allowed_amount": allowed,
            "paid_amount": paid,
            "aging_days": aging,
            "denial_code": denial_code,
            "denial_description": denial_desc,
            "provider": provider,
            "specialty": specialty,
            "auth_required": auth_required,
            "auth_status": auth_status,
            "eligibility_status": random.choice(["Verified", "Verified", "Pending", "Not Verified"]),
            "insurance_id": f"INS{random.randint(100000000, 999999999)}",
            "group_number": f"GRP{random.randint(10000, 99999)}",
            "claim_status": "Denied" if denial_code else random.choice([
                "Created", "Submitted", "Submitted", "Rejected",
                "Received", "Received", "No Response",
                "In Process", "In Process",
                "Paid", "Paid", "Paid",
                "Appealed", "Resolved",
            ]),
        }

        risk_val, risk_cat = calculate_risk_score(claim_data)
        claim_data["risk_score_value"] = risk_val
        claim_data["risk_score"] = risk_cat
        claim_data["recommended_action"] = get_recommended_action(claim_data)
        claim_data["work_queue"] = assign_work_queue(claim_data)

        records.append(models.Claim(**claim_data))

    db.bulk_save_objects(records)
    db.commit()
    print(f"Seeded {count} claims.")

def seed_edi_connections(db):
    from services.edi_engine import PAYER_EDI_CONFIGS
    existing = db.query(models.EDIConnection).count()
    if existing > 0:
        print(f"EDI connections already seeded ({existing}).")
        return

    from datetime import datetime, timedelta

    for payer_name, config in PAYER_EDI_CONFIGS.items():
        conn = models.EDIConnection(
            payer_name=payer_name,
            payer_id=config["payer_id"],
            connection_type="SFTP/AS2",
            edi_format=config["format"],
            endpoint_url=config["endpoint"],
            status=random.choice(["Active", "Active", "Active", "Maintenance"]),
            last_transmission=(datetime.now() - timedelta(hours=random.randint(1, 72))).isoformat(),
            success_rate=round(random.uniform(92.0, 99.9), 1),
            total_transactions=random.randint(50, 500),
        )
        db.add(conn)
    db.commit()
    print("EDI connections seeded.")

def seed_edi_transactions(db):
    existing = db.query(models.EDITransaction).count()
    if existing > 0:
        print(f"EDI transactions already seeded ({existing}).")
        return

    from datetime import datetime, timedelta
    tx_types = ["837P", "835", "276/277", "270/271", "999"]
    directions = {"837P": "Outbound", "835": "Inbound", "276/277": "Outbound/Inbound", "270/271": "Outbound/Inbound", "999": "Inbound"}
    statuses = ["Accepted", "Accepted", "Accepted", "Completed", "Rejected", "Pending"]
    payers = list(PAYERS)

    for i in range(40):
        tx_type = random.choice(tx_types)
        payer = random.choice(payers)
        claim_count = random.randint(1, 50)
        total_amt = round(random.uniform(500, 50000), 2)
        status = random.choice(statuses)
        submitted = datetime.now() - timedelta(days=random.randint(0, 30), hours=random.randint(0, 23))

        t = models.EDITransaction(
            transaction_id=f"TX-{tx_type.replace('/', '')}-{random.randint(100000, 999999)}",
            connection_id=random.randint(1, len(payers)),
            payer_name=payer,
            transaction_type=tx_type,
            direction=directions.get(tx_type, "Outbound"),
            status=status,
            claim_count=claim_count,
            total_amount=total_amt,
            file_name=f"{tx_type}_{payer.replace(' ', '_')}_{submitted.strftime('%Y%m%d')}.edi",
            response_code="TA1" if status == "Accepted" else ("999" if status == "Rejected" else "277"),
            response_message="Batch accepted" if status == "Accepted" else ("Validation error" if status == "Rejected" else "Processing"),
            completed_at=submitted.isoformat() if status != "Pending" else None,
        )
        db.add(t)
    db.commit()
    print("EDI transactions seeded.")

def seed_rpa_bots(db):
    existing = db.query(models.RPABot).count()
    if existing > 0:
        print(f"RPA bots already seeded ({existing}).")
        return

    from datetime import datetime, timedelta

    bot_types = [
        ("claim_status_checker", "Claim Status Checker"),
        ("eligibility_verifier", "Eligibility Verifier"),
        ("denial_retriever", "Denial/EOB Retriever"),
        ("prior_auth_submitter", "Prior Auth Submitter"),
        ("payment_poster", "Payment Poster"),
    ]

    top_payers = ["Aetna", "Blue Cross Blue Shield", "Cigna", "UnitedHealthcare",
                  "Humana", "Medicare", "Medicaid - State", "Anthem"]

    bot_num = 0
    for payer in top_payers:
        assigned_types = random.sample(bot_types, k=random.randint(2, 4))
        for bot_type, bot_name in assigned_types:
            bot_num += 1
            total_runs = random.randint(10, 200)
            claims_processed = total_runs * random.randint(15, 50)

            bot = models.RPABot(
                bot_id=f"BOT-{bot_num:03d}",
                bot_name=f"{payer} - {bot_name}",
                payer_name=payer,
                bot_type=bot_type,
                status=random.choice(["Idle", "Idle", "Idle", "Scheduled", "Error"]),
                last_run=(datetime.now() - timedelta(hours=random.randint(1, 48))).isoformat(),
                next_scheduled=(datetime.now() + timedelta(hours=random.randint(1, 12))).isoformat(),
                total_runs=total_runs,
                success_rate=round(random.uniform(88.0, 99.5), 1),
                claims_processed=claims_processed,
                avg_run_time=f"{random.randint(3, 15)}m {random.randint(0, 59)}s",
                credentials_status=random.choice(["Valid", "Valid", "Valid", "Valid", "Expiring Soon"]),
            )
            db.add(bot)
    db.commit()
    print(f"RPA bots seeded ({bot_num} bots).")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_users(db)
        seed_work_queues(db)
        seed_claims(db)
        seed_edi_connections(db)
        seed_edi_transactions(db)
        seed_rpa_bots(db)
        print("Database seeding complete.")
    finally:
        db.close()
