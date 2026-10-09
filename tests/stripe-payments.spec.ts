import { test, expect } from '@playwright/test';
import { APIRequestContext, APIResponse } from '@playwright/test';

async function createPaymentIntent(request: APIRequestContext, amount: string, currency: string, paymentMethod: string): Promise<APIResponse> {
  return request.post('/v1/payment_intents', {
    form: {
      amount,
      currency,
      payment_method: paymentMethod,
      confirm: 'true',
      'automatic_payment_methods[enabled]': 'true',
      'automatic_payment_methods[allow_redirects]': 'never'
    }
  })
}

test('successful payment charge in USD', async ({ request }) => {
  const res = await createPaymentIntent(request, '2000', 'usd', 'pm_card_visa');
  const body = await res.json();
  expect(res.ok()).toBeTruthy();
  expect(body.status).toBe('succeeded');
});

test('successful payment charge in CAD', async ({ request }) => {
  const res = await createPaymentIntent(request, '2000', 'cad', 'pm_card_visa');
  const body = await res.json();
  expect(res.ok()).toBeTruthy();
  expect(body.status).toBe('succeeded');
});

test('invalid currency code returns 400 error', async ({ request }) => {
  const res = await createPaymentIntent(request, '5000', '123', 'pm_card_visa');
  const body = await res.json();
  expect(res.status()).toBe(400);
  expect(body.error.param).toBe('currency');
  expect(body.error.message).toMatch(/invalid currency/i);
})

test('successful payment charge, minimum amount', async ({ request }) => {
  const res = await createPaymentIntent(request, '50', 'cad', 'pm_card_visa');
  const body = await res.json();
  expect(res.ok()).toBeTruthy();
  expect(body.status).toBe('succeeded');
});

test('generic payment decline', async ({ request }) => {
  const res = await createPaymentIntent(request, '10000', 'cad', 'pm_card_chargeDeclined');
  const body = await res.json();
  expect(res.status()).toBe(402);
  expect(body.error.code).toBe('card_declined');
  expect(body.error.decline_code).toBe('generic_decline');
});

test('insufficient funds declined', async ({ request }) => {
  const res = await createPaymentIntent(request, '10000', 'cad', 'pm_card_chargeDeclinedInsufficientFunds');
  const body = await res.json();
  expect(res.status()).toBe(402);
  expect(body.error.code).toBe('card_declined');
  expect(body.error.decline_code).toBe('insufficient_funds');
});

test('expired card declined', async ({ request }) => {
  const res = await createPaymentIntent(request, '2000', 'cad', 'pm_card_chargeDeclinedExpiredCard');
  const body = await res.json();
  expect(res.status()).toBe(402);
  expect(body.error.code).toBe('expired_card');
  expect(body.error.decline_code).toBe('expired_card');
});

test('charge declined with incorrect CVC', async ({ request }) => {
  const res = await createPaymentIntent(request, '2000', 'cad', 'pm_card_chargeDeclinedIncorrectCvc');
  const body = await res.json();
  expect(res.status()).toBe(402);
  expect(body.error.code).toBe('incorrect_cvc');
});

test('charge declined with incorrect number', async ({ request }) => {
  const res = await createPaymentIntent(request, '2000', 'cad', 'pm_card_chargeDeclinedIncorrectNumber');
  const body = await res.json();
  expect(res.status()).toBe(400);
  expect(body.error.code).toBe('resource_missing');
});

test('charge declined with stolen card', async ({ request }) => {
  const res = await createPaymentIntent(request, '2000', 'cad', 'pm_card_chargeDeclinedStolenCard');
  const body = await res.json();
  expect(res.status()).toBe(402);
  expect(body.error.code).toBe('card_declined');
  expect(body.error.decline_code).toBe('stolen_card');
})

test('charge declined with missing field', async ({ request }) => {
  const res = await request.post('/v1/payment_intents', {
    form: {
      currency: 'cad',
      payment_method: 'pm_card_visa',
      confirm: 'true',
      'automatic_payment_methods[enabled]': 'true',
      'automatic_payment_methods[allow_redirects]': 'never',
    }
  });
  const body = await res.json();
  expect(res.status()).toBe(400);
  expect(body.error.code).toBe('parameter_missing');
});

test('declined charge with zero amount', async ({ request }) => {
  const res = await createPaymentIntent(request, '0', 'cad', 'pm_card_visa');
  const body = await res.json();
  expect(res.status()).toBe(400);
  expect(body.error.code).toBe('parameter_invalid_integer');
});

test('charge declined with high fraud dispute score', async ({ request }) => {
  const res = await createPaymentIntent(request, '50000', 'cad', 'pm_card_highFraudDisputeScore');
  const body = await res.json();
  expect(res.status()).toBe(402);
  expect(body.error.code).toBe('card_declined');
  expect(body.error.decline_code).toBe('fraudulent');
})

test('declined charge with negative amount', async ({ request }) => {
  const res = await createPaymentIntent(request, '-1', 'cad', 'pm_card_visa');
  const body = await res.json();
  expect(res.status()).toBe(400);
  expect(body.error.code).toBe('parameter_invalid_integer');
});

test('declined charge exceeding max limit', async ({ request }) => {
  const res = await createPaymentIntent(request, '9999999999999', 'cad', 'pm_card_visa');
  const body = await res.json();
  expect(res.status()).toBe(400);
  expect(body.error.code).toBe('amount_too_large');
});

test('successful full refund', async ({ request }) => {
  const paymentRes = await createPaymentIntent(request, '100', 'cad', 'pm_card_visa');
  const payment = await paymentRes.json();
  expect(payment.status).toBe('succeeded');

  const refundRes = await request.post('/v1/refunds', {
    form: { payment_intent: payment.id }
  })
  const refund = await refundRes.json();
  expect(refundRes.ok()).toBeTruthy();
  expect(refund.status).toBe('succeeded');
})

test('successful partial refund', async ({ request }) => {
  const paymentRes = await createPaymentIntent(request, '500', 'cad', 'pm_card_visa');
  const payment = await paymentRes.json();
  expect(payment.status).toBe('succeeded');

  const refundRes = await request.post('/v1/refunds', {
    form: { payment_intent: payment.id, amount: '100' }
  });
  const refund = await refundRes.json();
  expect(refund.status).toBe('succeeded');
  expect(refund.amount).toBe(100);
});

test('refund declined for amount larger than initial payment', async ({ request }) => {
  const paymentRes = await createPaymentIntent(request, '100', 'cad', 'pm_card_visa');
  const payment = await paymentRes.json();
  expect(payment.status).toBe('succeeded');

  const refundRes = await request.post('/v1/refunds', {
    form: { payment_intent: payment.id, amount: '500' }
  });
  const refund = await refundRes.json();
  expect(refundRes.status()).toBe(400);
  expect(refund.error.type).toBe('invalid_request_error');
  expect(refund.error.param).toBe('amount');
  expect(refund.error.message).toMatch(/greater than charge amount/i);
});

test('refund declined for an invalid payment intent ID', async ({ request }) => {
  const refundRes = await request.post('v1/refunds', {
    form: { payment_intent: 'invalid_payment_intent_id' }
  })
  const refund = await refundRes.json();
  expect(refundRes.status()).toBe(404);
  expect(refund.error.code).toBe('resource_missing');
  expect(refund.error.param).toBe('id');
  expect(refund.error.message).toMatch(/no such payment_intent/i);
})