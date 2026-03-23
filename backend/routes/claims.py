from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import Optional, List
from database import get_db
import models
import schemas
from services.ai_agents import run_all_agents
from services.appeal_generator import generate_appeal_letter

router = APIRouter(prefix="/api/claims", tags=["claims"])

@router.get("/")
def get_claims(
    db: Session = Depends(get_db),
    payer: Optional[str] = None,
    specialty: Optional[str] = None,
    denial_type: Optional[str] = None,
    aging_bucket: Optional[str] = None,
    risk_score: Optional[str] = None,
    work_queue: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    per_page: int = 50,
):
    q = db.query(models.Claim)

    if payer:
        q = q.filter(models.Claim.payer == payer)
    if specialty:
        q = q.filter(models.Claim.specialty == specialty)
    if denial_type:
        if denial_type == "No Denial":
            q = q.filter(models.Claim.denial_code == None)
        else:
            q = q.filter(models.Claim.denial_code == denial_type)
    if aging_bucket:
        if aging_bucket == "0-30":
            q = q.filter(models.Claim.aging_days <= 30)
        elif aging_bucket == "31-60":
            q = q.filter(models.Claim.aging_days.between(31, 60))
        elif aging_bucket == "61-90":
            q = q.filter(models.Claim.aging_days.between(61, 90))
        elif aging_bucket == "91-120":
            q = q.filter(models.Claim.aging_days.between(91, 120))
        elif aging_bucket == ">120":
            q = q.filter(models.Claim.aging_days > 120)
    if risk_score:
        q = q.filter(models.Claim.risk_score == risk_score)
    if work_queue:
        q = q.filter(models.Claim.work_queue == work_queue)
    if search:
        q = q.filter(or_(
            models.Claim.claim_id.ilike(f"%{search}%"),
            models.Claim.patient_name.ilike(f"%{search}%"),
            models.Claim.payer.ilike(f"%{search}%"),
        ))

    total = q.count()
    claims = q.offset((page - 1) * per_page).limit(per_page).all()

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "claims": [schemas.ClaimOut.from_orm(c) for c in claims]
    }

@router.get("/filters")
def get_filter_options(db: Session = Depends(get_db)):
    payers = [r[0] for r in db.query(models.Claim.payer).distinct().order_by(models.Claim.payer).all()]
    specialties = [r[0] for r in db.query(models.Claim.specialty).distinct().order_by(models.Claim.specialty).all()]
    denial_codes = [r[0] for r in db.query(models.Claim.denial_code).distinct().filter(models.Claim.denial_code != None).order_by(models.Claim.denial_code).all()]
    return {"payers": payers, "specialties": specialties, "denial_codes": denial_codes}

@router.get("/{claim_id}")
def get_claim(claim_id: str, db: Session = Depends(get_db)):
    claim = db.query(models.Claim).filter(models.Claim.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return schemas.ClaimOut.from_orm(claim)

@router.post("/{claim_id}/investigate")
def investigate_claim(claim_id: str, db: Session = Depends(get_db)):
    claim = db.query(models.Claim).filter(models.Claim.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    claim_dict = {
        "claim_id": claim.claim_id,
        "patient_name": claim.patient_name,
        "dos": claim.dos,
        "payer": claim.payer,
        "charge_amount": claim.charge_amount,
        "paid_amount": claim.paid_amount,
        "denial_code": claim.denial_code,
        "denial_description": claim.denial_description,
        "auth_required": claim.auth_required,
        "aging_days": claim.aging_days,
    }
    results = run_all_agents(claim_dict)
    return {"claim_id": claim_id, "agents": results}

@router.post("/{claim_id}/appeal")
def generate_appeal(claim_id: str, db: Session = Depends(get_db)):
    claim = db.query(models.Claim).filter(models.Claim.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    if not claim.denial_code:
        raise HTTPException(status_code=400, detail="Claim has no denial code - appeal not required")
    claim_dict = {
        "claim_id": claim.claim_id,
        "patient_name": claim.patient_name,
        "dos": claim.dos,
        "payer": claim.payer,
        "provider": claim.provider,
        "specialty": claim.specialty,
        "cpt": claim.cpt,
        "icd": claim.icd,
        "charge_amount": claim.charge_amount,
        "denial_code": claim.denial_code,
        "denial_description": claim.denial_description,
    }
    letter = generate_appeal_letter(claim_dict)
    return {"claim_id": claim_id, "letter": letter}

@router.put("/{claim_id}/notes")
def update_notes(claim_id: str, data: dict, db: Session = Depends(get_db)):
    claim = db.query(models.Claim).filter(models.Claim.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    claim.notes = data.get("notes", claim.notes)
    db.commit()
    return {"success": True}
