from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
import models
import random
from datetime import datetime, timedelta
from services.rpa_engine import simulate_bot_run, RPA_BOT_TEMPLATES

router = APIRouter(prefix="/api/rpa", tags=["rpa"])

@router.get("/bots")
def get_bots(db: Session = Depends(get_db)):
    bots = db.query(models.RPABot).order_by(models.RPABot.payer_name, models.RPABot.bot_name).all()
    return [{
        "id": b.id,
        "bot_id": b.bot_id,
        "bot_name": b.bot_name,
        "payer_name": b.payer_name,
        "bot_type": b.bot_type,
        "status": b.status,
        "last_run": b.last_run,
        "next_scheduled": b.next_scheduled,
        "total_runs": b.total_runs,
        "success_rate": b.success_rate,
        "claims_processed": b.claims_processed,
        "avg_run_time": b.avg_run_time,
        "credentials_status": b.credentials_status,
    } for b in bots]

@router.post("/bots/{bot_id}/run")
def run_bot(bot_id: str, db: Session = Depends(get_db)):
    bot = db.query(models.RPABot).filter(models.RPABot.bot_id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")

    claim_count = db.query(models.Claim).filter(models.Claim.payer == bot.payer_name).count()
    result = simulate_bot_run(bot.bot_type, bot.payer_name, min(claim_count, random.randint(15, 60)))

    run_log = models.RPARunLog(
        bot_id=bot_id,
        run_id=result["run_id"],
        status=result["status"],
        claims_processed=result["claims_processed"],
        claims_updated=result["claims_updated"],
        errors=result["errors"],
        duration=result["duration"],
        log_output=result["log_output"],
        completed_at=result["completed_at"],
    )
    db.add(run_log)

    bot.status = "Idle"
    bot.last_run = datetime.now().isoformat()
    bot.total_runs = (bot.total_runs or 0) + 1
    bot.claims_processed = (bot.claims_processed or 0) + result["claims_processed"]
    total_success = (bot.success_rate or 0) * ((bot.total_runs or 1) - 1) + (result["claims_updated"] / max(result["claims_processed"], 1) * 100)
    bot.success_rate = round(total_success / (bot.total_runs or 1), 1)
    bot.avg_run_time = result["duration"]
    bot.next_scheduled = (datetime.now() + timedelta(hours=random.choice([2, 4, 6, 8, 12]))).isoformat()

    db.commit()

    return result

@router.get("/bots/{bot_id}/logs")
def get_bot_logs(bot_id: str, db: Session = Depends(get_db), limit: int = 10):
    logs = db.query(models.RPARunLog).filter(
        models.RPARunLog.bot_id == bot_id
    ).order_by(models.RPARunLog.started_at.desc()).limit(limit).all()

    return [{
        "id": l.id,
        "run_id": l.run_id,
        "status": l.status,
        "claims_processed": l.claims_processed,
        "claims_updated": l.claims_updated,
        "errors": l.errors,
        "duration": l.duration,
        "log_output": l.log_output,
        "started_at": str(l.started_at) if l.started_at else None,
        "completed_at": l.completed_at,
    } for l in logs]

@router.get("/bot-types")
def get_bot_types():
    return [{
        "type": k,
        "name": v["name"],
        "description": v["description"],
        "steps_count": len(v["steps"]),
    } for k, v in RPA_BOT_TEMPLATES.items()]

@router.get("/summary")
def get_rpa_summary(db: Session = Depends(get_db)):
    total_bots = db.query(models.RPABot).count()
    active_bots = db.query(models.RPABot).filter(models.RPABot.status.in_(["Running", "Active"])).count()
    idle_bots = db.query(models.RPABot).filter(models.RPABot.status == "Idle").count()
    error_bots = db.query(models.RPABot).filter(models.RPABot.status.in_(["Error", "Failed"])).count()
    total_claims = db.query(func.sum(models.RPABot.claims_processed)).scalar() or 0
    total_runs = db.query(func.sum(models.RPABot.total_runs)).scalar() or 0
    avg_success = db.query(func.avg(models.RPABot.success_rate)).scalar() or 0

    payer_stats = db.query(
        models.RPABot.payer_name,
        func.count(models.RPABot.id).label("bot_count"),
        func.sum(models.RPABot.claims_processed).label("total_claims"),
        func.avg(models.RPABot.success_rate).label("avg_success"),
    ).group_by(models.RPABot.payer_name).order_by(func.sum(models.RPABot.claims_processed).desc()).all()

    return {
        "total_bots": total_bots,
        "active_bots": active_bots,
        "idle_bots": idle_bots,
        "error_bots": error_bots,
        "total_claims_processed": int(total_claims),
        "total_runs": int(total_runs),
        "avg_success_rate": round(float(avg_success), 1),
        "payer_stats": [{
            "payer": s.payer_name,
            "bot_count": s.bot_count,
            "total_claims": int(s.total_claims or 0),
            "avg_success": round(float(s.avg_success or 0), 1),
        } for s in payer_stats],
    }

@router.post("/bots/{bot_id}/schedule")
def update_schedule(bot_id: str, data: dict, db: Session = Depends(get_db)):
    bot = db.query(models.RPABot).filter(models.RPABot.bot_id == bot_id).first()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    try:
        hours = int(data.get("hours", 4))
        if hours < 1 or hours > 168:
            raise ValueError
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Hours must be a number between 1 and 168")
    bot.next_scheduled = (datetime.now() + timedelta(hours=hours)).isoformat()
    db.commit()
    return {"bot_id": bot_id, "next_scheduled": bot.next_scheduled}
