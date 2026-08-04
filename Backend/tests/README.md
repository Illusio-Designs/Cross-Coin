# Backend smoke tests

Minimal Jest + Supertest scaffolding. The smoke suite covers
infrastructure that should never silently regress — webhook HMAC,
address-quality scoring, API response envelope, CSRF middleware.

## Run

```bash
# all tests
npm test

# just smoke (no DB / no network — fastest)
npm run test:smoke
```

## What's covered today

| File | Surface |
|------|---------|
| `smoke/address-quality.test.js` | pincode/phone validators + scoring + landmark bonus + hash stability |
| `smoke/webhook-signature.test.js` | HMAC accept/reject, fail-open transitional mode, per-source header conventions |
| `smoke/api-response.test.js` | response envelope shape for every helper |
| `smoke/csrf.test.js` | double-submit cookie pattern, enforcement toggle |

## What's NOT covered yet

- End-to-end checkout (would need a test DB seed)
- Razorpay reconciliation (needs Razorpay sandbox keys)
- iThink/FShip provider calls (need vendor sandbox)

Add tests for these as you touch each surface — the suite is a
trip-wire, not a coverage tool.

## Conventions

- Tests live under `tests/` (mirroring `services/`, `middleware/`, etc.)
- Mock heavy collaborators (`sequelize`, `logger`, network clients)
  — smoke tests must run without MySQL / Redis / external APIs
- Use `jest.fn()` for spies, not test doubles
- One assertion per concept; multiple per file is fine
