/**
 * YooKassa REST API client (v3).
 * Docs: https://yookassa.ru/developers/api
 *
 * Env vars required:
 *   YOOKASSA_SHOP_ID     — numeric shop id
 *   YOOKASSA_SECRET_KEY  — secret key from YooKassa dashboard
 */

const BASE_URL = 'https://api.yookassa.ru/v3';

function basicAuth(): string {
  const shopId = process.env.YOOKASSA_SHOP_ID!;
  const secretKey = process.env.YOOKASSA_SECRET_KEY!;
  return 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  idempotencyKey?: string
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: basicAuth(),
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) {
    headers['Idempotence-Key'] = idempotencyKey;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YooKassa ${method} ${path} → ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export interface YooKassaAmount {
  value: string;
  currency: 'RUB';
}

export interface YooKassaPayment {
  id: string;
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled';
  amount: YooKassaAmount;
  payment_method?: { id: string; type: string; saved: boolean };
  confirmation?: { type: string; confirmation_url?: string };
  metadata?: Record<string, string>;
}

export interface CreatePaymentParams {
  /** Amount in RUB (e.g. "999.00") */
  amountValue: string;
  description: string;
  returnUrl: string;
  /** Idempotency key — use a stable UUID per checkout attempt */
  idempotencyKey: string;
  metadata?: Record<string, string>;
  /** Save payment method for future recurring charges */
  savePaymentMethod?: boolean;
}

export async function createPayment(params: CreatePaymentParams): Promise<YooKassaPayment> {
  return request<YooKassaPayment>(
    'POST',
    '/payments',
    {
      amount: { value: params.amountValue, currency: 'RUB' },
      confirmation: {
        type: 'redirect',
        return_url: params.returnUrl,
      },
      capture: true,
      description: params.description,
      save_payment_method: params.savePaymentMethod ?? true,
      metadata: params.metadata ?? {},
    },
    params.idempotencyKey
  );
}

export interface ChargeParams {
  amountValue: string;
  description: string;
  paymentMethodId: string;
  idempotencyKey: string;
  metadata?: Record<string, string>;
}

/** Charge a saved payment method (recurring). */
export async function chargePaymentMethod(params: ChargeParams): Promise<YooKassaPayment> {
  return request<YooKassaPayment>(
    'POST',
    '/payments',
    {
      amount: { value: params.amountValue, currency: 'RUB' },
      payment_method_id: params.paymentMethodId,
      capture: true,
      description: params.description,
      metadata: params.metadata ?? {},
    },
    params.idempotencyKey
  );
}

export async function getPayment(paymentId: string): Promise<YooKassaPayment> {
  return request<YooKassaPayment>('GET', `/payments/${paymentId}`);
}

export interface YooKassaWebhookEvent {
  type: string; // e.g. "notification"
  event: string; // e.g. "payment.succeeded" | "payment.canceled"
  object: YooKassaPayment;
}
