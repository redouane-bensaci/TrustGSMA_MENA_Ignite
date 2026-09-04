"""
Nokia Network as Code (NaC) CAMARA API Client Wrappers
Exposes the 6 official GSMA Open Gateway / CAMARA API tools with mock sandbox fallback.
"""
from typing import Dict, Any
from app.schemas import SignalResult, ToolMetadata

TOOL_REGISTRY: Dict[str, ToolMetadata] = {
    "verify_number": ToolMetadata(
        id="verify_number",
        name="Number Verification",
        camara_standard="camara:number-verification:v1",
        cost_weight=1,
        latency_profile="~180ms",
        description="Verifies that the MSISDN is currently associated with an active, authenticated cellular session.",
        what_it_proves="Proves the mobile session matches the claimed carrier subscription without OTP interception vulnerability."
    ),
    "get_device_status": ToolMetadata(
        id="get_device_status",
        name="Device Status & Roaming",
        camara_standard="camara:device-status:v1",
        cost_weight=1,
        latency_profile="~150ms",
        description="Checks device connectivity, reachable status, and network roaming flag directly from operator HLR/VLR.",
        what_it_proves="Proves a physical handset is alive and registered on the cellular grid, detecting dead SIMs and emulator farms."
    ),
    "check_sim_swap": ToolMetadata(
        id="check_sim_swap",
        name="SIM Swap Recency Probe",
        camara_standard="camara:sim-swap:v1",
        cost_weight=2,
        latency_profile="~260ms",
        description="Inspects operator timestamp of the most recent IMSI/ICCID update for this phone number.",
        what_it_proves="Detects account takeover windows where a thief has hijacked a subscriber's number to intercept security alerts."
    ),
    "verify_location": ToolMetadata(
        id="verify_location",
        name="Device Location Verification",
        camara_standard="camara:device-location:v1",
        cost_weight=1,
        latency_profile="~220ms",
        description="Compares the device's live serving cell tower or network geolocation with a declared transaction coordinate.",
        what_it_proves="Verifies the physical device is in proximity to the delivery or withdrawal location, catching spoofed VPN coordinates."
    ),
    "kyc_match": ToolMetadata(
        id="kyc_match",
        name="Carrier KYC Match",
        camara_standard="camara:kyc-match:v1",
        cost_weight=2,
        latency_profile="~340ms",
        description="Fuzzy matches declared name, national ID, or birth date against the SIM owner's verified telecom contract.",
        what_it_proves="Provides independent verification of legal identity directly from telecom regulatory filing records."
    ),
    "check_number_recycling": ToolMetadata(
        id="check_number_recycling",
        name="Number Recycling Check",
        camara_standard="camara:number-recycling:v1",
        cost_weight=1,
        latency_profile="~200ms",
        description="Queries whether the mobile number was deactivated and re-assigned to a new subscriber within a given period.",
        what_it_proves="Identifies orphaned numbers that receive legacy SMS authentication alerts intended for previous account owners."
    )
}

class CamaraClient:
    """Interface to Nokia Network as Code sandbox with built-in scenario simulation."""
    
    def __init__(self, api_key: str = "mock_key", base_url: str = "https://mock.nac.nokia.com"):
        self.api_key = api_key
        self.base_url = base_url

    async def verify_number(self, msisdn: str) -> Dict[str, Any]:
        # Malicious number in scenario C has no active auth context
        if "770990011" in msisdn:
            return {"verified": False, "reason": "no_active_authentication_context", "carrier": "Djezzy"}
        return {"verified": True, "carrier": "Mobilis", "attestation_level": 0.99}

    async def get_device_status(self, msisdn: str) -> Dict[str, Any]:
        if "770990011" in msisdn:
            return {"reachable": False, "roaming": False, "last_seen": "> 30 days"}
        return {"reachable": True, "roaming": False, "last_seen": "active_now"}

    async def check_sim_swap(self, msisdn: str, max_age_hours: int = 168) -> Dict[str, Any]:
        # Scenario B: SIM swapped 6-14h ago
        if "661448899" in msisdn:
            return {
                "swapped": True,
                "latest_swap_at": "14 hours ago",
                "swap_hours": 14,
                "port_out": True,
                "new_imei": True,
                "carrier_ticket": "PO-88134"
            }
        return {"swapped": False, "latest_swap_at": None, "swap_hours": None}

    async def verify_location(self, msisdn: str, declared_cell: str) -> Dict[str, Any]:
        # Scenario B: User declared Oran (31-ORN) while SIM is 412 km away in Algiers (16-ALG)
        if "661448899" in msisdn and declared_cell == "31-ORN":
            return {
                "match": False,
                "serving_cell": "16-ALG",
                "declared_cell": "31-ORN",
                "delta_km": 412,
                "travel_plausible": False
            }
        return {
            "match": True,
            "serving_cell": declared_cell or "16-ALG",
            "delta_km": 0.8,
            "travel_plausible": True
        }

    async def kyc_match(self, msisdn: str, declared_name: str) -> Dict[str, Any]:
        if "770990011" in msisdn:
            return {"match_score": 0.12, "name_match": False, "id_match": False}
        return {"match_score": 0.96, "name_match": True, "status": "verified_contract"}

    async def check_number_recycling(self, msisdn: str, days: int = 180) -> Dict[str, Any]:
        if "770990011" in msisdn:
            return {"recycled": True, "recycled_date": "94 days ago"}
        return {"recycled": False, "recycled_date": None}
