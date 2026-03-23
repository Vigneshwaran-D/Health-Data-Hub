from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from database import get_db
import models
import random
from datetime import datetime, timedelta
from services.edi_engine import (
    PAYER_EDI_CONFIGS, TRANSACTION_TYPES,
    generate_edi_837_segment, generate_edi_276_segment,
    simulate_edi_277_response, simulate_edi_835_response
)

router = APIRouter(prefix="/api/edi", tags=["edi"])

@router.get("/connections")
def get_connections(db: Session = Depends(get_db)):
    connections = db.query(models.EDIConnection).order_by(models.EDIConnection.payer_name).all()
    return [{
        "id": c.id,
        "payer_name": c.payer_name,
        "payer_id": c.payer_id,
        "connection_type": c.connection_type,
        "edi_format": c.edi_format,
        "endpoint_url": c.endpoint_url,
        "status": c.status,
        "last_transmission": c.last_transmission,
        "success_rate": c.success_rate,
        "total_transactions": c.total_transactions,
    } for c in connections]

@router.get("/connections/{connection_id}/test")
def test_connection(connection_id: int, db: Session = Depends(get_db)):
    conn = db.query(models.EDIConnection).filter(models.EDIConnection.id == connection_id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    success = random.random() > 0.1
    latency = random.randint(50, 500)

    return {
        "connection_id": connection_id,
        "payer_name": conn.payer_name,
        "test_result": "SUCCESS" if success else "FAILED",
        "latency_ms": latency,
        "endpoint": conn.endpoint_url,
        "details": {
            "tcp_connect": "OK",
            "tls_handshake": "OK" if success else "TIMEOUT",
            "edi_handshake": "OK" if success else "REJECTED",
            "isa_segment_validation": "PASSED" if success else "FAILED",
        },
        "timestamp": datetime.now().isoformat(),
    }

@router.get("/transactions")
def get_transactions(
    db: Session = Depends(get_db),
    transaction_type: Optional[str] = None,
    direction: Optional[str] = None,
    payer: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    per_page: int = 50,
):
    q = db.query(models.EDITransaction)
    if transaction_type:
        q = q.filter(models.EDITransaction.transaction_type == transaction_type)
    if direction:
        q = q.filter(models.EDITransaction.direction == direction)
    if payer:
        q = q.filter(models.EDITransaction.payer_name == payer)
    if status:
        q = q.filter(models.EDITransaction.status == status)

    total = q.count()
    transactions = q.order_by(models.EDITransaction.submitted_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return {
        "total": total,
        "transactions": [{
            "id": t.id,
            "transaction_id": t.transaction_id,
            "payer_name": t.payer_name,
            "transaction_type": t.transaction_type,
            "direction": t.direction,
            "status": t.status,
            "claim_count": t.claim_count,
            "total_amount": t.total_amount,
            "file_name": t.file_name,
            "response_code": t.response_code,
            "response_message": t.response_message,
            "submitted_at": str(t.submitted_at) if t.submitted_at else None,
            "completed_at": t.completed_at,
        } for t in transactions]
    }

@router.get("/transactions/{transaction_id}")
def get_transaction_detail(transaction_id: str, db: Session = Depends(get_db)):
    t = db.query(models.EDITransaction).filter(models.EDITransaction.transaction_id == transaction_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {
        "id": t.id,
        "transaction_id": t.transaction_id,
        "payer_name": t.payer_name,
        "transaction_type": t.transaction_type,
        "direction": t.direction,
        "status": t.status,
        "claim_count": t.claim_count,
        "total_amount": t.total_amount,
        "file_name": t.file_name,
        "edi_content": t.edi_content,
        "response_code": t.response_code,
        "response_message": t.response_message,
        "submitted_at": str(t.submitted_at) if t.submitted_at else None,
        "completed_at": t.completed_at,
    }

@router.post("/submit-837")
def submit_837(data: dict, db: Session = Depends(get_db)):
    payer = data.get("payer")
    claim_ids = data.get("claim_ids", [])

    if not payer:
        raise HTTPException(status_code=400, detail="Payer name required")

    claims = db.query(models.Claim).filter(models.Claim.payer == payer)
    if claim_ids:
        claims = claims.filter(models.Claim.claim_id.in_(claim_ids))
    claims = claims.limit(50).all()

    if not claims:
        raise HTTPException(status_code=400, detail=f"No claims found for payer: {payer}")

    claim_dicts = [{
        "claim_id": c.claim_id, "patient_name": c.patient_name, "dos": c.dos,
        "payer": c.payer, "payer_id": c.payer_id, "cpt": c.cpt, "icd": c.icd,
        "charge_amount": c.charge_amount, "provider": c.provider,
        "insurance_id": c.insurance_id,
    } for c in claims]

    edi_content = "\n\n".join([generate_edi_837_segment(c) for c in claim_dicts[:5]])
    if len(claim_dicts) > 5:
        edi_content += f"\n\n... ({len(claim_dicts) - 5} additional claims in batch)"

    total_amount = sum(c.charge_amount for c in claims if c.charge_amount)
    tx_id = f"TX-837-{random.randint(100000, 999999)}"

    conn = db.query(models.EDIConnection).filter(models.EDIConnection.payer_name == payer).first()

    transaction = models.EDITransaction(
        transaction_id=tx_id,
        connection_id=conn.id if conn else None,
        payer_name=payer,
        transaction_type="837P",
        direction="Outbound",
        status="Accepted",
        claim_count=len(claims),
        total_amount=round(total_amount, 2),
        file_name=f"837P_{payer.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.edi",
        edi_content=edi_content,
        response_code="TA1",
        response_message=f"Batch accepted: {len(claims)} claims, ${total_amount:,.2f}",
        completed_at=datetime.now().isoformat(),
    )
    db.add(transaction)

    if conn:
        conn.total_transactions = (conn.total_transactions or 0) + 1
        conn.last_transmission = datetime.now().isoformat()

    db.commit()

    return {
        "transaction_id": tx_id,
        "payer": payer,
        "claims_submitted": len(claims),
        "total_amount": round(total_amount, 2),
        "status": "Accepted",
        "edi_preview": edi_content[:2000],
    }

@router.post("/submit-276")
def submit_276(data: dict, db: Session = Depends(get_db)):
    claim_id = data.get("claim_id")
    if not claim_id:
        raise HTTPException(status_code=400, detail="Claim ID required")

    claim = db.query(models.Claim).filter(models.Claim.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    claim_dict = {
        "claim_id": claim.claim_id, "patient_name": claim.patient_name, "dos": claim.dos,
        "payer": claim.payer, "payer_id": claim.payer_id, "cpt": claim.cpt,
        "charge_amount": claim.charge_amount, "paid_amount": claim.paid_amount,
        "provider": claim.provider, "insurance_id": claim.insurance_id,
        "denial_code": claim.denial_code,
    }

    edi_276 = generate_edi_276_segment(claim_dict)
    response_277 = simulate_edi_277_response(claim_dict)

    tx_id = f"TX-276-{random.randint(100000, 999999)}"

    transaction = models.EDITransaction(
        transaction_id=tx_id,
        payer_name=claim.payer,
        transaction_type="276/277",
        direction="Outbound/Inbound",
        status="Completed",
        claim_count=1,
        total_amount=claim.charge_amount or 0,
        file_name=f"276_{claim_id}_{datetime.now().strftime('%Y%m%d')}.edi",
        edi_content=edi_276,
        response_code=response_277["status_code"],
        response_message=response_277["status_description"],
        completed_at=datetime.now().isoformat(),
    )
    db.add(transaction)
    db.commit()

    return {
        "transaction_id": tx_id,
        "claim_id": claim_id,
        "edi_276_preview": edi_276[:1500],
        "response_277": response_277,
    }

@router.get("/transaction-types")
def get_transaction_types():
    return [{"code": k, **v} for k, v in TRANSACTION_TYPES.items()]

@router.get("/summary")
def get_edi_summary(db: Session = Depends(get_db)):
    total_connections = db.query(models.EDIConnection).count()
    active_connections = db.query(models.EDIConnection).filter(models.EDIConnection.status == "Active").count()
    total_transactions = db.query(models.EDITransaction).count()
    total_claims_submitted = db.query(func.sum(models.EDITransaction.claim_count)).scalar() or 0
    total_amount = db.query(func.sum(models.EDITransaction.total_amount)).scalar() or 0

    recent = db.query(models.EDITransaction).order_by(models.EDITransaction.submitted_at.desc()).limit(5).all()

    return {
        "total_connections": total_connections,
        "active_connections": active_connections,
        "total_transactions": total_transactions,
        "total_claims_submitted": total_claims_submitted,
        "total_amount": round(float(total_amount), 2),
        "recent_transactions": [{
            "transaction_id": t.transaction_id,
            "payer_name": t.payer_name,
            "transaction_type": t.transaction_type,
            "status": t.status,
            "claim_count": t.claim_count,
        } for t in recent],
    }
