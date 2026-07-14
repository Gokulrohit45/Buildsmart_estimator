# BuildSmart 360 — Security Checklist Applicability Report

This report provides a comprehensive analysis of the **Security_Checklist.csv** file against the **BuildSmart 360** application (React frontend, Flask backend, Supabase DB). It identifies what is already implemented, what is applicable but needs implementation, and what is not applicable to our system.

---

## 1. Summary of Application Context
BuildSmart 360 is an **AI-powered construction cost estimation platform** for builders. 
* **Data Scoping:** Users (Builders) view and manage their own projects and estimates. Admins manage system settings, material rates, and builder accounts.
* **Sensitive Data:** Personal Identifiable Information (PII) is limited to Name, Mobile, Email, and Company Name.
* **No Financial Transactions:** The application estimates costs but does not process payments or manage digital wallets (No MPIN, Wallet transfers, or direct card processing).

---

## 2. Applicable vs. Not Applicable Analysis

### 🔐 Authentication
* **Applicable & Implemented:**
  * Server-side authentication decisions (validation of JWT tokens sent by client).
  * Email verification enforcement (handled via Supabase Auth configuration).
  * Server-side OTP validation (handled via Supabase authentication endpoint).
  * Direct logout redirect (frontend clears token and redirects to `/login`).
* **Applicable but Needs Implementation / Configuration:**
  * **Password Rules:** Enforcing a minimum length of 12 characters and complexity requirements during sign-up/password change.
  * **Password Strength Meter:** Adding a visual indicator during sign-up.
  * **Password Resets:** Ensuring reset links expire within 1 hour.
  * **Masked Password Toggle:** Adding a "show/hide" password eye icon on the login and sign-up pages.
* **Not Applicable:**
  * **Biometric Auth:** The app is a web application and does not utilize native face/fingerprint biometric API unlocks.
  * **Multi-Factor Auth (MFA):** Since the app does not hold financial/sensitive transaction tools, MFA is not strictly required.

### ⏱️ Session Management
* **Applicable & Implemented:**
  * Session token not exposed in URL parameters (JWT token is stored in browser `localStorage` and sent via `Authorization: Bearer` header).
  * Cryptographic session generation (JWT generated securely by Supabase Auth).
  * Digital signature validation (JWT verified server-side on each Flask request).
* **Applicable but Needs Implementation / Configuration:**
  * **Short-lived access tokens:** Restricting access token lifetime to 1 hour and using refresh token rotation.
  * **Inactivity Timeout:** Implementing a frontend timer that logs builders out after 30 minutes of inactivity.

### 🛡️ Access Control & API Security
* **Applicable & Implemented:**
  * **Server-side Access Enforcement:** Flask backend routes verify JWT tokens.
  * **Opaque Resource Ownership (IDOR/BOLA Prevention):**
    * The database schema defines `builder_id uuid references public.profiles(id) on delete cascade`.
    * RLS (Row Level Security) is enabled on all tables in Supabase (`projects`, `estimates`), ensuring users can only read/write their own records:
      ```sql
      create policy "Builders can view their own projects" on public.projects
      for select using (auth.uid() = builder_id);
      ```
  * **Broken Function Level Authorization Prevention:** Admin routes verify the user's role is `admin` via `is_admin(request)` before executing.
* **Applicable but Needs Implementation / Configuration:**
  * **Rate Limiting:** Implementing rate limits on the Flask backend (e.g. `Flask-Limiter`) to prevent brute-force attacks on login, registration, and estimate generation endpoints.

### 🧹 Validation, Sanitization, and Encoding
* **Applicable & Implemented:**
  * **No SQL Injection:** All database queries utilize the Supabase Client SDK, which internally uses parameterized queries.
  * **Structured Input Validation:** Wizard inputs (Plot area, floor details) are parsed using `parseFloat()` or `parseInt()` and validated to be positive non-zero numbers before processing.
* **Applicable but Needs Implementation / Configuration:**
  * **Schema Validation:** Implementing backend request body schemas (e.g., using `marshmallow` or `pydantic` in Flask) to strictly validate JSON payloads on endpoints like `/api/estimates/generate`.

### 📂 Files and Resources
* **Applicable & Implemented:**
  * **Builder Logo Upload:** Builder logos are parsed and verified before being saved.
* **Applicable but Needs Implementation / Configuration:**
  * **File Upload Restrictions:** When uploading logos/profile photos, validating file signatures (magic bytes) to ensure only valid PNG/JPG formats are uploaded, and limiting maximum file size to 5MB.

### 📈 Logging & Error Handling
* **Applicable & Implemented:**
  * **Generic Error Messages:** Try-except blocks in Flask route endpoints catch server exceptions and return sanitized messages (`{ "error": "Failed to generate estimate." }`), keeping stack traces invisible to the user.
  * **Secure Secrets:** Environment variables (`.env`) are used for Supabase Keys, Brevo SMTP keys, and Gemini API keys (nothing is hardcoded in Github).
* **Applicable but Needs Implementation / Configuration:**
  * **Admin Audit Logging:** Logging user creations, approvals, and profile changes to support investigations.

### 🏛️ Compliance & Data Privacy (India DPDPA / GDPR)
* **Applicable & Implemented:**
  * **Minimum Data Collection:** The app collects only essential data (Email, Mobile, City, Company Name) required for registration and estimate headers.
  * **Right to be Forgotten:** Cascading deletes are implemented in Postgres. When a user deletes their account (or an admin deletes them), all their projects, estimates, and BOQ items are permanently removed.
* **Applicable but Needs Implementation / Configuration:**
  * **Privacy Policy & Terms:** Adding footer links on the login/sign-up forms pointing to the Privacy Policy.
  * **Grievance Mechanism:** Adding a standard contact form or email (e.g. `support@buildsmart360.com`) in the Settings page for builder complaints.
* **Not Applicable:**
  * **Verifiable Parental Consent:** The target audience consists of adult construction builders and project contractors.

---

## 3. Excluded / Not Applicable Checklist Items
Below are items explicitly marked **Not Applicable** due to application design:
* **MPIN & PIN Reuse (Items 25, 161):** The app does not have mobile app-level PIN lock systems or payment wallet locks.
* **Financial Transactions/Race Conditions (Items 159, 160, 162):** Estimations are informational. No bank accounts, wallets, card numbers, or money transfers are managed in the database.
* **GraphQL Checks (Items 186-188):** The application communicates strictly using a REST API (Flask routes). GraphQL is not used.
* **WordPress Endpoints (Items 216, 218, 219):** This is a custom React + Flask single page application, not a WordPress site.
* **Biometric Locks (Item 22):** App runs in standard desktop/mobile browsers. No native face-unlock or fingerprint APIs are integrated.
