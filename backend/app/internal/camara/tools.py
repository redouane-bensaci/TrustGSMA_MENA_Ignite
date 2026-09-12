"""
Nokia Network as Code (NaC) CAMARA API Client Wrappers
Exposes the 7 official GSMA Open Gateway / CAMARA API tools.

Real calls go through Nokia's `network_as_code` SDK (RapidAPI-hosted CAMARA
sandbox). Four signals — SIM Swap, Device Location Verification, Device
Location Retrieval, and KYC Match — have a direct synchronous CAMARA
endpoint and are called live whenever MOCK_CARRIER_MODE=false and an API
key is configured. The other three tools (Number Verification, Device
Reachability, Number Recycling) do not have a simple server-to-server
synchronous equivalent in NaC today:
- Number Verification requires either live cellular data on the caller's
  device (V1) or a full Android Credential Manager / OpenID4VP round trip
  (V2) — neither is reachable from a headless backend.
- Device Reachability is subscription+webhook based (you register a sink
  URL and get async notifications), not a request/response call.
- Number Recycling has no published NaC/CAMARA endpoint at all.
These three stay on the deterministic sandbox simulator below, so the demo
scenarios remain reproducible. Every real call is wrapped so a live-carrier
error surfaces as CamaraUnavailableError -> the agent scores it "uncertain",
never a silent pass — see app.internal.agent for the choke point.
"""
import asyncio
import logging
import math
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.schemas import ToolMetadata
from app.config import settings

logger = logging.getLogger("trust.camara")

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
    "retrieve_location": ToolMetadata(
        id="retrieve_location",
        name="Device Location Retrieval",
        camara_standard="camara:location-retrieval:v1",
        cost_weight=2,
        latency_profile="~380ms",
        description="Retrieves the device's last known network-derived position (centre coordinate plus accuracy radius) directly from the operator, rather than asking yes/no about a declared area.",
        what_it_proves="Establishes where the handset actually is when no coordinate was declared, or when a location verification came back negative and the real distance is what decides the case."
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


class CamaraUnavailableError(Exception):
    """
    Raised when a CAMARA/NaC call errors out, times out, or has no live
    implementation at the carrier. The agent must never treat this as a
    silent pass — see app.internal.verdict.synthesize for how "uncertain"
    signals are scored.
    """
    def __init__(self, tool_id: str, reason: str):
        self.tool_id = tool_id
        self.reason = reason
        super().__init__(f"{tool_id} unavailable: {reason}")


def _to_e164(msisdn: str) -> str:
    """Nokia NaC expects E.164 (+countrycode...). Our internal msisdn strings
    are sometimes stored without the leading '+' — normalize defensively."""
    m = msisdn.strip()
    return m if m.startswith("+") else f"+{m}"


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km between two WGS-84 coordinates. Used to
    turn a retrieved position into the same kind of `delta_km` the
    verification signal reports, so both location tools are readable
    side by side in the merchant UI."""
    r = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return round(2 * r * math.asin(math.sqrt(a)), 2)


class CamaraClient:
    """
    Interface to Nokia Network as Code. Falls back to a built-in mock
    sandbox simulator when MOCK_CARRIER_MODE is set, no API key is
    configured, or a live call raises.

    Nokia's NaC RapidAPI sandbox only recognizes a fixed set of *simulated
    device* MSISDNs — anything else 404s on a live call (there is no real
    subscriber behind our fictional Algerian demo numbers). The mock
    simulator below is deliberately keyed on those same published sandbox
    numbers so demo scenarios behave identically whether MOCK_CARRIER_MODE
    is on or off:
      https://networkascode.nokia.io/_docs/sim-swap/sim-swap
      https://networkascode.nokia.io/_docs/location-verification/location-verification
    +99999991000 -> "anomaly present" (SIM swap occurred / KYC mismatch)
    +99999991001 -> "clean" (no SIM swap / KYC match)
    +999999905xx -> carrier-side error (unavailable/timeout), per Nokia's
                    published HTTP-status sandbox numbers for 500/502/503/504.
    """

    SIM_SWAPPED_NUMBER = "99999991000"
    SIM_CLEAN_NUMBER = "99999991001"
    # A dedicated persona whose *only* anomaly is a declared-name mismatch
    # against the carrier's KYC record — every other signal (device, SIM
    # recency, location, recycling) comes back clean. Used to demonstrate
    # that the same borderline evidence lands on a different decision
    # depending on the merchant's own declared risk_appetite (see
    # app.internal.verdict.synthesize._decision_thresholds), independent of
    # any deterministic override rule.
    KYC_MISMATCH_ONLY_NUMBER = "213555221100"
    # Our own fictional demo personas (legacy Algerian numbers with a
    # hand-authored fixture story) that were never registered as real NaC
    # sandbox devices. Unlike SIM_SWAPPED_NUMBER/SIM_CLEAN_NUMBER above —
    # which ARE real Nokia sandbox devices and are meant to prove the live
    # integration works — a live call for one of these would just 404 and
    # degrade the signal to "uncertain", silently swapping out the
    # deterministic story the scenario is built to tell. So these always
    # use the mock simulator, regardless of MOCK_CARRIER_MODE.
    FORCED_MOCK_PERSONAS = ("770990011", "661448899", KYC_MISMATCH_ONLY_NUMBER)
    # MSISDN substring -> forces every call for that number to raise
    # CamaraUnavailableError, so the "signal unavailable" path stays
    # exercisable and demoable without a live carrier outage. Recognizes
    # both our legacy hackathon trigger and Nokia's published sandbox
    # gateway-timeout number.
    UNAVAILABLE_TRIGGERS = ("999000111", "99999990504")

    def __init__(self, api_key: Optional[str] = None, rapidapi_host: Optional[str] = None):
        self.api_key = api_key or settings.NOKIA_NAC_API_KEY
        self.rapidapi_host = rapidapi_host or settings.NOKIA_NAC_RAPIDAPI_HOST
        self.mock_mode = settings.MOCK_CARRIER_MODE or not self.api_key
        self._sdk_client = None

        if not self.mock_mode:
            try:
                from network_as_code import NetworkAsCodeApi
                self._sdk_client = NetworkAsCodeApi(
                    rapidapi_host=self.rapidapi_host,
                    api_key=self.api_key,
                )
            except Exception as exc:  # SDK missing/misconfigured -> degrade to mock
                logger.warning("NaC SDK unavailable, falling back to mock carrier: %s", exc)
                self.mock_mode = True

    # ------------------------------------------------------------------
    # Mock simulator (deterministic hackathon demo scenarios)
    # ------------------------------------------------------------------
    def _maybe_fail(self, tool_id: str, msisdn: str) -> None:
        if any(trigger in msisdn for trigger in self.UNAVAILABLE_TRIGGERS):
            raise CamaraUnavailableError(tool_id, "carrier_timeout")

    def _use_mock_for(self, msisdn: str) -> bool:
        """True if this call should go through the mock simulator even when
        MOCK_CARRIER_MODE is off — either because the client is in mock
        mode globally, or because this MSISDN is one of our own fictional
        demo personas with no corresponding real NaC sandbox device."""
        return self.mock_mode or any(p in msisdn for p in self.FORCED_MOCK_PERSONAS)

    async def _mock_verify_number(self, msisdn: str) -> Dict[str, Any]:
        self._maybe_fail("verify_number", msisdn)
        if "770990011" in msisdn:
            return {"verified": False, "reason": "no_active_authentication_context", "carrier": "Djezzy"}
        return {"verified": True, "carrier": "Mobilis", "attestation_level": 0.99}

    async def _mock_get_device_status(self, msisdn: str) -> Dict[str, Any]:
        self._maybe_fail("get_device_status", msisdn)
        if "770990011" in msisdn:
            return {"reachable": False, "roaming": False, "last_seen": "> 30 days"}
        return {"reachable": True, "roaming": False, "last_seen": "active_now"}

    async def _mock_check_sim_swap(self, msisdn: str, max_age_hours: int = 168) -> Dict[str, Any]:
        self._maybe_fail("check_sim_swap", msisdn)
        if "661448899" in msisdn or self.SIM_SWAPPED_NUMBER in msisdn:
            return {
                "swapped": True,
                "latest_swap_at": "14 hours ago",
                "swap_hours": 14,
                "port_out": True,
                "new_imei": True,
                "carrier_ticket": "PO-88134"
            }
        return {"swapped": False, "latest_swap_at": None, "swap_hours": None}

    async def _mock_verify_location(self, msisdn: str, declared_cell: str) -> Dict[str, Any]:
        self._maybe_fail("verify_location", msisdn)
        if ("661448899" in msisdn or self.SIM_SWAPPED_NUMBER in msisdn) and declared_cell == "31-ORN":
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

    async def _mock_retrieve_location(self, msisdn: str, max_age_seconds: int = 3600) -> Dict[str, Any]:
        """
        Location *retrieval* answers "where is this handset", not "is it
        inside the area the customer declared" — so the mock returns a
        concrete coordinate plus the operator's accuracy radius, and lets
        the caller compute the distance itself. Coordinates are the real
        centres of the cells our demo personas are written around, so the
        km deltas the agent reports stay believable on stage.
        """
        self._maybe_fail("retrieve_location", msisdn)
        if "661448899" in msisdn or self.SIM_SWAPPED_NUMBER in msisdn:
            # Handset is sitting in Algiers while the transaction claims Oran.
            return {
                "latitude": 36.7538,
                "longitude": 3.0588,
                "accuracy_m": 2000,
                "serving_cell": "16-ALG",
                "last_located_at": "4 minutes ago",
                "age_seconds": 240,
            }
        if "770990011" in msisdn:
            # Dead/recycled line — the operator has no recent fix at all.
            return {
                "latitude": None,
                "longitude": None,
                "accuracy_m": None,
                "serving_cell": None,
                "last_located_at": "> 30 days",
                "age_seconds": None,
                "stale": True,
            }
        return {
            "latitude": 36.7372,
            "longitude": 3.0865,
            "accuracy_m": 1200,
            "serving_cell": "16-ALG",
            "last_located_at": "1 minute ago",
            "age_seconds": 60,
        }

    async def _mock_kyc_match(self, msisdn: str, declared_name: str) -> Dict[str, Any]:
        self._maybe_fail("kyc_match", msisdn)
        if "770990011" in msisdn or self.SIM_SWAPPED_NUMBER in msisdn or self.KYC_MISMATCH_ONLY_NUMBER in msisdn:
            return {"match_score": 0.12, "name_match": False, "id_match": False}
        return {"match_score": 0.96, "name_match": True, "status": "verified_contract"}

    async def _mock_check_number_recycling(self, msisdn: str, days: int = 180) -> Dict[str, Any]:
        self._maybe_fail("check_number_recycling", msisdn)
        if "770990011" in msisdn:
            return {"recycled": True, "recycled_date": "94 days ago"}
        return {"recycled": False, "recycled_date": None}

    # ------------------------------------------------------------------
    # Public tool surface — real NaC call when available, mock otherwise
    # ------------------------------------------------------------------
    async def verify_number(self, msisdn: str) -> Dict[str, Any]:
        # Number Verification needs the end-user's own device to complete a
        # 3-legged OAuth consent flow (see number_verification_flow.py) —
        # it cannot happen synchronously inside this call. If a merchant
        # already drove that flow for this number recently, reuse the real,
        # live-verified result; otherwise fall back to the sandbox
        # simulator so undemoed numbers still behave deterministically.
        if not self.mock_mode:
            from app.internal.camara.number_verification_flow import get_cached_verification
            cached = get_cached_verification(msisdn)
            if cached is not None:
                return {
                    "verified": cached["verified"],
                    "source": "live_oauth_consent",
                    "verified_at": cached["verified_at"],
                }
        return await self._mock_verify_number(msisdn)

    async def get_device_status(self, msisdn: str) -> Dict[str, Any]:
        # Reachability is subscription+webhook based in NaC, not a
        # synchronous call — always the sandbox simulator for now.
        return await self._mock_get_device_status(msisdn)

    async def check_sim_swap(self, msisdn: str, max_age_hours: int = 168) -> Dict[str, Any]:
        if self._use_mock_for(msisdn):
            return await self._mock_check_sim_swap(msisdn, max_age_hours)
        try:
            phone = _to_e164(msisdn)
            result = await asyncio.to_thread(
                self._sdk_client.sim_swap.check, phone_number=phone, max_age=max_age_hours
            )
            swapped = bool(getattr(result, "swapped", False))
            details: Dict[str, Any] = {"swapped": swapped, "swap_hours": None, "latest_swap_at": None}
            if swapped:
                try:
                    date_result = await asyncio.to_thread(
                        self._sdk_client.sim_swap.retrieve_date, phone_number=phone
                    )
                    latest = getattr(date_result, "latest_sim_change", None)
                    if latest is not None:
                        delta_hours = (datetime.now(timezone.utc) - latest).total_seconds() / 3600
                        details["swap_hours"] = round(delta_hours, 1)
                        details["latest_swap_at"] = latest.isoformat()
                except Exception as exc:
                    logger.warning("sim_swap.retrieve_date failed: %s", exc)
            return details
        except Exception as exc:
            raise CamaraUnavailableError("check_sim_swap", str(exc))

    async def verify_location(
        self,
        msisdn: str,
        declared_cell: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        radius_m: int = 5000,
    ) -> Dict[str, Any]:
        # location.verify_v1 needs a lat/lon circle, not a cell code — only
        # attempt the live call when the caller supplied coordinates.
        if self.mock_mode or latitude is None or longitude is None:
            return await self._mock_verify_location(msisdn, declared_cell)
        try:
            phone = _to_e164(msisdn)
            result = await asyncio.to_thread(
                self._sdk_client.location.verify_v1,
                device={"phone_number": phone},
                area={
                    "area_type": "CIRCLE",
                    "center": {"latitude": latitude, "longitude": longitude},
                    "radius": radius_m,
                },
            )
            verification = getattr(result, "verification_result", "UNKNOWN")
            return {
                "match": verification == "TRUE",
                "verification_result": verification,
                "match_rate": getattr(result, "match_rate", None),
                "serving_cell": declared_cell,
                "travel_plausible": verification in ("TRUE", "PARTIAL"),
            }
        except Exception as exc:
            raise CamaraUnavailableError("verify_location", str(exc))

    async def retrieve_location(
        self,
        msisdn: str,
        declared_latitude: Optional[float] = None,
        declared_longitude: Optional[float] = None,
        max_age_seconds: int = 3600,
    ) -> Dict[str, Any]:
        """
        CAMARA Location Retrieval — asks the operator where the handset
        actually is, instead of asking whether it is inside a declared
        area (that is `verify_location`). Worth its 2 units precisely when
        verification cannot answer: no coordinate was declared, or
        verification came back negative and the *size* of the discrepancy
        is what decides between a customer one street over and a handset
        in another wilaya.

        When declared coordinates are supplied the great-circle distance is
        returned as `delta_km` alongside the raw position, so the same
        field the verification signal reports stays comparable. A position
        older than `max_age_seconds`, or no position at all, is reported
        with `stale: True` rather than passed off as a current fix.
        """
        if self._use_mock_for(msisdn):
            details = await self._mock_retrieve_location(msisdn, max_age_seconds)
        else:
            try:
                phone = _to_e164(msisdn)
                result = await asyncio.to_thread(
                    self._sdk_client.location.get_location,
                    device={"phone_number": phone},
                    max_age=max_age_seconds,
                )
                area = getattr(result, "area", None) or getattr(result, "location", None)
                center = getattr(area, "center", None)
                latitude = getattr(center, "latitude", None) if center else None
                longitude = getattr(center, "longitude", None) if center else None
                radius = getattr(area, "radius", None)
                located_at = getattr(result, "last_location_time", None)
                age_seconds = None
                if located_at is not None:
                    try:
                        age_seconds = round(
                            (datetime.now(timezone.utc) - located_at).total_seconds()
                        )
                    except TypeError:
                        age_seconds = None
                details = {
                    "latitude": latitude,
                    "longitude": longitude,
                    "accuracy_m": radius,
                    "serving_cell": None,
                    "last_located_at": located_at.isoformat() if hasattr(located_at, "isoformat") else located_at,
                    "age_seconds": age_seconds,
                }
            except Exception as exc:
                raise CamaraUnavailableError("retrieve_location", str(exc))

        lat, lon = details.get("latitude"), details.get("longitude")
        age = details.get("age_seconds")
        # No fix at all, or a fix too old to speak to *this* transaction,
        # is reported as stale — the agent must not read it as a match.
        details["stale"] = bool(
            details.get("stale") or lat is None or lon is None
            or (age is not None and age > max_age_seconds)
        )
        if (
            not details["stale"]
            and declared_latitude is not None
            and declared_longitude is not None
        ):
            delta = haversine_km(lat, lon, declared_latitude, declared_longitude)
            details["delta_km"] = delta
            # Inside the operator's own accuracy radius counts as proximate —
            # anything beyond that plus a 5 km tolerance is a real gap.
            tolerance_km = 5.0 + ((details.get("accuracy_m") or 0) / 1000.0)
            details["within_declared_area"] = delta <= tolerance_km
        return details

    async def kyc_match(self, msisdn: str, declared_name: str) -> Dict[str, Any]:
        if self._use_mock_for(msisdn):
            return await self._mock_kyc_match(msisdn, declared_name)
        try:
            phone = _to_e164(msisdn)
            result = await asyncio.to_thread(
                self._sdk_client.kyc.match, phone_number=phone, name=declared_name
            )
            score_pct = getattr(result, "name_match_score", None)
            match_score = (score_pct / 100.0) if score_pct is not None else (
                1.0 if getattr(result, "name_match", False) else 0.0
            )
            return {
                "match_score": match_score,
                "name_match": getattr(result, "name_match", None),
                "status": "verified_contract",
            }
        except Exception as exc:
            raise CamaraUnavailableError("kyc_match", str(exc))

    async def check_number_recycling(self, msisdn: str, days: int = 180) -> Dict[str, Any]:
        # No published NaC/CAMARA number-recycling endpoint — sandbox only.
        return await self._mock_check_number_recycling(msisdn, days)
