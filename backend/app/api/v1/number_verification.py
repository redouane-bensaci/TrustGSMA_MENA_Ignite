"""
CAMARA Number Verification V1 — consent flow endpoints.

Live phone-number verification needs the end-user's own device to open an
operator authorization URL and grant consent (see
app.internal.camara.number_verification_flow for the full explanation).
These two endpoints are how a merchant checkout page drives that flow;
the result then feeds into /v1/verify's `verify_number` signal
automatically for a short window afterwards.
"""
from fastapi import APIRouter, HTTPException, Query
from app.internal.camara.number_verification_flow import (
    build_fast_flow_authorization_url, complete_fast_flow, NumberVerificationError
)

router = APIRouter(prefix="/v1/number-verification", tags=["Number Verification"])


@router.get("/start")
async def start_number_verification(phone_number: str = Query(..., description="E.164 phone number, e.g. +213661448899")):
    """
    Returns the authorization URL the end-user's mobile device must open
    (over live cellular data) to grant Number Verification consent.
    """
    try:
        return build_fast_flow_authorization_url(phone_number)
    except NumberVerificationError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.get("/redirect")
async def number_verification_redirect(code: str = Query(...), state: str = Query(...)):
    """
    The operator redirects the end-user's device here after consent. On
    success, the result is cached and reused by /v1/verify's
    `verify_number` signal for this phone number for a short TTL.
    """
    try:
        result = complete_fast_flow(code=code, state=state)
    except NumberVerificationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {
        "message": "Number verification complete. You may close this window and return to the merchant.",
        **result,
    }
