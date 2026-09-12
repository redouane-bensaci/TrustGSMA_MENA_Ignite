"""
Business Bindings CRUD API
POST /v1/business-bindings
GET /v1/business-bindings/{id}
PATCH /v1/business-bindings/{id}
"""
from typing import Dict, List, Optional
from fastapi import APIRouter, HTTPException
from app.schemas import BusinessBinding

router = APIRouter(prefix="/v1/business-bindings", tags=["Business Bindings"])

# In-memory storage of business bindings
BINDINGS_DB: Dict[str, BusinessBinding] = {
    "bb_default_retail": BusinessBinding(
        id="bb_default_retail",
        business_name="Maghreb Express Retail",
        sector="retail_physical",
        transaction_types=["order_placement"],
        settlement="cash_on_delivery",
        declared_threats=["fake_orders", "identity_misuse"],
        risk_appetite="conservative_above_elevated"
    ),
    "bb_algeria_fintech_01": BusinessBinding(
        id="bb_algeria_fintech_01",
        business_name="Numidia Pay Fintech",
        sector="banking_fintech",
        transaction_types=["transfer", "disbursement"],
        settlement="instant_wire",
        declared_threats=["account_takeover", "unauthorized_disbursement"],
        risk_appetite="strict"
    ),
    # Micro-lending tenant referenced by scenarios/scenario_c_fake_check.json.
    # Identity misuse is the threat a micro-loan book is actually
    # underwriting against — a forged onboarding profile is the whole
    # attack — so this tenant declares it and runs a strict appetite.
    "bb_microloan_lender_03": BusinessBinding(
        id="bb_microloan_lender_03",
        business_name="Sahel Micro-Credit",
        sector="microfinance_lending",
        transaction_types=["onboarding_verification", "disbursement"],
        settlement="cash_disbursement",
        declared_threats=["identity_misuse", "fake_orders"],
        risk_appetite="strict"
    ),
    "bb_ecommerce_store_02": BusinessBinding(
        id="bb_ecommerce_store_02",
        business_name="Atlas Goods E-Commerce",
        sector="ecommerce_marketplace",
        transaction_types=["order_placement", "refund"],
        settlement="cash_on_delivery",
        declared_threats=["sim_swap_fraud", "ghost_orders"],
        risk_appetite="moderate"
    )
}

def get_binding_by_id(binding_id: str) -> Optional[BusinessBinding]:
    return BINDINGS_DB.get(binding_id)

@router.get("", response_model=List[BusinessBinding])
async def list_bindings():
    return list(BINDINGS_DB.values())

@router.get("/{id}", response_model=BusinessBinding)
async def get_binding(id: str):
    binding = BINDINGS_DB.get(id)
    if not binding:
        raise HTTPException(status_code=404, detail="Business binding not found")
    return binding

@router.post("", response_model=BusinessBinding)
async def create_binding(binding: BusinessBinding):
    BINDINGS_DB[binding.id] = binding
    from app.api.v1.auth import mark_tenant_onboarded
    mark_tenant_onboarded(binding.id)
    return binding

@router.patch("/{id}", response_model=BusinessBinding)
async def update_binding(id: str, updates: Dict[str, object]):
    binding = BINDINGS_DB.get(id)
    if not binding:
        raise HTTPException(status_code=404, detail="Business binding not found")

    current_data = binding.dict()
    current_data.update(updates)
    updated = BusinessBinding(**current_data)
    BINDINGS_DB[id] = updated
    from app.api.v1.auth import mark_tenant_onboarded
    mark_tenant_onboarded(id)
    return updated
