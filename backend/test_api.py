"""
Comprehensive API, WebSocket, Saturation, and Model Consistency Tests.
"""

import sys
import os
import numpy as np
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(__file__))
from main import app

client = TestClient(app)


def test_all():
    # 1. Health
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

    # 2. Consolidated analysis
    r = client.post("/api/analysis/all", json={
        "measured_states": ["x", "theta"],
        "desired_poles": [
            {"real": -2.0, "imag": 0.0},
            {"real": -2.0, "imag": 0.0},
            {"real": -1.0, "imag": 1.0},
            {"real": -1.0, "imag": -1.0},
        ],
    })
    assert r.status_code == 200
    data = r.json()
    assert data["controllability"]["rank"] == 4
    assert data["ackermann"]["is_verified"] is True
    assert data["ackermann"]["scipy_ackermann_max_diff"] < 1e-4
    assert data["stability"]["is_stable"] is False
    assert data["closed_loop_stability"]["is_stable"] is True

    # 3. Configurable output matrix C
    r = client.get("/api/stage2/linearization?measured=x,x_dot,theta,theta_dot")
    assert r.status_code == 200
    assert len(r.json()["C"]) == 4

    # 4. Small angle analysis
    r = client.get("/api/stage2/small-angle?theta_deg=15")
    assert r.status_code == 200
    assert r.json()["point"]["sin_rel_err_pct"] > 0

    # 5. Linear vs Nonlinear comparison
    r = client.post("/api/stage2/linear-vs-nonlinear", json={
        "initial_state": [0.0, 0.0, float(np.radians(20.0)), 0.0],
        "t_end": 2.0,
        "dt": 0.01,
        "control_enabled": False,
    })
    assert r.status_code == 200
    cmp_data = r.json()
    assert cmp_data["max_theta_error_deg"] > 0.1

    # 6. Invalid complex conjugate poles rejected cleanly
    r = client.post("/api/stage3/ackermann", json={
        "desired_poles": [
            {"real": -2.0, "imag": 0.0},
            {"real": -2.0, "imag": 0.0},
            {"real": -1.0, "imag": 1.0},
            {"real": -1.0, "imag": 0.0},
        ]
    })
    assert r.status_code == 200
    assert r.json()["feasible"] is False
    assert len(r.json()["errors"]) > 0

    # 7. Actuator saturation test
    r = client.post("/api/simulation/run", json={
        "initial_state": [0.0, 0.0, float(np.radians(15.0)), 0.0],
        "t_end": 3.0,
        "dt": 0.01,
        "model_type": "nonlinear",
        "control_enabled": True,
        "saturation_enabled": True,
        "u_min": -1.5,
        "u_max": 1.5,
    })
    assert r.status_code == 200
    sim = r.json()["simulation"]
    assert max(abs(u) for u in sim["u_applied"]) <= 1.5 + 1e-9
    assert any(sim["is_saturated"])

    # 8. Disturbance test (2.5 N for 0.2s recovers cleanly)
    r = client.post("/api/simulation/disturbance-test", json={
        "disturbance_mag": 2.5,
        "disturbance_start": 1.0,
        "disturbance_duration": 0.2,
        "control_enabled": True,
    })
    assert r.status_code == 200
    assert abs(r.json()["disturbed"]["theta_deg"][-1]) < 0.5
    assert max(abs(x) for x in r.json()["disturbed"]["theta_deg"]) > 5.0

    # 9. WebSocket real-time simulation test
    with client.websocket_connect("/ws/simulation") as ws:
        init_snap = ws.receive_json()
        assert init_snap["type"] == "sim_state"
        assert init_snap["status"] == "reset"

        ws.send_json({"cmd": "step"})
        step_snap = ws.receive_json()
        assert step_snap["t"] > 0.0

        ws.send_json({"cmd": "apply_manual_force", "force": 5.0})
        force_snap = ws.receive_json()
        assert abs(force_snap["telemetry"]["u_external"] - 5.0) < 1e-6

        ws.send_json({"cmd": "release_manual_force"})
        rel_snap = ws.receive_json()
        assert abs(rel_snap["telemetry"]["u_external"]) < 1e-6

    print("[OK] All REST API & WebSocket tests passed!")


if __name__ == "__main__":
    test_all()
