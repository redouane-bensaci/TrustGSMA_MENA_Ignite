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
        settlement="cash_on_delivery",
        declared_threats=["fake_orders", "identity_misuse"],
        risk_appetite="conservative_above_elevated"
    ),
    "bb_algeria_fintech_01": BusinessBinding(
        id="bb_algeria_fintech_01",
        business_name="Numidia Pay Fintech",
        sector="banking_fintech",
        settlement="instant_wire",
        declared_threats=["account_takeover", "unauthorized_disbursement"],
        risk_appetite="strict"
    ),
    "bb_ecommerce_store_02": BusinessBinding(
        id="bb_ecommerce_store_02",
        business_name="Atlas Goods E-Commerce",
        sector="ecommerce_marketplace",
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
    return updated
