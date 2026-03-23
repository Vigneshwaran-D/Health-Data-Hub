import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from database import engine
import models

models.Base.metadata.create_all(bind=engine)

from seed_data import seed_users, seed_work_queues, seed_claims, seed_edi_connections, seed_edi_transactions, seed_rpa_bots
from database import SessionLocal

def run_seed():
    db = SessionLocal()
    try:
        seed_users(db)
        seed_work_queues(db)
        seed_claims(db)
        seed_edi_connections(db)
        seed_edi_transactions(db)
        seed_rpa_bots(db)
    finally:
        db.close()

run_seed()

from routes.auth import router as auth_router
from routes.claims import router as claims_router
from routes.queues import router as queues_router
from routes.analytics import router as analytics_router
from routes.upload import router as upload_router
from routes.edi import router as edi_router
from routes.rpa import router as rpa_router
from routes.ai_chat import router as ai_chat_router

app = FastAPI(title="NovaArc Health - RCM Workflow Platform", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(claims_router)
app.include_router(queues_router)
app.include_router(analytics_router)
app.include_router(upload_router)
app.include_router(edi_router)
app.include_router(rpa_router)
app.include_router(ai_chat_router)

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "dist")

if os.path.exists(FRONTEND_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.exists(index):
            return FileResponse(index)
        return {"message": "Frontend not built yet"}
else:
    @app.get("/")
    def root():
        return {"message": "RCM AR Platform API is running", "docs": "/docs"}

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "RCM AR Workflow Platform"}
