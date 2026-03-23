from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String)
    full_name = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Claim(Base):
    __tablename__ = "claims"
    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(String, unique=True, index=True)
    patient_name = Column(String)
    patient_dob = Column(String)
    dos = Column(String)
    payer = Column(String)
    payer_id = Column(String)
    cpt = Column(String)
    icd = Column(String)
    charge_amount = Column(Float)
    allowed_amount = Column(Float)
    paid_amount = Column(Float)
    aging_days = Column(Integer)
    denial_code = Column(String, nullable=True)
    denial_description = Column(String, nullable=True)
    provider = Column(String)
    specialty = Column(String)
    risk_score = Column(String, default="Low")
    risk_score_value = Column(Float, default=0.0)
    recommended_action = Column(String, nullable=True)
    claim_status = Column(String, default="Pending")
    work_queue = Column(String, nullable=True)
    auth_required = Column(Boolean, default=False)
    auth_status = Column(String, nullable=True)
    eligibility_status = Column(String, nullable=True)
    insurance_id = Column(String, nullable=True)
    group_number = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class WorkQueue(Base):
    __tablename__ = "work_queues"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    description = Column(String)
    priority = Column(String, default="Medium")
    claim_count = Column(Integer, default=0)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    action = Column(String)
    claim_id = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class EDIConnection(Base):
    __tablename__ = "edi_connections"
    id = Column(Integer, primary_key=True, index=True)
    payer_name = Column(String, index=True)
    payer_id = Column(String)
    connection_type = Column(String)
    edi_format = Column(String)
    endpoint_url = Column(String)
    status = Column(String, default="Active")
    last_transmission = Column(String, nullable=True)
    success_rate = Column(Float, default=0.0)
    total_transactions = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class EDITransaction(Base):
    __tablename__ = "edi_transactions"
    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String, unique=True, index=True)
    connection_id = Column(Integer)
    payer_name = Column(String)
    transaction_type = Column(String)
    direction = Column(String)
    status = Column(String, default="Pending")
    claim_count = Column(Integer, default=0)
    total_amount = Column(Float, default=0.0)
    file_name = Column(String, nullable=True)
    edi_content = Column(Text, nullable=True)
    response_code = Column(String, nullable=True)
    response_message = Column(String, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(String, nullable=True)

class RPABot(Base):
    __tablename__ = "rpa_bots"
    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(String, unique=True, index=True)
    bot_name = Column(String)
    payer_name = Column(String)
    bot_type = Column(String)
    status = Column(String, default="Idle")
    last_run = Column(String, nullable=True)
    next_scheduled = Column(String, nullable=True)
    total_runs = Column(Integer, default=0)
    success_rate = Column(Float, default=0.0)
    claims_processed = Column(Integer, default=0)
    avg_run_time = Column(String, nullable=True)
    credentials_status = Column(String, default="Valid")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class RPARunLog(Base):
    __tablename__ = "rpa_run_logs"
    id = Column(Integer, primary_key=True, index=True)
    bot_id = Column(String, index=True)
    run_id = Column(String, unique=True)
    status = Column(String)
    claims_processed = Column(Integer, default=0)
    claims_updated = Column(Integer, default=0)
    errors = Column(Integer, default=0)
    duration = Column(String, nullable=True)
    log_output = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(String, nullable=True)
