"""
GET /v1/transactions
GET /v1/transactions/{id}
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/v1/transactions", tags=["Transactions"])

# Reference the transaction store in verify.py
def get_tx_store():
    from app.api.v1.verify import VERIFIED_TRANSACTIONS
    return VERIFIED_TRANSACTIONS

@router.get("", response_model=List[Dict[str, Any]])
async def list_transactions(
    decision: Optional[str] = Query(None, description="Filter by APPROVE, REVIEW, HOLD, REJECT"),
    limit: int = 50
):
    txs = get_tx_store()
    filtered = txs
    if decision:
        filtered = [t for t in txs if t.get("response", {}).get("verdict", {}).get("decision") == decision.upper()]
    return filtered[:limit]

@router.get("/{id}", response_model=Dict[str, Any])
async def get_transaction(id: str):
    txs = get_tx_store()
    for t in txs:
        if t["id"] == id:
            return t
    raise HTTPException(status_code=404, detail="Transaction not found")
