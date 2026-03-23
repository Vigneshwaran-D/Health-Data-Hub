# NovaArc Health - RCM Workflow Platform (Health Data Hub)

NovaArc Health is a comprehensive Revenue Cycle Management (RCM) workflow platform designed to streamline healthcare claims processing, electronic data interchange (EDI) tracking, robotic process automation (RPA) orchestration, and detailed operational analytics. 

## 🚀 Features

- **Auth & Role-Based Access**: Role-based routing configured for Executives, Managers, Team Leads, and Auditors.
- **Claims Management**: Visualize and process claims, track AR aging, and manage high-dollar denials.
- **Work Queues**: Prioritized queues for authorization denials, eligibility issues, Medicaid claims, and general AR.
- **EDI Engine**: Track and manage EDI transactions (837P, 835, 276/277, 270/271, 999 response codes).
- **RPA Automation Orchestration**: Status, logs, and activity metrics for automated bots handling claim statuses and eligibility.
- **AI Analytics & Insights**: Interactive dashboards for risk scoring, aging distribution, and payer intelligence.
- **AI Chat Agent**: Integrated conversational interface connected to backend data for answering operational queries.

## 🛠️ Technology Stack

**Frontend**
- React & Vite
- Tailwind CSS
- Axios for API communication (configured with a proxy to `127.0.0.1:8000`)
- Running on Port `5000`

**Backend**
- Python 3.11+
- FastAPI & Uvicorn
- SQLite with SQLAlchemy (auto-generating `rcm_ar.db` upon initialization)
- Pre-loaded seeding scripts for robust demo data (Claims, Users, EDI, Bots)
- Running on Port `8000`

---

## 🔑 Default Login Credentials

On the first successful run, the backend will automatically seed the database with the following demo personas:

| Role | Username | Password |
| :--- | :--- | :--- |
| Client Leadership | `clientlead` | `nova123` |
| Operations Leadership | `opslead` | `nova123` |
| Operations Manager | `opsmgr` | `nova123` |
| Team Lead | `teamlead` | `nova123` |
| AR Executive | `arexec` | `nova123` |
| QA Auditor | `qaauditor` | `nova123` |

*(Note: During local development, the frontend provides auto-fill Persona buttons for quick access to these accounts).*

---

## 💻 Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [Python](https://www.python.org/downloads/) (3.11 or higher)
- (`uv` package manager is optional but supported via `pyproject.toml`)

### 1. Install Backend Dependencies
You can install the backend environment in your preferred way using the `pyproject.toml` file. Without a virtual environment, install the dependencies directly:
```bash
pip install fastapi uvicorn sqlalchemy psycopg2-binary pandas openpyxl aiofiles python-multipart pydantic
```

### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
```

---

## 🏃‍♂️ Running the Application

### The Easy Way (Using Starter Scripts)
For Windows users, simply double-click the `start.bat` file from the main directory, or run it in your terminal:
```bash
start.bat
```
*(On Mac/Linux, you can use `./start.sh`)*

This script automatically launches two connected terminals:
1. The **Backend Server** (via Uvicorn)
2. The **Frontend Server** (via Vite)

### The Manual Way
If you prefer to start them individually:

**Terminal 1 (Backend):**
```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
*(Note: Do not run `python main.py` directly as it will not launch the web server).*

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

---

## 📖 API Documentation

Once the backend is running, FastAPI automatically generates interactive API documentation. You can access it in your browser at:
- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

## 📁 Project Structure

```text
Health-Data-Hub/
├── backend/
│   ├── main.py            # FastAPI Application entry point & configuration
│   ├── database.py        # SQLite Database connection logic
│   ├── models.py          # SQLAlchemy ORM Models
│   ├── schemas.py         # Pydantic validation schemas
│   ├── seed_data.py       # Auto-population script for demo DB content
│   ├── routes/            # API Route definitions (auth, claims, rpa, edi, etc.)
│   └── services/          # Core business logic processing engines
├── frontend/
│   ├── index.html         # Main HTML template
│   ├── src/               # React components, contexts, and API configurations
│   ├── vite.config.js     # Dev server & reverse proxy configuration
│   └── package.json       # Node application dependencies
├── pyproject.toml         # Python dependency manager file
├── start.bat              # Windows startup script
└── start.sh               # Unix/Mac startup script
```
