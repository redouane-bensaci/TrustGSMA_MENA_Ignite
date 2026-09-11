from typing import Dict, List, Optional, Any, Literal
from pydantic import BaseModel, Field

class AmountModel(BaseModel):
    value: float
    currency: str = "DZD"

class DeclaredLocation(BaseModel):
    label: Optional[str] = None
    cell: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class CounterpartyInput(BaseModel):
    msisdn: str
    declared_name: Optional[str] = None
    declared_location: Optional[DeclaredLocation] = None

class TransactionEvent(BaseModel):
    event_type: str = Field(..., description="E.g., order_placement, transfer, onboarding")
    amount: AmountModel
    counterparty: CounterpartyInput
    channel: str = Field(default="api", description="api, plugin, or playground")
    idempotency_key: str
    business_binding_id: Optional[str] = "bb_default_retail"

class ValueBands(BaseModel):
    routine: List[Optional[float]] = [0, 15000]
    elevated: List[Optional[float]] = [15001, 60000]
    critical: List[Optional[float]] = [60001, None]

class BusinessBinding(BaseModel):
    id: str
    business_name: str
    sector: str = "retail_physical"
    transaction_types: List[str] = ["order_placement"]
    settlement: str = "cash_on_delivery"
    value_bands: ValueBands = Field(default_factory=ValueBands)
    declared_threats: List[str] = ["fake_orders", "identity_misuse"]
    risk_appetite: str = "conservative_above_elevated"
    friction_policy: str = "invisible_to_customer"

class CounterpartyHistory(BaseModel):
    msisdn: str
    first_seen: str
    prior_transactions: int
    prior_verdicts: List[str] = []
    msisdn_seen_across_tenants: int = 1
    portable_trust_score: Optional[float] = None

class SignalResult(BaseModel):
    name: str
    status: Literal["pass", "fail", "uncertain", "not_applicable"]
    weight: float
    cost_units: int
    details: Dict[str, Any] = {}
    # The agent's own one-sentence justification for spending the budget on
    # this signal, captured at the moment it decided to buy it — this is
    # internal reasoning about *cost/what-to-check*, kept separate from the
    # final verdict and from the plain-language explanation shown to the
    # merchant (see app.internal.agent.explain). None for signals bought by
    # the fixed (non-LLM) decision tree that don't narrate themselves.
    agent_reason: Optional[str] = None

class MachineVerdict(BaseModel):
    decision: Literal["APPROVE", "REVIEW", "HOLD", "REJECT"]
    score: int
    confidence: Literal["high", "medium", "low"]
    signals: List[SignalResult]
    cost_units_spent: int
    budget_allocated: int
    latency_ms: int
    override_rule_fired: Optional[str] = None

class MerchantInstruction(BaseModel):
    summary: str
    recommended_action: str
    headline_badge: str

class VerifyResponse(BaseModel):
    transaction_id: str
    idempotency_key: str
    verdict: MachineVerdict
    merchant_instruction: MerchantInstruction
    timestamp: str
    # The server-side counterparty history the agent actually saw for this
    # MSISDN — looked up independently of the caller (see
    # app.internal.history.ledger) so it can never be spoofed by the
    # request. Returned here so a caller (or the Playground) can confirm
    # what evidence the agent was actually reasoning from, separate from
    # the network signals it chose to buy.
    counterparty_history: CounterpartyHistory

class ToolMetadata(BaseModel):
    id: str
    name: str
    camara_standard: str
    cost_weight: int
    latency_profile: str
    description: str
    what_it_proves: str

class SignupRequest(BaseModel):
    business_name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class AuthUser(BaseModel):
    id: str
    email: str
    business_name: str
    tenant_id: str
    onboarded: bool = False

class AuthResponse(BaseModel):
    token: str
    user: AuthUser

class ApiKeyPair(BaseModel):
    live_key: str
    test_key: str

class KeyRotateRequest(BaseModel):
    key_type: Literal["live", "test"] = "live"

class WebhookRegisterRequest(BaseModel):
    url: str
    events: List[str] = ["verdict.created"]

class Webhook(BaseModel):
    id: str
    tenant_id: str
    url: str
    events: List[str]
    created_at: str

class WebhookDelivery(BaseModel):
    id: str
    webhook_id: str
    event: str
    status: Literal["delivered", "failed", "pending"]
    response_code: Optional[int] = None
    attempted_at: str
    payload_summary: str
