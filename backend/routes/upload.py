from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import pandas as pd
import io
from services.risk_engine import calculate_risk_score, get_recommended_action, assign_work_queue

router = APIRouter(prefix="/api/upload", tags=["upload"])

COLUMN_MAP = {
    "claim_id": ["claim_id", "claim id", "claimid", "claim #", "claim number"],
    "patient_name": ["patient_name", "patient name", "patient", "member name"],
    "dos": ["dos", "date of service", "service date"],
    "payer": ["payer", "insurance", "payer name", "insurer"],
    "cpt": ["cpt", "cpt code", "procedure code", "service code"],
    "icd": ["icd", "icd code", "diagnosis code", "dx code"],
    "charge_amount": ["charge_amount", "charge", "billed amount", "total charge", "charges"],
    "allowed_amount": ["allowed_amount", "allowed", "allowed amount"],
    "aging_days": ["aging_days", "aging", "age", "days outstanding"],
    "denial_code": ["denial_code", "denial code", "denial", "adj code", "remark code"],
    "provider": ["provider", "rendering provider", "physician"],
    "specialty": ["specialty", "service specialty", "dept"],
}

def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [c.strip().lower() for c in df.columns]
    renamed = {}
    for target, aliases in COLUMN_MAP.items():
        for col in df.columns:
            if col in aliases and target not in renamed.values():
                renamed[col] = target
                break
    return df.rename(columns=renamed)

@router.post("/claims")
async def upload_claims(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    filename = file.filename.lower()

    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        elif filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    df = normalize_columns(df)

    required = ["claim_id", "patient_name", "dos", "payer"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing required columns: {missing}")

    added = 0
    skipped = 0
    errors = []

    for idx, row in df.iterrows():
        claim_id = str(row.get("claim_id", "")).strip()
        if not claim_id:
            skipped += 1
            continue

        existing = db.query(models.Claim).filter(models.Claim.claim_id == claim_id).first()
        if existing:
            skipped += 1
            continue

        try:
            charge = float(str(row.get("charge_amount", 0)).replace(",", "").replace("$", "") or 0)
            aging = int(float(str(row.get("aging_days", 0) or 0)))
            denial_code = str(row.get("denial_code", "") or "").strip() or None

            claim_data = {
                "claim_id": claim_id,
                "patient_name": str(row.get("patient_name", "Unknown")),
                "dos": str(row.get("dos", "")),
                "payer": str(row.get("payer", "Unknown")),
                "cpt": str(row.get("cpt", "") or ""),
                "icd": str(row.get("icd", "") or ""),
                "charge_amount": charge,
                "allowed_amount": float(str(row.get("allowed_amount", 0) or 0).replace(",", "").replace("$", "")) if row.get("allowed_amount") else None,
                "aging_days": aging,
                "denial_code": denial_code,
                "provider": str(row.get("provider", "") or ""),
                "specialty": str(row.get("specialty", "") or ""),
                "auth_required": denial_code in ["CO-197", "CO-109"],
            }

            risk_val, risk_cat = calculate_risk_score(claim_data)
            claim_data["risk_score_value"] = risk_val
            claim_data["risk_score"] = risk_cat
            claim_data["recommended_action"] = get_recommended_action(claim_data)
            claim_data["work_queue"] = assign_work_queue(claim_data)

            db.add(models.Claim(**claim_data))
            added += 1
        except Exception as e:
            errors.append(f"Row {idx}: {str(e)}")

    db.commit()

    return {
        "success": True,
        "added": added,
        "skipped": skipped,
        "errors": errors[:10],
        "message": f"Processed {added + skipped} rows. Added {added} new claims, skipped {skipped} duplicates."
    }
