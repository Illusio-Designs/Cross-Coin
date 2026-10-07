# DPDP Personal Data Breach Runbook

**Scope:** Obzus India Private Limited storefronts (Velmique, Knitwink, Morbix,
Soxbae, Velquira, Crosscoin, Gripzus) and the shared `api.crosscoin.in`
backend.

**Legal basis:** Digital Personal Data Protection Act, 2023 — S8(6) and the
DPDP Rules, 2025 (Rule 7). A *personal data breach* is any unauthorised
processing, or accidental disclosure, acquisition, sharing, use, alteration,
destruction, or loss of access to, personal data that compromises its
confidentiality, integrity, or availability.

> This is an operational process document, not code. Keep the Grievance
> Officer / DPO contact details below in sync with the live storefront notices.

---

## 0. Roles (fill in)

| Role | Name | Contact |
| --- | --- | --- |
| Grievance Officer / DPO | *[to be confirmed]* | *[email]* |
| Incident lead (engineering) | *[to be confirmed]* | *[phone]* |
| Business owner | *[to be confirmed]* | *[phone]* |

---

## 1. Detect & triage (hour 0)

A breach may surface from: an alert or anomaly in logs, a Razorpay/MSG91/FShip
provider notice, a report from a customer or researcher, or a leaked-credential
warning. The moment one is suspected:

1. **Record the clock.** Note the time of first awareness — the 72-hour report
   window runs from here.
2. **Assign the incident lead.** One named person owns the incident end to end.
3. **Classify what data is in scope.** Which tables / fields? Personal data
   lives chiefly in: `users`, `guest_users`, `shipping_addresses` (encrypted),
   `orders`, `payments`, `reviews`, `lead_captures`, `contact_messages`,
   `whatsapp_conversations`, `utm_tracking`, `consent_logs`.
4. **Estimate scale.** How many data principals, which brands.

## 2. Contain (hours 0–4)

- Revoke/rotate the exposed credential or key. If `DATA_ENCRYPTION_KEY`,
  `JWT_SECRET`, DB credentials, or a provider API key is implicated, rotate it
  immediately and invalidate active sessions (clear `refreshToken`s).
- Close the vector (patch the endpoint, block the IP, disable the leaked token).
- Preserve evidence: snapshot logs and the affected rows **before** remediation
  so the report and any forensic review have ground truth.
- Do **not** quietly delete data to "clean up" — that destroys evidence and can
  itself be a reportable event.

## 3. Notify the Data Protection Board & affected principals (without delay)

Under Rule 7 notification is **two-stage**:

**3a. On becoming aware — notify, without delay:**
- **The affected data principals**, each in a concise, plain-language message
  through the account's usual channel (email / WhatsApp / on-site notice),
  covering: the nature and extent of the breach, the likely consequences, the
  mitigation measures taken, safety measures they can take, and the Grievance
  Officer's contact details.
- **The Data Protection Board of India**, with a description of the breach
  (nature, extent, timing, location).

**3b. Within 72 hours of awareness — detailed report to the Board** (an
extension may be requested with reasons), containing:
- Updated and detailed facts, circumstances and reasons for the breach.
- Mitigation measures implemented.
- Findings on who caused it (if known).
- Remedial measures taken to prevent recurrence.
- A report on the notices given to affected data principals.

Keep a copy of every notice and the Board submission with the incident record.

## 4. Remediate & harden (days 1–7)

- Fix the root cause; add the regression test / alert that would have caught it.
- Review access controls and whether the exposed data should have been retained
  at all (see the retention sweep, `services/dataRetentionService.js`).
- If plaintext PII was exposed, bring forward the field-level encryption backlog
  for that table (see §6).

## 5. Record keeping

Maintain an incident log (date aware, data classes, principals affected,
notices sent, Board submission reference, root cause, remediation). The Act
expects a demonstrable record; retain security/breach records for at least one
year.

---

## 6. Standing security posture (reference)

**Already in place**
- Field-level AES-256-GCM encryption (`utils/encryption.js`) for
  `shipping_addresses` and `guest_users` phone, plus brand secrets. Requires
  `DATA_ENCRYPTION_KEY` (64-hex) to be set in production — if unset, those
  fields are stored in the clear, so **confirm it is set**.
- Consent record (`consent_logs`), self-service data export and erasure,
  and the daily retention sweep.
- HMAC-keyed `phone_hash` lookups so encrypted phones remain queryable without
  decryption.

**Known backlog (deferred — needs careful, tested rollout, not a blind change)**
- `lead_captures.phone`, `contact_messages.phone`, and
  `whatsapp_conversations.customer_phone` are still stored in plaintext.
  Encrypting them is **not** a drop-in change: `customer_phone` is the unique
  key the WhatsApp inbound-matching, broadcast, and cron paths look up by, so it
  must move to an encrypted value + a `phone_hash` lookup column with every call
  site rewired and tested before the plaintext column is dropped. Scope this as
  its own change; do not encrypt these columns in place.
