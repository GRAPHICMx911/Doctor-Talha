import urllib.request
import json
import sys

BASE_URL = 'http://localhost:5000'

def test_endpoint(name, method, path, data=None, token=None, expected_status=200):
    url = BASE_URL + path
    headers = {'Content-Type': 'application/json'} if data else {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    body = json.dumps(data).encode('utf-8') if data else None
    
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            status = response.getcode()
            content = response.read().decode('utf-8')
            assert status == expected_status, f"Expected {expected_status}, got {status}"
            parsed = json.loads(content) if 'application/json' in response.headers.get('Content-Type', '') else content
            print(f"PASS: [{method}] {path} -> {status}")
            return parsed
    except urllib.error.HTTPError as e:
        content = e.read().decode('utf-8')
        if e.code == expected_status:
            print(f"PASS (Expected HTTP Error): [{method}] {path} -> {e.code}")
            return json.loads(content) if 'application/json' in e.headers.get('Content-Type', '') else content
        else:
            print(f"FAIL: [{method}] {path} -> {e.code}: {content}")
            raise e

def run_tests():
    print("=== STARTING BACKEND & POSTGRESQL ENDPOINT TESTS ===")

    # 1. Health check
    h = test_endpoint("Health Check", "GET", "/api/health")
    assert h.get("status") == "healthy"

    # 2. Get Services
    services = test_endpoint("Get Services", "GET", "/api/services")
    assert services.get("success") is True
    print(f"  -> Total active services: {len(services.get('data', []))}")

    # 3. Get Slots
    slots = test_endpoint("Get Slots", "GET", "/api/slots?date=2026-10-26")
    assert slots.get("success") is True
    print(f"  -> Total active slots: {len(slots.get('data', []))}")

    # 4. Authenticate Doctor Admin to get JWT token
    login_res = test_endpoint("Login Doctor Admin", "POST", "/api/auth/login", {"username": "admin@drtalha.com", "password": "DoctorTalha@2026"})
    token = login_res["token"]

    # 5. Get Admin Stats (with token)
    stats = test_endpoint("Get Stats", "GET", "/api/admin/stats", token=token)
    assert stats.get("success") is True
    print(f"  -> Total bookings in DB: {stats['stats']['total_bookings']}")
    print(f"  -> Total inquiries in DB: {stats['stats']['total_inquiries']}")

    # 6. Create Booking (Public)
    new_booking_payload = {
        "patient_name": "Hamza Abbasi",
        "patient_phone": "+92 300 9876543",
        "service_type": "Hypertension & Diabetes Care",
        "consultation_mode": "In-Person Clinic Visit",
        "booking_date": "2026-10-27",
        "booking_time": "7:30 PM - 8:00 PM",
        "patient_notes": "Needs blood pressure check and lifestyle discussion."
    }
    created_booking = test_endpoint("Create Booking", "POST", "/api/bookings", new_booking_payload, expected_status=201)
    assert created_booking.get("success") is True
    booking_data = created_booking["data"]
    b_id = booking_data["booking_id"]
    print(f"  -> Successfully created booking: {b_id}")

    # 7. Fetch Booking By ID (Protected)
    fetched_b = test_endpoint("Get Booking By ID", "GET", f"/api/bookings/{b_id}", token=token)
    assert fetched_b.get("success") is True
    assert fetched_b["data"]["patient_name"] == "Hamza Abbasi"

    # 8. Update Booking Status (Protected)
    updated_b = test_endpoint("Update Booking Status", "PATCH", f"/api/bookings/{b_id}/status", {"status": "Completed"}, token=token)
    assert updated_b.get("success") is True
    assert updated_b["data"]["status"] == "Completed"
    print(f"  -> Status updated to {updated_b['data']['status']}")

    # 9. Create Inquiry (Public)
    new_inquiry_payload = {
        "name": "Mariam Qureshi",
        "phone": "+92 313 4561230",
        "subject": "Telemedicine Guidance",
        "message": "Can I consult via video call from Karachi?"
    }
    created_inq = test_endpoint("Create Inquiry", "POST", "/api/inquiries", new_inquiry_payload, expected_status=201)
    assert created_inq.get("success") is True
    inq_id = created_inq["data"]["id"]
    print(f"  -> Created inquiry #{inq_id}")

    # 10. Update Inquiry Status (Protected)
    updated_inq = test_endpoint("Update Inquiry Status", "PATCH", f"/api/inquiries/{inq_id}/status", {"status": "Replied"}, token=token)
    assert updated_inq.get("success") is True

    # 11. Test Frontend Serving
    req = urllib.request.Request(f"{BASE_URL}/")
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8')
        assert "Dr. Muhammad Talha Hassan Shah" in html
        assert "/js/api-bridge.js" in html
        print("PASS: [GET] / -> Index.html served with api-bridge.js injected!")

    # 12. Test Admin Dashboard Serving
    req_admin = urllib.request.Request(f"{BASE_URL}/admin")
    with urllib.request.urlopen(req_admin) as resp:
        admin_html = resp.read().decode('utf-8')
        assert "Doctor Admin Portal" in admin_html or "Doctor Portal" in admin_html
        print("PASS: [GET] /admin -> Doctor Portal served successfully!")

    print("\nALL BACKEND AND DATABASE INTEGRATION TESTS PASSED 100%!")

if __name__ == '__main__':
    run_tests()
