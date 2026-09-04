"""
GET /v1/tools - Read-only public tool registry
"""
from typing import List
from fastapi import APIRouter
from app.schemas import ToolMetadata
from app.internal.camara.tools import TOOL_REGISTRY

router = APIRouter(prefix="/v1/tools", tags=["Tool Registry"])

@router.get("", response_model=List[ToolMetadata])
async def list_registered_tools():
    """
    Returns the declarative CAMARA tool registry exposed by the Nokia Network as Code integration.
    """
    return list(TOOL_REGISTRY.values())
