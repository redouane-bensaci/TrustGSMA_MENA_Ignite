"""
TRUST Transaction Verification Platform
FastAPI main entrypoint for GSMA MENA Ignite Hackathon
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.verify import router as verify_router
from app.api.v1.business_bindings import router as bindings_router
from app.api.v1.transactions import router as transactions_router
from app.api.v1.tools import router as tools_router
from app.api.v1.auth import router as auth_router
from app.api.v1.webhooks import router as webhooks_router
from app.api.v1.number_verification import router as number_verification_router

app = FastAPI(
    title="TRUST · Real-time Mobile Network Verification API",
    description=(
        "One API. An AI agent deciding which mobile network signals to pull "
        "under a cost budget to produce fraud verdicts. Built on CAMARA & Nokia Network as Code."
    ),
    version="1.0.0"
)

# Enable CORS for frontend dashboard and playground
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(verify_router)
app.include_router(bindings_router)
app.include_router(transactions_router)
app.include_router(tools_router)
app.include_router(auth_router)
app.include_router(webhooks_router)
app.include_router(number_verification_router)

@app.get("/")
async def health_check():
    return {
        "service": "TRUST Decision Engine",
        "status": "operational",
        "hackathon": "GSMA MENA Ignite 2026",
        "camara_integration": "Nokia Network-as-Code",
        "endpoint": "POST /v1/verify",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
