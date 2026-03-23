# NovaArc Health — AI-Powered RCM Workflow Platform

## Overview
An AI-powered Revenue Cycle Management (RCM) workflow platform simulating enterprise RCM systems (Waystar, R1 RCM). Features 6 role-based personas, executive intelligence dashboard with drill-downs, conversational AI assistant, enhanced work queues with claim action boards, EDI payer connectivity, and RPA bot automation.

## Architecture
- **Frontend**: React 18 + Tailwind CSS + Recharts (Vite dev server, port 5000)
- **Backend**: Python FastAPI (port 8000)
- **Database**: PostgreSQL (Replit-managed via DATABASE_URL)
- **AI Layer**: Rule-based claim analysis, conversational AI data queries, risk scoring engine

## Roles & Access
| Role | Sidebar Access |
|---|---|
| Client Leadership | Dashboard, Workflow Modules |
| Operations Leadership | Dashboard, Workflow Modules |
| Operations Manager | Dashboard, Workflow Modules, Claims, Work Queues, EDI Hub, RPA Bots |
| Team Lead | Dashboard, Workflow Modules, Claims, Work Queues, Data Ingestion |
| AR Executive | Dashboard, Workflow Modules, Claims, Work Queues, EDI Hub, RPA Bots |
| QA Auditor | Dashboard, Claims |

## Features
1. **Persona-Based Login** — 6 role-specific cards with tailored access
2. **Executive Intelligence Dashboard** — 6 tabbed sections:
   - Revenue Health: Total AR, collections, gross/net collection rate, revenue leakage, aging distribution
   - AR Health: AR >90 days, high balance, denied/appealed AR with payer/specialty/facility drill-down
   - Denial Intelligence: Denial rate, value, recovery rate, write-offs, top denial codes, distribution charts
   - Payer Performance: Comparison table with avg days to pay, denial rate, underpayment rate, escalations
   - Risk to Cash Flow: High value at risk, timely filing risk, appeals deadline, underpayment, unworked AR
   - Operations: Clean claim rate, AR backlog, work queues, AI narrative insights, team dashboard
3. **Conversational AI Assistant** — Embedded in Dashboard as floating chat panel (bottom-right). Natural language queries about RCM data (AR aging, denial rates, payer performance, etc.) with dynamic charts, tables, and metric cards. Expandable/collapsible.
4. **RCM Revenue Surge Workflow** — 5 modules: Pre-Billing Review, Charge Review, AR Follow-Up, Denial Analytics, Payment Posting
5. **Enhanced Work Queues** — Claim action board with lifecycle stage indicator, denial analytics, next best action, appeal generation, knowledge base links
6. **Claim Inventory** — Filterable table with 300+ seeded claims, risk scoring, AI investigation agents
7. **EDI Hub** — 12 payer connections, 837P submission, 276/277 inquiry, transaction history
8. **RPA Bot Center** — 24 bots across 8 payers, 5 bot types, run execution with logs
9. **AR Knowledge Repository** — Links to arlearningonline.com

## Project Structure
```
backend/
  main.py              # FastAPI entry point + CORS + seed
  database.py          # SQLAlchemy DB engine
  models.py            # ORM models (User, Claim, WorkQueue, AuditLog, EDIConnection, EDITransaction, RPABot, RPARunLog)
  schemas.py           # Pydantic schemas
  seed_data.py         # Demo data: 6 users, 300 claims, 12 EDI connections, 40 transactions, 24 RPA bots
  routes/
    auth.py, claims.py, queues.py, analytics.py, upload.py, edi.py, rpa.py, ai_chat.py
  services/
    risk_engine.py, ai_agents.py, appeal_generator.py, edi_engine.py, rpa_engine.py

frontend/
  src/
    App.jsx            # Router + auth guards
    api.js             # Axios API client
    context/AuthContext.jsx
    components/
      Sidebar.jsx      # Role-aware nav with NovaArc branding
      Layout.jsx, RiskBadge.jsx, StatusBadge.jsx
    pages/
      Login.jsx        # Persona card login (6 roles)
      Dashboard.jsx    # Executive intelligence dashboard (6 tabs) + embedded AI chat panel
      WorkflowModules.jsx  # 5 RCM Revenue Surge modules
      WorkQueues.jsx   # Enhanced work queues with claim action board
      ClaimInventory.jsx, ClaimDetail.jsx
      FileUpload.jsx, EDIHub.jsx, RPABots.jsx
```

## API Endpoints
- `GET /api/analytics/dashboard` — Comprehensive metrics (revenue_health, ar_health, denial_intelligence, risk_indicators, operational)
- `GET /api/analytics/drilldown?dimension=payer|specialty|facility` — Drill-down data by dimension
- `GET /api/analytics/payer-intelligence` — Payer performance metrics
- `GET /api/analytics/risk-indicators` — Risk detection with claim lists
- `GET /api/analytics/team-dashboard` — Team leader metrics
- `POST /api/ai/chat` — Conversational AI queries

## Demo Accounts
| Username | Password | Role |
|---|---|---|
| clientlead | nova123 | Client Leadership |
| opslead | nova123 | Operations Leadership |
| opsmgr | nova123 | Operations Manager |
| teamlead | nova123 | Team Lead |
| arexec | nova123 | AR Executive |
| qaauditor | nova123 | QA Auditor |

## Workflows
- **Backend API**: `cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000`
- **Start application**: `cd frontend && npm run dev` (port 5000)
