import datetime
import json
import logging

logger = logging.getLogger("buildsmart_audit")
logger.setLevel(logging.INFO)

# Ensure console handler is configured to print directly to stdout/console streams
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    formatter = logging.Formatter('%(message)s')
    ch.setFormatter(formatter)
    logger.addHandler(ch)

def log_audit_event(user_id, action, ip_address, target_id=None, status="SUCCESS", details=None):
    """
    Log security-relevant operations with contextual metadata.
    Inputs are sanitized to prevent log injection vulnerabilities.
    """
    # Helper to strip newlines and control characters
    def sanitize(val):
        if val is None:
            return ""
        # Escape newlines, carriage returns, and control chars to prevent log injection
        return str(val).replace('\n', '\\n').replace('\r', '\\r')

    event = {
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "user_id": sanitize(user_id),
        "action": sanitize(action),
        "ip_address": sanitize(ip_address),
        "target_id": sanitize(target_id),
        "status": sanitize(status),
        "details": sanitize(details)
    }
    
    logger.info(f"[AUDIT] {json.dumps(event)}")
