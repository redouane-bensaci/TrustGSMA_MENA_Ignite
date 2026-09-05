"""
POST /v1/auth/signup - Create account + tenant shell
POST /v1/auth/login  - Session/token issuance

Hackathon-scope auth: in-memory user store, opaque bearer tokens (no JWT/hashing
libraries pulled in for a two-week prototype). Swap for real password hashing +
signed tokens before this ever sees real credentials.
"""
import uuid
import hashlib
from typing import Dict
from fastapi import APIRouter, HTTPException, Header
from app.schemas import SignupRequest, LoginRequest, AuthResponse, AuthUser
from app.api.v1.business_bindings import BINDINGS_DB
from app.schemas import BusinessBinding

router = APIRouter(prefix="/v1/auth", tags=["Auth"])

def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


# In-memory user + session stores (hackathon scope only), seeded with a demo
# account so /login works without going through /signup first.
USERS_DB: Dict[str, dict] = {
    "demo@trust.dz": {
        "id": "usr_demo00001",
        "email": "demo@trust.dz",
        "password_hash": _hash_password("trust-demo"),
        "business_name": "Maghreb Express Retail",
        "tenant_id": "bb_default_retail",
        "onboarded": True,
    }
}
TOKENS_DB: Dict[str, str] = {}  # token -> user email


def _issue_token(email: str) -> str:
    token = f"trust_tok_{uuid.uuid4().hex}"
    TOKENS_DB[token] = email
    return token


def get_current_user(authorization: str = Header(default="")) -> dict:
    """Dependency-style helper: resolves a Bearer token to a user record."""
    token = authorization.replace("Bearer ", "").strip()
    email = TOKENS_DB.get(token)
    if not email or email not in USERS_DB:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return USERS_DB[email]


@router.post("/signup", response_model=AuthResponse)
async def signup(payload: SignupRequest):
    if payload.email in USERS_DB:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user_id = f"usr_{uuid.uuid4().hex[:10]}"
    tenant_id = f"bb_{uuid.uuid4().hex[:8]}"

    USERS_DB[payload.email] = {
        "id": user_id,
        "email": payload.email,
        "password_hash": _hash_password(payload.password),
        "business_name": payload.business_name,
        "tenant_id": tenant_id,
        "onboarded": False,
    }

    # Kick off the tenant's business binding shell with sane defaults;
    # /dashboard/onboarding PATCHes this once the wizard completes.
    BINDINGS_DB[tenant_id] = BusinessBinding(
        id=tenant_id,
        business_name=payload.business_name,
    )

    token = _issue_token(payload.email)
    user = USERS_DB[payload.email]
    return AuthResponse(token=token, user=AuthUser(**{k: user[k] for k in ("id", "email", "business_name", "tenant_id", "onboarded")}))


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest):
    user = USERS_DB.get(payload.email)
    if not user or user["password_hash"] != _hash_password(payload.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = _issue_token(payload.email)
    return AuthResponse(token=token, user=AuthUser(**{k: user[k] for k in ("id", "email", "business_name", "tenant_id", "onboarded")}))


@router.get("/me", response_model=AuthUser)
async def me(authorization: str = Header(default="")):
    user = get_current_user(authorization)
    return AuthUser(**{k: user[k] for k in ("id", "email", "business_name", "tenant_id", "onboarded")})


def mark_tenant_onboarded(tenant_id: str) -> None:
    """Called by the business-bindings router once onboarding posts a real binding."""
    for user in USERS_DB.values():
        if user["tenant_id"] == tenant_id:
            user["onboarded"] = True
