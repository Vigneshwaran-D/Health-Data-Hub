import random
import time
from datetime import datetime, timedelta

RPA_BOT_TEMPLATES = {
    "claim_status_checker": {
        "name": "Claim Status Checker",
        "description": "Logs into payer portals to check claim status and download EOBs",
        "steps": [
            "Opening browser instance...",
            "Navigating to payer portal login page...",
            "Entering credentials...",
            "Completing multi-factor authentication...",
            "Navigating to Claims section...",
            "Entering claim search criteria...",
            "Extracting claim status data...",
            "Downloading EOB documents...",
            "Updating internal system...",
            "Logging out and closing session...",
        ],
    },
    "eligibility_verifier": {
        "name": "Eligibility Verifier",
        "description": "Verifies patient eligibility and benefits through payer portals",
        "steps": [
            "Launching browser automation...",
            "Connecting to payer eligibility portal...",
            "Authenticating with stored credentials...",
            "Searching for member by ID...",
            "Extracting coverage details...",
            "Checking benefit limits and deductibles...",
            "Capturing copay/coinsurance information...",
            "Verifying prior authorization requirements...",
            "Recording results to database...",
            "Session cleanup complete...",
        ],
    },
    "denial_retriever": {
        "name": "Denial/EOB Retriever",
        "description": "Retrieves denial letters and EOB documents from payer portals",
        "steps": [
            "Initializing document retrieval bot...",
            "Connecting to payer document center...",
            "Authenticating session...",
            "Searching for unprocessed EOBs...",
            "Filtering by date range...",
            "Downloading PDF documents...",
            "Running OCR on scanned documents...",
            "Extracting denial codes and reasons...",
            "Categorizing documents by type...",
            "Upload complete, session closed...",
        ],
    },
    "prior_auth_submitter": {
        "name": "Prior Auth Submitter",
        "description": "Submits prior authorization requests through payer portals",
        "steps": [
            "Starting prior auth submission bot...",
            "Opening payer prior auth portal...",
            "Entering provider credentials...",
            "Navigating to new request form...",
            "Populating patient demographics...",
            "Entering procedure and diagnosis codes...",
            "Attaching clinical documentation...",
            "Submitting authorization request...",
            "Capturing reference number...",
            "Confirmation recorded, closing session...",
        ],
    },
    "payment_poster": {
        "name": "Payment Poster",
        "description": "Downloads 835 remittance files and posts payments to claims",
        "steps": [
            "Initializing payment posting bot...",
            "Connecting to clearinghouse portal...",
            "Downloading pending 835 files...",
            "Parsing remittance advice data...",
            "Matching payments to claims...",
            "Posting allowed amounts...",
            "Applying adjustments and write-offs...",
            "Identifying patient responsibility...",
            "Generating posting summary report...",
            "Batch posting complete...",
        ],
    },
}


def simulate_bot_run(bot_type: str, payer: str, claim_count: int = None) -> dict:
    template = RPA_BOT_TEMPLATES.get(bot_type, RPA_BOT_TEMPLATES["claim_status_checker"])
    num_claims = claim_count if claim_count is not None and claim_count > 0 else random.randint(10, 80)
    success_count = int(num_claims * random.uniform(0.85, 1.0))
    error_count = num_claims - success_count
    duration_seconds = random.randint(120, 900)
    duration_str = f"{duration_seconds // 60}m {duration_seconds % 60}s"

    log_lines = []
    timestamp = datetime.now()

    for i, step in enumerate(template["steps"]):
        step_time = timestamp + timedelta(seconds=i * random.randint(8, 30))
        status_icon = "OK" if random.random() > 0.05 else "WARN"
        log_lines.append(f"[{step_time.strftime('%H:%M:%S')}] [{status_icon}] {step}")

        if i == 5:
            log_lines.append(f"[{step_time.strftime('%H:%M:%S')}] [INFO] Processing {num_claims} claims for {payer}...")

    log_lines.append(f"[{(timestamp + timedelta(seconds=duration_seconds)).strftime('%H:%M:%S')}] [DONE] Run complete: {success_count} succeeded, {error_count} errors")

    error_details = []
    if error_count > 0:
        error_types = [
            "Session timeout during claim lookup",
            "Element not found: claim status field",
            "Portal returned unexpected error page",
            "CAPTCHA challenge encountered",
            "Network timeout connecting to payer",
            "Invalid member ID format detected",
        ]
        for _ in range(min(error_count, 3)):
            error_details.append(random.choice(error_types))

    return {
        "run_id": f"RUN-{random.randint(100000, 999999)}",
        "bot_type": bot_type,
        "bot_name": template["name"],
        "payer": payer,
        "status": "Completed" if error_count < num_claims * 0.2 else "Completed with Errors",
        "claims_processed": num_claims,
        "claims_updated": success_count,
        "errors": error_count,
        "duration": duration_str,
        "log_output": "\n".join(log_lines),
        "error_details": error_details,
        "started_at": timestamp.isoformat(),
        "completed_at": (timestamp + timedelta(seconds=duration_seconds)).isoformat(),
    }


def get_bot_health_metrics(bots: list) -> dict:
    total_bots = len(bots)
    active = sum(1 for b in bots if b.get("status") in ["Running", "Active"])
    idle = sum(1 for b in bots if b.get("status") == "Idle")
    errored = sum(1 for b in bots if b.get("status") in ["Error", "Failed"])
    total_claims = sum(b.get("claims_processed", 0) for b in bots)
    avg_success = round(sum(b.get("success_rate", 0) for b in bots) / total_bots, 1) if total_bots else 0

    return {
        "total_bots": total_bots,
        "active": active,
        "idle": idle,
        "errored": errored,
        "total_claims_processed": total_claims,
        "avg_success_rate": avg_success,
    }
