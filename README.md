# Stripe Payments API Tests

API test suite for Stripe's **test-mode** Payment Intents and Refunds endpoints, built with Playwright and TypeScript. It checks that the API accepts valid payments and returns the right status codes and error details for declines, invalid input, and refunds.

## What's covered

| Area | Scenarios |
|---|---|
| Successful payments | USD and CAD charges, minimum amount |
| Card declines | Generic decline, insufficient funds, expired card, incorrect CVC, incorrect number, stolen card, high fraud score |
| Input validation | Invalid currency code, missing required field, zero amount, negative amount, amount above the maximum |
| Refunds | Full refund, partial refund, refund larger than the original payment, invalid payment intent ID |

Each test asserts the HTTP status and the error `code`, `param`, and `message` (or `decline_code`), not just pass/fail. Refund tests create their own payment first, so tests don't depend on each other.

## Tech

TypeScript, Playwright Test (API testing), GitHub Actions

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the project root with your Stripe **test** secret key:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   ```
   The key is read in `playwright.config.ts`. `.env` is listed in `.gitignore`, so it is never committed.

## Run the tests

```bash
npx playwright test
npx playwright show-report
```

## Notes

- Only Stripe test mode is used. No real money moves.
- Declines are triggered with Stripe's built-in test payment methods, such as `pm_card_chargeDeclined`.
- In CI, the key is stored as a GitHub Actions secret named `STRIPE_SECRET_KEY`.
