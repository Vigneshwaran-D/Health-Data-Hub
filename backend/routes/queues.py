from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas

router = APIRouter(prefix="/api/queues", tags=["queues"])

@router.get("/")
def get_queues(db: Session = Depends(get_db)):
    queues = db.query(models.WorkQueue).all()
    result = []
    for q in queues:
        count = db.query(models.Claim).filter(models.Claim.work_queue == q.name).count()
        total_value = db.query(models.Claim).filter(models.Claim.work_queue == q.name).with_entities(
            models.Claim.charge_amount
        ).all()
        total_ar = sum(r[0] for r in total_value if r[0])
        high_risk = db.query(models.Claim).filter(
            models.Claim.work_queue == q.name,
            models.Claim.risk_score == "High"
        ).count()
        result.append({
            "id": q.id,
            "name": q.name,
            "description": q.description,
            "priority": q.priority,
            "claim_count": count,
            "total_ar_value": round(total_ar, 2),
            "high_risk_count": high_risk
        })
    return result

@router.get("/{queue_name}/claims")
def get_queue_claims(queue_name: str, db: Session = Depends(get_db), page: int = 1, per_page: int = 50):
    q = db.query(models.Claim).filter(models.Claim.work_queue == queue_name)
    total = q.count()
    claims = q.order_by(models.Claim.risk_score_value.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return {
        "queue_name": queue_name,
        "total": total,
        "claims": [schemas.ClaimOut.from_orm(c) for c in claims]
    }
