"""
CAMARA Number Verification V1 — 3-legged OAuth "fast authorization" flow.

Number Verification cannot be called headlessly from a backend: it requires
the end-user's own device to open an operator authorization URL over its
live cellular connection and grant consent, then the operator redirects
back to us with a one-time code. That consent step cannot happen inside the
same synchronous request as the rest of the fraud-check reasoning loop, so
this is deliberately a separate, session-based flow:

  1. GET /v1/number-verification/start?phone_number=+213...
     -> returns an authorization_url. The caller (merchant's checkout page)
        opens/redirects this URL on the end-user's mobile device.
  2. The operator authenticates the subscriber and redirects the device to
     our /v1/number-verification/redirect?code=...&state=... callback.
  3. We exchange (code, state) for a verification result via NaC and cache
     it, keyed by phone number, for a short TTL.

`CamaraClient.verify_number` then checks this cache first: if the end-user
completed consent recently, it returns the real, live-verified result;
otherwise it falls back to the deterministic sandbox simulator so the demo
scenarios keep working without requiring a live phone in hand.
"""
import logging
import secrets
import time
from typing import Any, Dict, Optional
from urllib.parse import urlencode

from app.config import settings

logger = logging.getLogger("trust.number_verification")

SCOPE = "dpv:FraudPreventionAndDetection number-verification:verify"
CACHE_TTL_SECONDS = 900  # 15 minutes — a completed consent stays usable briefly, not indefinitely
PENDING_TTL_SECONDS = 600  # an authorization link is only valid for 10 minutes

# state -> {"phone_number": str, "nonce": str, "created_at": float}
_PENDING: Dict[str, Dict[str, Any]] = {}
# normalized phone number -> {"verified": bool, "verified_at": float}
_VERIFIED_CACHE: Dict[str, Dict[str, Any]] = {}

_metadata_cache: Optional[Dict[str, str]] = None
_client_credentials_cache: Optional[Dict[str, str]] = None


class NumberVerificationError(Exception):
    pass


def _normalize(phone_number: str) -> str:
    p = phone_number.strip()
    return p if p.startswith("+") else f"+{p}"


def _sdk_client():
    from network_as_code import NetworkAsCodeApi
    return NetworkAsCodeApi(
        rapidapi_host=settings.NOKIA_NAC_RAPIDAPI_HOST,
        api_key=settings.NOKIA_NAC_API_KEY,
    )


def _get_metadata() -> Dict[str, str]:
    global _metadata_cache
    if _metadata_cache is None:
        response = _sdk_client().well_known_metadata.get_oauth_authorization_server()
        _metadata_cache = {
            "authorization_endpoint": response.authorization_endpoint,
            "token_endpoint": response.token_endpoint,
            "fast_flow_csp_auth_endpoint": getattr(response, "fast_flow_csp_auth_endpoint", None),
        }
    return _metadata_cache


def _get_client_credentials() -> Dict[str, str]:
    global _client_credentials_cache
    if _client_credentials_cache is None:
        response = _sdk_client().oauth.get_client_credentials()
        _client_credentials_cache = {
            "client_id": response.client_id,
            "client_secret": response.client_secret,
        }
    return _client_credentials_cache


def _gc_pending() -> None:
    now = time.time()
    expired = [s for s, v in _PENDING.items() if now - v["created_at"] > PENDING_TTL_SECONDS]
    for s in expired:
        _PENDING.pop(s, None)


def build_fast_flow_authorization_url(phone_number: str) -> Dict[str, str]:
    """
    Builds the authorization link the end-user's device must open. Returns
    {"authorization_url": ..., "state": ...}.
    """
    if settings.MOCK_CARRIER_MODE or not settings.NOKIA_NAC_API_KEY:
        raise NumberVerificationError("Live Number Verification is disabled (mock carrier mode / no API key).")

    _gc_pending()
    metadata = _get_metadata()
    csp_endpoint = metadata.get("fast_flow_csp_auth_endpoint")
    if not csp_endpoint:
        raise NumberVerificationError("Operator did not advertise a fast_flow_csp_auth_endpoint.")

    credentials = _get_client_credentials()
    state = secrets.token_urlsafe(24)
    nonce = secrets.token_urlsafe(16)
    phone = _normalize(phone_number)

    _PENDING[state] = {"phone_number": phone, "nonce": nonce, "created_at": time.time()}

    params = {
        "scope": SCOPE,
        "state": state,
        "response_type": "code",
        "prompt": "none",
        "client_id": credentials["client_id"],
        "redirect_uri": settings.NUMBER_VERIFICATION_REDIRECT_URI,
        "login_hint": phone,
        "nonce": nonce,
    }
    return {"authorization_url": f"{csp_endpoint}?{urlencode(params)}", "state": state}


def complete_fast_flow(code: str, state: str) -> Dict[str, Any]:
    """
    Called from the redirect callback once the operator hands back a code.
    Exchanges it (via NaC) for the verification result and caches it.
    """
    _gc_pending()
    pending = _PENDING.pop(state, None)
    if not pending:
        raise NumberVerificationError("Unknown or expired state — the authorization link may have expired.")

    phone = pending["phone_number"]
    try:
        result = _sdk_client().number_verification.verify(state=state, code=code, phone_number=phone)
    except Exception as exc:
        raise NumberVerificationError(f"NaC verify call failed: {exc}") from exc

    verified = bool(getattr(result, "device_phone_number_verified", False))
    _VERIFIED_CACHE[phone] = {"verified": verified, "verified_at": time.time()}
    return {"phone_number": phone, "verified": verified}


def get_cached_verification(phone_number: str) -> Optional[Dict[str, Any]]:
    """Returns the cached live result if one exists and hasn't expired, else None."""
    phone = _normalize(phone_number)
    entry = _VERIFIED_CACHE.get(phone)
    if not entry:
        return None
    if time.time() - entry["verified_at"] > CACHE_TTL_SECONDS:
        _VERIFIED_CACHE.pop(phone, None)
        return None
    return entry
