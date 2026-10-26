import urllib.request
import json
import sys

BASE_URL = 'http://localhost:5000'

def request(method, path, data=None, token=None, expected_status=200):
    url = BASE_URL + path
    headers = {}
    if data is not None:
        headers['Content-Type'] = 'application/json'
    if token:
        headers['Authorization'] = f'Bearer {token}'
    
    body = json.dumps(data).encode('utf-8') if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.getcode()
            content = resp.read().decode('utf-8')
            assert status == expected_status, f"Expected {expected_status}, got {status}"
            parsed = json.loads(content) if 'application/json' in resp.headers.get('Content-Type', '') else content
            print(f"PASS: [{method}] {path} -> {status}")
            return parsed
    except urllib.error.HTTPError as e:
        content = e.read().decode('utf-8')
        if e.code == expected_status:
            print(f"PASS (Expected {e.code}): [{method}] {path} -> {e.code}")
            return json.loads(content) if 'application/json' in e.headers.get('Content-Type', '') else content
        else:
            print(f"FAIL: [{method}] {path} -> {e.code}: {content}")
            raise e

def test_all():
    print("=== TESTING DOCTOR ADMIN LOGIN & AUTH SYSTEM ===")

    # 1. Unauthenticated access to /api/admin/stats should fail with 401
    request("GET", "/api/admin/stats", expected_status=401)

    # 2. Unauthenticated access to GET /api/bookings should fail with 401
    request("GET", "/api/bookings", expected_status=401)

    # 3. Patient booking creation POST /api/bookings must remain PUBLIC
    patient_booking = {
        "patient_name": "Kashif Riaz",
        "patient_phone": "+92 300 1122334",
        "service_type": "Diagnostic Reports & ECG Review",
        "consultation_mode": "In-Person Clinic Visit",
        "booking_date": "2026-10-28",
        "booking_time": "3:30 PM - 4:00 PM",
        "patient_notes": "Needs ECG check"
    }
    b_res = request("POST", "/api/bookings", data=patient_booking, expected_status=201)
    b_id = b_res["data"]["booking_id"]
    print(f"  -> Public patient booking created: {b_id}")

    # 4. Patient inquiry creation POST /api/inquiries must remain PUBLIC
    inq_res = request("POST", "/api/inquiries", data={"name": "Sadia", "phone": "03001234567", "subject": "General Health Query", "message": "Clinic address?"}, expected_status=201)
    print(f"  -> Public patient inquiry created: #{inq_res['data']['id']}")

    # 5. Invalid login attempt
    bad_login = request("POST", "/api/auth/login", data={"username": "admin@drtalha.com", "password": "WrongPassword!"}, expected_status=401)
    assert bad_login["success"] is False

    # 6. Valid login with Email
    login_res = request("POST", "/api/auth/login", data={"username": "admin@drtalha.com", "password": "DoctorTalha@2026"}, expected_status=200)
    assert login_res["success"] is True
    token = login_res["token"]
    print(f"  -> Logged in successfully as: {login_res['admin']['name']}")
    print(f"  -> Received JWT token: {token[:25]}...")

    # 7. Valid login with Username
    login_user_res = request("POST", "/api/auth/login", data={"username": "dr.talha", "password": "DoctorTalha@2026"}, expected_status=200)
    assert login_user_res["success"] is True

    # 8. Verify GET /api/auth/me with Bearer token
    me_res = request("GET", "/api/auth/me", token=token, expected_status=200)
    assert me_res["admin"]["username"] == "dr.talha"

    # 9. Access protected /api/admin/stats with token
    stats_res = request("GET", "/api/admin/stats", token=token, expected_status=200)
    assert stats_res["success"] is True
    print(f"  -> Doctor stats accessed: total bookings = {stats_res['stats']['total_bookings']}")

    # 10. Access protected GET /api/bookings with token
    bookings_res = request("GET", "/api/bookings", token=token, expected_status=200)
    assert bookings_res["success"] is True
    print(f"  -> Doctor bookings list accessed: {bookings_res['count']} records")

    # 11. Update booking status with token
    patch_res = request("PATCH", f"/api/bookings/{b_id}/status", data={"status": "Confirmed"}, token=token, expected_status=200)
    assert patch_res["success"] is True

    # 12. Check Admin Portal HTML serves login view
    admin_html = request("GET", "/admin", expected_status=200)
    assert "loginView" in admin_html
    assert "adminLoginForm" in admin_html
    print("PASS: [GET] /admin -> Serves interactive login screen!")

    print("\nALL DOCTOR ADMIN AUTHENTICATION TESTS PASSED 100%!")

if __name__ == '__main__':
    test_all()
