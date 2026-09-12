"""
Scenario regression harness.

Runs every file in `scenarios/` through the real decision engine in-process
(no server needed) and checks the verdict against the scenario's own
`expected_verdict` / `expected_units`. Exits non-zero on any mismatch, so
it doubles as a pre-submission smoke test:

    cd backend && python verify_scenarios.py

Runs against the deterministic mock carrier, so results are reproducible
without Nokia NaC credentials.
"""
import glob
import json
import os
import sys

os.environ.setdefault("MOCK_CARRIER_MODE", "true")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

SCENARIO_DIR = os.path.join(os.path.dirname(__file__), "..", "scenarios")


def main() -> int:
    client = TestClient(app)
    failures = []

    for path in sorted(glob.glob(os.path.join(SCENARIO_DIR, "*.json"))):
        with open(path, encoding="utf-8") as fh:
            scenario = json.load(fh)

        request = dict(scenario["request"])
        # `business_binding_id` sits beside `request` in the scenario files,
        # but the API expects it inside the event body.
        if scenario.get("business_binding_id"):
            request["business_binding_id"] = scenario["business_binding_id"]

        response = client.post("/v1/verify", json=request)
        if response.status_code != 200:
            failures.append(f"{scenario['scenario_id']}: HTTP {response.status_code} {response.text[:120]}")
            print(f"FAIL {scenario['scenario_id']}: HTTP {response.status_code}")
            continue

        verdict = response.json()["verdict"]
        expected = scenario["expected_verdict"]
        actual = verdict["decision"]
        units = verdict["cost_units_spent"]
        ok = actual == expected and units == scenario["expected_units"]
        if not ok:
            failures.append(
                f"{scenario['scenario_id']}: expected {expected}/{scenario['expected_units']}u, "
                f"got {actual}/{units}u"
            )

        print(
            f"{'PASS' if ok else 'FAIL'} {scenario['scenario_id']:12} "
            f"{actual:8} score={verdict['score']:3} "
            f"units={units}/{verdict['budget_allocated']} "
            f"signals={len(verdict['signals'])} "
            f"rule={verdict['override_rule_fired'] or '-'}"
        )

    print()
    if failures:
        print(f"{len(failures)} scenario(s) did not match:")
        for f in failures:
            print("  -", f)
        return 1
    print("All scenarios match their expected verdicts.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
