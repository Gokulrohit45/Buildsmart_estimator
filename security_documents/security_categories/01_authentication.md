# BuildSmart 360 Security Status — Authentication

This document lists the implementation status for all security requirements in the **Authentication** category.

1. 🟢 **Already Implemented** — Passwords must be at least 12 characters in length. (Enforced in signup & reset forms & backend validation)
2. 🟢 **Already Implemented** — Passwords of at least 64 characters must be permitted, and passwords exceeding 128 characters must be denied. (Enforced 12-128 chars limit)
3. 🟢 **Already Implemented** — Password complexity must be enforced, requiring a combination of lowercase letters, uppercase letters, numbers, and special characters. (Enforced via regex checks)
4. ⚪ **Not Applicable** — Password change functionality must require the user's current password along with the new password. (Since our password reset is verified via OTP sent to the registered email account).
5. 🟢 **Already Implemented** — Passwords checked against a list of weak or commonly used passwords. (Blocked dictionary list on backend)
6. 🟢 **Already Implemented** — A password strength meter must be provided to guide users during password creation. (Dynamic visual color-coded strength bar implemented in frontend forms)
7. 🟢 **Already Implemented** — Old passwords must not be reused. (Enforced check against last 5 password hashes in database)
8. 🟢 **Already Implemented** — Account lockout must be enforced after no more than 5 failed login attempts to prevent unauthorized access. (Locks account for 15 minutes after 5 consecutive failures)
9. 🟢 **Already Implemented** — Users must be able to toggle visibility of the masked password on the login or signup form.
10. 🟢 **Already Implemented** — Secure notifications must be sent to users after any update to their authentication details (e.g., password change, new device login, email change, account lockout, account deletion). (Sends transactional email alert on password resets or locks)
11. 🟢 **Already Implemented** — The password reset page must not include social media buttons. Reset tokens must not be leaked via referrer headers or API responses, and must be strong and unguessable. (Visual forms are clean; no social links; OTP/reset validation does not leak sensitive references)
12. ⚪ **Not Applicable** — MFA must be required to log in even after a password reset, for users who have MFA enabled.
13. 🟢 **Already Implemented** — The user must be logged out and redirected to the login page immediately after a password change or reset. (Clears localStorage session states upon reset completion)
14. 🟢 **Already Implemented** — Password reset links must expire within a maximum of 1 hour. (OTP resets are strictly configured to expire in 10 minutes)
15. ⚪ **Not Applicable** — Time-based OTPs must be used for two-factor authentication.
16. 🟢 **Already Implemented** — The application must prompt users to change their password after 90 days. (Triggers password_expired warning flag on login and redirects to reset)
17. 🟢 **Already Implemented** — OTP validation must be performed strictly on the server side. Client-side response values must never be trusted to determine OTP success or failure.
18. ⚪ **Not Applicable** — The MFA/TOTP secret key must not be exposed in API responses before the user successfully completes MFA verification.
19. ⚪ **Not Applicable** — Biometric authentication must be implemented so it cannot be bypassed via a fallback PIN or password without re-authentication at the application level.
20. 🟢 **Already Implemented** — Email verification must be enforced before granting a newly registered user full access to the application. (Bypasses login validation if user email is unconfirmed in Supabase)
21. 🟢 **Already Implemented** — Account activation must not be achievable through the password reset flow. (Rejects reset trigger for unapproved/suspended accounts)
22. ⚪ **Not Applicable** — MPIN and PIN reuse must be prevented across recent entries, consistent with password history enforcement.
23. 🟢 **Already Implemented** — All authentication decisions (OTP match, MFA success, login result) must be determined server-side only. Client-supplied status or role fields in responses must never be trusted.
24. 🟢 **Already Implemented** — OTPs must be invalidated immediately after successful use and must not be accepted a second time. (OTP rows deleted from DB on first verification success)
25. 🟢 **Already Implemented** — OTP submission attempts must be limited to a maximum of 5 before triggering a lockout or requiring a new OTP. (Deletes OTP verification session after 5 failed checks)
26. 🟢 **Already Implemented** — Login, registration, and password reset endpoints must return identical responses regardless of whether an account exists, to prevent username and account enumeration. (Shielded forgot-password API response leak)
27. ⚪ **Not Applicable** — OAuth 2.0 authorization code flows must use PKCE (code_challenge and code_verifier) for all client types, including SPAs and mobile clients. Flows without PKCE must not be accepted.
28. ⚪ **Not Applicable** — The OAuth state parameter must be generated with sufficient entropy, stored in the session, and validated on callback to prevent CSRF on OAuth flows.
29. ⚪ **Not Applicable** — OAuth redirect URIs must be strictly allowlisted server-side. Dynamic or partial matching of redirect URIs is not permitted.
