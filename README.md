# Clinical Practice & Telehealth Backend

### Dr. Muhammad Talha Hassan Shah, MBBS
**Node.js + Express.js Backend with PostgreSQL Database & Secure Admin Login System**

---

## 🌟 Project Overview

This project provides a robust, production-grade **Node.js + Express.js** backend connected to a **PostgreSQL** database for **Dr. Muhammad Talha Hassan Shah's** Clinical Practice and Telehealth platform, featuring a complete **JWT-based Doctor Admin Authentication System**.

### Key Highlights
- **Frontend Unmodified (100% Intact)**: The user's provided `Index.html` remains **100% untouched on disk** (exact byte count and timestamp preserved).
- **Dynamic API Bridge**: When served via Express (`http://localhost:5000/`), the server streams the original `Index.html` with an unobtrusive runtime connector (`/js/api-bridge.js`) injected into the response stream before `</body>`.
- **Doctor Admin Login System**: Secure authentication for Dr. Talha and clinic staff using **bcrypt password hashing** and **JWT (JSON Web Tokens)**.
- **Doctor Admin Portal**: A dedicated dashboard at `/admin` featuring a sign-in screen, appointment management, direct WhatsApp links, inquiry management, and CSV export.
- **Public vs. Protected Route Segregation**:
  - **Public**: Patient appointment bookings (`POST /api/bookings`) and contact inquiries (`POST /api/inquiries`) remain open for patient website visitors.
  - **Protected (Bearer Token)**: Patient medical details, appointment listings, status changes, cancellations, and practice statistics require doctor login.

---

## 🔐 Doctor Admin Credentials

The database automatically seeds the default Doctor/Admin account on startup:

- **Email**: `admin@drtalha.com`
- **Username**: `dr.talha`
- **Password**: `DoctorTalha@2026`
- **Role**: `doctor_admin`

*(Configurable via `.env`)*

---

## 🛠️ Tech Stack

- **Runtime & Server**: Node.js (v20+) & Express.js (v4.21+)
- **Database**: PostgreSQL (v18+) with `pg` connection pooling
- **Authentication**: `jsonwebtoken` (JWT) & `bcryptjs`
- **Security & Logging**: `cors`, `morgan`, `dotenv`
- **Frontend Integration**: Zero-modification runtime bridge (`/js/api-bridge.js`)

---

## 📂 Project Structure

```
d:\Doctor Talha\
├── Index.html                  # Original frontend (100% UNTOUCHED on disk)
├── server.js                   # Main Express application entry point
├── package.json                # Project dependencies & npm scripts
├── .env                        # Environment variables (Database credentials, JWT secret)
├── .env.example                # Example configuration template
│
├── config/
│   └── db.js                   # PostgreSQL connection pool, schema & admin seeder
│
├── controllers/
│   ├── authController.js       # Admin login, session verification & password management
│   ├── bookingController.js    # Appointment CRUD, code generation (THS-XXXXXX) & validation
│   ├── inquiryController.js    # Contact form inquiry CRUD & status updates
│   ├── serviceController.js    # Clinical services & slot availability checking
│   └── adminController.js      # Practice health stats & dashboard metrics
│
├── routes/
│   ├── authRoutes.js           # /api/auth endpoints (login, me, change-password)
│   ├── bookingRoutes.js        # /api/bookings (POST public, GET/PATCH/DELETE protected)
│   ├── inquiryRoutes.js        # /api/inquiries (POST public, GET/PATCH/DELETE protected)
│   ├── serviceRoutes.js        # /api/services & /api/slots (public)
│   └── adminRoutes.js          # /api/admin/stats (protected)
│
├── middleware/
│   ├── authMiddleware.js       # JWT Bearer token verification
│   └── errorHandler.js         # Centralized error handler & 404 response
│
├── public/
│   ├── js/
│   │   └── api-bridge.js       # Client bridge connecting Index.html forms to backend
│   └── admin/
│       └── index.html          # Doctor Admin Portal (Login Screen + Full Dashboard)
│
└── scripts/
    ├── seed.js                 # Database schema initialization & sample data seeding
    ├── test_backend.py         # End-to-end integration test suite
    └── test_auth.py            # End-to-end authentication & security test suite
```

---

## 🗄️ Database Architecture (PostgreSQL)

The database `doctor_talha_db` contains:

1. **`admins`**: Stores doctor/admin accounts with `name`, `username`, `email`, `password_hash`, `role`, and `last_login`.
2. **`bookings`**: Stores appointment records with `booking_id` (`THS-XXXXXX`), `patient_name`, `patient_phone`, `service_type`, `consultation_mode`, `booking_date`, `booking_time`, `patient_notes`, and `status`.
3. **`inquiries`**: Stores patient messages from the contact form with `name`, `phone`, `subject`, `message`, and `status`.
4. **`services`**: Stores consultation services catalog and fee schedule in PKR.
5. **`time_slots`**: Stores standard clinical slots.

---

## 📡 Authentication & REST API Reference

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/login`: Accepts `username` (email or username) and `password`. Returns `{ success: true, token, admin }`.
- `GET /api/auth/me`: Verifies active session token (Requires `Bearer <token>`).
- `POST /api/auth/change-password`: Update doctor password (Requires `Bearer <token>`).

### 📅 Appointments (`/api/bookings`)
- `POST /api/bookings`: **Public** — Patients reserve slots from the website.
- `GET /api/bookings`: **Protected** — Doctor lists appointments with filters (`search`, `status`, `date`, `mode`).
- `GET /api/bookings/:id`: **Protected** — View booking details.
- `PATCH /api/bookings/:id/status`: **Protected** — Update status (`Confirmed`, `Completed`, `Cancelled`, `Pending`).
- `DELETE /api/bookings/:id`: **Protected** — Delete appointment.

### ✉️ Contact Inquiries (`/api/inquiries`)
- `POST /api/inquiries`: **Public** — Patients submit questions.
- `GET /api/inquiries`: **Protected** — Doctor reviews messages.
- `PATCH /api/inquiries/:id/status`: **Protected** — Mark as `Read` or `Replied`.
- `DELETE /api/inquiries/:id`: **Protected** — Remove inquiry.

### 🩺 Doctor Practice Analytics (`/api/admin/stats`)
- `GET /api/admin/stats`: **Protected** — Total bookings, today's schedule, in-clinic vs telehealth stats, unread inquiries.

---

## 🧪 Testing & Verification

Run the authentication security test suite:
```bash
python scripts/test_auth.py
```
This tests:
- 401 unauthorized rejection on protected routes
- Public access preservation for patient booking and inquiry forms
- Invalid credential rejection
- Valid login with email and username
- JWT token issuance and verification
- Authenticated appointment status modification
- Admin login portal UI rendering
