"""
POST /v1/verify - Core Decision Endpoint
"""
import logging
import uuid
from datetime import datetime
from typing import Dict
from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.schemas import TransactionEvent, VerifyResponse, CounterpartyHistory
from app.internal.camara.tools import CamaraClient
from app.internal.history.ledger import lookup_counterparty
from app.internal.agent.reason import TrustAgent
from app.internal.agent.llm_agent import LLMTrustAgent
from app.internal.agent.explain import generate_explanation
from app.internal.verdict.synthesize import is_no_sim_counterparty, no_sim_hold_verdict
from app.api.v1.business_bindings import get_binding_by_id
from app.config import settings

logger = logging.getLogger("trust.verify")

router = APIRouter(prefix="/v1", tags=["Verification"])

camara_client = CamaraClient()
fixed_agent = TrustAgent(camara_client)
llm_agent = LLMTrustAgent(camara_client)

# In-memory transaction storage for dashboard replay and queries
VERIFIED_TRANSACTIONS = []

# Idempotency cache: (business_binding_id, idempotency_key) -> transaction id.
# A retried request with the same key returns the original verdict instead
# of re-running the reasoning loop and re-firing webhooks a second time.
IDEMPOTENCY_INDEX: Dict[tuple, str] = {}


@router.get("/counterparty-history/{msisdn}", response_model=CounterpartyHistory)
async def get_counterparty_history(msisdn: str):
    """
    Read-only lookup of the same server-side, anti-tampering counterparty
    history the verification agent itself sees for a given MSISDN — lets a
    caller (or the Playground) preview what evidence the agent will
    actually reason from before running a full /verify call, and confirm
    it afterwards. This is the same ledger.lookup_counterparty() the agent
    uses internally; it never accepts history from the client.
    """
    return lookup_counterparty(msisdn)


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

    # No SIM to test (computer / no-SIM user): skip the agent entirely — no
    # CAMARA call can run — and hold by default. The fixed template is kept
    # as-is rather than rewritten by the explanation layer.
    no_sim = is_no_sim_counterparty(event.counterparty.msisdn)
    if no_sim:
        logger.info("Counterparty has no SIM card, holding by default without CAMARA checks")
        machine_verdict, merchant_instruction = no_sim_hold_verdict()

    # Run the bounded agent reasoning loop. The LLM planner (OpenRouter)
    # decides which CAMARA signals to buy; if it's disabled or errors out
    # before spending anything, fall back to the fixed decision tree so a
    # verify call never hard-fails on an LLM-provider outage.
    elif settings.LLM_AGENT_ENABLED and settings.OPENROUTER_API_KEY:
        try:
            logger.info("Running autonomous LLM agent reasoning loop via OpenRouter...")
            machine_verdict, merchant_instruction = await llm_agent.execute_reasoning_loop(
                event=event, binding=binding, history=history
            )
        except Exception as exc:
            logger.warning("LLM agent failed (%s), falling back to deterministic fixed agent", exc)
            machine_verdict, merchant_instruction = await fixed_agent.execute_reasoning_loop(
                event=event, binding=binding, history=history
            )
    else:
        logger.info("LLM agent disabled or missing API key, using fixed deterministic agent")
        machine_verdict, merchant_instruction = await fixed_agent.execute_reasoning_loop(
            event=event, binding=binding, history=history
        )

    # Explainability layer: turn the verdict + signals bought into a plain-
    # language note for the business owner — never touches decision/score,
    # only replaces the templated summary/action text when the LLM is
    # available. Any failure here silently keeps the deterministic template.
    explanation = None if no_sim else await generate_explanation(
        decision=machine_verdict.decision,
        score=machine_verdict.score,
        confidence=machine_verdict.confidence,
        signals=machine_verdict.signals,
        override_rule_fired=machine_verdict.override_rule_fired,
    )
    if explanation:
        merchant_instruction.summary, merchant_instruction.recommended_action = explanation

    tx_id = f"tx_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.utcnow().isoformat() + "Z"

    response = VerifyResponse(
        transaction_id=tx_id,
        idempotency_key=event.idempotency_key,
        verdict=machine_verdict,
        merchant_instruction=merchant_instruction,
        timestamp=now_iso,
        counterparty_history=history,
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
