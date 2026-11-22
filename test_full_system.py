import asyncio
import json
import urllib.request
import urllib.error
import websockets

def test_http_endpoint(name, url, method="GET", data=None):
    try:
        req = urllib.request.Request(url, method=method)
        if data:
            req.add_header("Content-Type", "application/json")
            body = json.dumps(data).encode("utf-8")
        else:
            body = None
        
        with urllib.request.urlopen(req, data=body, timeout=5) as response:
            code = response.getcode()
            content = response.read().decode("utf-8", errors="replace")
            print(f"[PASS] {name} ({method} {url}) -> HTTP {code}")
            return True, content
    except Exception as e:
        print(f"[FAIL] {name} ({method} {url}) -> Error: {e}")
        return False, str(e)

async def test_websocket_pose():
    uri = "ws://127.0.0.1:8000/ws/pose"
    try:
        async with websockets.connect(uri, close_timeout=3) as ws:
            # Send sample 33 landmark pose packet
            landmarks = [{"x": 0.5, "y": 0.5 + i*0.01, "z": 0.0, "visibility": 0.9} for i in range(33)]
            payload = {
                "exercise": "squats",
                "landmarks": landmarks,
                "timestamp": 123456789.0,
                "viewSide": "left",
                "holdDurationSec": 1.0,
                "targetMinFlexionDeg": 35.0,
                "targetMaxFlexionDeg": 45.0
            }
            await ws.send(json.dumps(payload))
            response = await asyncio.wait_for(ws.recv(), timeout=5.0)
            res_data = json.loads(response)
            print(f"[PASS] Backend WebSocket (/ws/pose) -> Received Kinematics Frame: keys={list(res_data.keys())[:6]}")
            return True
    except Exception as e:
        print(f"[FAIL] Backend WebSocket (/ws/pose) -> Error: {e}")
        return False

async def main():
    print("=" * 60)
    print("ATHLETEMIND FULL SYSTEM HEALTH & VERIFICATION AUDIT")
    print("=" * 60)
    
    # 1. Backend REST checks
    print("\n--- 1. Backend REST Endpoints (FastAPI :8000) ---")
    test_http_endpoint("Backend Root", "http://127.0.0.1:8000/")
    test_http_endpoint("Backend Health", "http://127.0.0.1:8000/health")
    test_http_endpoint("Session Summary", "http://127.0.0.1:8000/api/session-summary")
    test_http_endpoint("Leaderboard", "http://127.0.0.1:8000/api/leaderboard")
    test_http_endpoint(
        "Leaderboard Submit",
        "http://127.0.0.1:8000/api/leaderboard/submit",
        method="POST",
        data={
            "operator_name": "AuditBountyHunter",
            "boss_clear_time_sec": 42.5,
            "form_purity_score": 96.0,
            "total_tension_time_sec": 18.0,
        }
    )

    # 2. Backend WebSocket Pose Tracking
    print("\n--- 2. Backend WebSocket Kinematics Stream (:8000/ws/pose) ---")
    await test_websocket_pose()

    # 3. Frontend App Routes (:3000)
    print("\n--- 3. Frontend UI Routes (Next.js :3000) ---")
    routes = [
        ("Care Portal Root Entry", "http://localhost:3000/"),
        ("Bio-Bounty Hunter Arena Hub", "http://localhost:3000/arena"),
        ("Care Role Selection", "http://localhost:3000/care"),
        ("Patient Login", "http://localhost:3000/auth/patient/login"),
        ("Patient Signup", "http://localhost:3000/auth/patient/signup"),
        ("Physiotherapist Login", "http://localhost:3000/auth/therapist/login"),
        ("Physiotherapist Signup", "http://localhost:3000/auth/therapist/signup"),
        ("Patient Today Dashboard", "http://localhost:3000/today"),
        ("My Plan Schedule", "http://localhost:3000/plan"),
        ("Exercise Library", "http://localhost:3000/exercises"),
        ("My Care (Care Team)", "http://localhost:3000/care-team"),
        ("Clinical Messages", "http://localhost:3000/messages"),
        ("Workout Progress & History", "http://localhost:3000/progress"),
        ("Mission Hangar Briefing", "http://localhost:3000/hangar"),
        ("Shared Session Report", "http://localhost:3000/report"),
        ("Physiotherapist Workspace", "http://localhost:3000/therapist/workspace"),
        ("Physiotherapist Plan Editor", "http://localhost:3000/therapist/editor"),
    ]

    for name, url in routes:
        test_http_endpoint(name, url)

    print("\n" + "=" * 60)
    print("AUDIT COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
