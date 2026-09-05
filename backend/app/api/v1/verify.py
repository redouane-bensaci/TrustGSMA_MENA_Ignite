"""
POST /v1/verify - Core Decision Endpoint
"""
import uuid
from datetime import datetime
from typing import Dict
from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.schemas import TransactionEvent, VerifyResponse
from app.internal.camara.tools import CamaraClient
from app.internal.history.ledger import lookup_counterparty
from app.internal.agent.reason import TrustAgent
from app.api.v1.business_bindings import get_binding_by_id

router = APIRouter(prefix="/v1", tags=["Verification"])

camara_client = CamaraClient()
agent = TrustAgent(camara_client)

# In-memory transaction storage for dashboard replay and queries
VERIFIED_TRANSACTIONS = []

# Idempotency cache: (business_binding_id, idempotency_key) -> transaction id.
# A retried request with the same key returns the original verdict instead
# of re-running the reasoning loop and re-firing webhooks a second time.
IDEMPOTENCY_INDEX: Dict[tuple, str] = {}


@router.post("/verify", response_model=VerifyResponse)
async def verify_transaction(event: TransactionEvent, background_tasks: BackgroundTasks):
    """
    Main verification entrypoint:
    1. Returns the cached verdict immediately if this idempotency key was
       already processed for this tenant — the loop never re-runs on retry.
    2. Fetches server-side business binding context
    3. Fetches server-side verified counterparty history
    4. Runs autonomous AI agent reasoning loop under cost budget
    5. Applies deterministic override floor
    6. Returns machine verdict and merchant instructions
    7. Fires any registered webhooks in the background (never blocks the response)
    """
    binding_id = event.business_binding_id or "bb_default_retail"

    idempotency_key = (binding_id, event.idempotency_key)
    existing_tx_id = IDEMPOTENCY_INDEX.get(idempotency_key)
    if existing_tx_id:
        for tx in VERIFIED_TRANSACTIONS:
            if tx["id"] == existing_tx_id:
                return VerifyResponse(**tx["response"])

    binding = get_binding_by_id(binding_id)
    if not binding:
        raise HTTPException(status_code=404, detail=f"Business binding {binding_id} not found")

    # Anti-tampering: ledger lookup is performed server-side, never trusted from client
    history = lookup_counterparty(event.counterparty.msisdn)

    # Run the bounded agent reasoning loop
    machine_verdict, merchant_instruction = await agent.execute_reasoning_loop(
        event=event,
        binding=binding,
        history=history
    )

    tx_id = f"tx_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.utcnow().isoformat() + "Z"

    response = VerifyResponse(
        transaction_id=tx_id,
        idempotency_key=event.idempotency_key,
        verdict=machine_verdict,
        merchant_instruction=merchant_instruction,
        timestamp=now_iso
    )

    VERIFIED_TRANSACTIONS.insert(0, {
        "id": tx_id,
        "event": event.dict(),
        "response": response.dict(),
        "timestamp": now_iso
    })
    IDEMPOTENCY_INDEX[idempotency_key] = tx_id

    from app.api.v1.webhooks import deliver_verdict
    background_tasks.add_task(deliver_verdict, binding_id, tx_id, machine_verdict.dict())

    return response
