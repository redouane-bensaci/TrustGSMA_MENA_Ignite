"""
POST /v1/webhooks               - Register a delivery endpoint
GET  /v1/webhooks/{id}/deliveries - Delivery logs

Real HTTP delivery (not just a logged intent): whenever a verdict is
produced, deliver_verdict() POSTs it to every webhook registered for the
transaction's tenant and records the outcome, success or failure, in
DELIVERIES_DB. Nothing outside this module calls the registered URL.
"""
import uuid
from datetime import datetime, timezone
from typing import Dict, List
import httpx
from fastapi import APIRouter, Header, HTTPException
from app.schemas import Webhook, WebhookDelivery, WebhookRegisterRequest
from app.api.v1.auth import get_current_user

router = APIRouter(prefix="/v1/webhooks", tags=["Webhooks"])

# In-memory stores (hackathon scope)
WEBHOOKS_DB: Dict[str, dict] = {}          # webhook_id -> Webhook fields
DELIVERIES_DB: Dict[str, List[dict]] = {}  # webhook_id -> [delivery, ...]


@router.post("", response_model=Webhook)
async def register_webhook(payload: WebhookRegisterRequest, authorization: str = Header(default="")):
    user = get_current_user(authorization)
    webhook_id = f"wh_{uuid.uuid4().hex[:10]}"
    record = {
        "id": webhook_id,
        "tenant_id": user["tenant_id"],
        "url": payload.url,
        "events": payload.events,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    WEBHOOKS_DB[webhook_id] = record
    DELIVERIES_DB[webhook_id] = []
    return Webhook(**record)


@router.get("", response_model=List[Webhook])
async def list_webhooks(authorization: str = Header(default="")):
    user = get_current_user(authorization)
    return [Webhook(**w) for w in WEBHOOKS_DB.values() if w["tenant_id"] == user["tenant_id"]]


@router.get("/{webhook_id}/deliveries", response_model=List[WebhookDelivery])
async def list_deliveries(webhook_id: str, authorization: str = Header(default="")):
    user = get_current_user(authorization)
    webhook = WEBHOOKS_DB.get(webhook_id)
    if not webhook or webhook["tenant_id"] != user["tenant_id"]:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return [WebhookDelivery(**d) for d in DELIVERIES_DB.get(webhook_id, [])]


async def deliver_verdict(tenant_id: str, transaction_id: str, verdict_payload: dict) -> None:
    """
    Fires "verdict.created" to every webhook registered for this tenant.
    Called from POST /v1/verify right after a verdict is synthesized —
    never raises back to the caller, since a failed delivery must not fail
    the verification response itself; it's recorded and left for retry
    tooling that doesn't exist yet in this hackathon build.
    """
    tenant_webhooks = [w for w in WEBHOOKS_DB.values() if w["tenant_id"] == tenant_id]
    if not tenant_webhooks:
        return

    for webhook in tenant_webhooks:
        if "verdict.created" not in webhook["events"]:
            continue
        delivery_id = f"del_{uuid.uuid4().hex[:10]}"
        attempted_at = datetime.now(timezone.utc).isoformat()
        status = "pending"
        response_code = None
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.post(
                    webhook["url"],
                    json={"event": "verdict.created", "transaction_id": transaction_id, "data": verdict_payload},
                )
                response_code = resp.status_code
                status = "delivered" if resp.is_success else "failed"
        except httpx.HTTPError:
            status = "failed"

        DELIVERIES_DB.setdefault(webhook["id"], []).insert(0, {
            "id": delivery_id,
            "webhook_id": webhook["id"],
            "event": "verdict.created",
            "status": status,
            "response_code": response_code,
            "attempted_at": attempted_at,
            "payload_summary": f"{transaction_id} · {verdict_payload.get('decision', '?')}",
        })
