from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    role: str
    full_name: str

class ClaimOut(BaseModel):
    id: int
    claim_id: str
    patient_name: str
    patient_dob: Optional[str]
    dos: str
    payer: str
    payer_id: Optional[str]
    cpt: str
    icd: str
    charge_amount: float
    allowed_amount: Optional[float]
    paid_amount: Optional[float]
    aging_days: int
    denial_code: Optional[str]
    denial_description: Optional[str]
    provider: str
    specialty: str
    risk_score: str
    risk_score_value: float
    recommended_action: Optional[str]
    claim_status: str
    work_queue: Optional[str]
    auth_required: bool
    auth_status: Optional[str]
    eligibility_status: Optional[str]
    insurance_id: Optional[str]
    group_number: Optional[str]
    notes: Optional[str]

    class Config:
        from_attributes = True

class AgentResponse(BaseModel):
    agent: str
    status: str
    result: dict
    confidence: Optional[float]

class AppealLetter(BaseModel):
    claim_id: str
    patient_name: str
    payer: str
    denial_code: str
    letter: str

class AnalyticsData(BaseModel):
    total_claims: int
    total_ar_value: float
    high_risk_count: int
    denial_rate: float
    avg_aging: float
