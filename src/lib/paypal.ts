import "server-only";

function getPaypalBaseUrl() {
  const isLive =
    (process.env.PAYPAL_MODE || "sandbox").trim().toLowerCase() === "live";

  return isLive
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function getPaypalCredentials() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    throw new Error("PayPal is not configured.");
  }

  return {
    clientId,
    clientSecret,
  };
}

export async function createPaypalAccessToken() {
  const { clientId, clientSecret } = getPaypalCredentials();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${getPaypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || typeof payload?.access_token !== "string") {
    throw new Error(payload?.error_description || "Unable to authenticate with PayPal.");
  }

  return {
    accessToken: payload.access_token as string,
    baseUrl: getPaypalBaseUrl(),
  };
}

export async function capturePaypalOrder(orderId: string) {
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    throw new Error("Missing PayPal order.");
  }

  const { accessToken, baseUrl } = await createPaypalAccessToken();
  const response = await fetch(
    `${baseUrl}/v2/checkout/orders/${encodeURIComponent(normalizedOrderId)}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": crypto.randomUUID(),
      },
    }
  );
  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.status !== "COMPLETED") {
    throw new Error(payload?.message || "Unable to confirm PayPal payment.");
  }

  return payload;
}

export async function getPaypalOrder(orderId: string) {
  const normalizedOrderId = orderId.trim();

  if (!normalizedOrderId) {
    throw new Error("Missing PayPal order.");
  }

  const { accessToken, baseUrl } = await createPaypalAccessToken();
  const response = await fetch(
    `${baseUrl}/v2/checkout/orders/${encodeURIComponent(normalizedOrderId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
  const payload = await response.json().catch(() => null);

  if (!response.ok || typeof payload?.id !== "string") {
    throw new Error(payload?.message || "Unable to load PayPal order.");
  }

  return payload;
}

export async function verifyPaypalWebhook(rawBody: string, headers: Headers) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();

  if (!webhookId) {
    throw new Error("PAYPAL_WEBHOOK_ID is not configured.");
  }

  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const transmissionSig = headers.get("paypal-transmission-sig");
  const certUrl = headers.get("paypal-cert-url");
  const authAlgo = headers.get("paypal-auth-algo");

  if (
    !transmissionId ||
    !transmissionTime ||
    !transmissionSig ||
    !certUrl ||
    !authAlgo
  ) {
    return false;
  }

  const webhookEvent = JSON.parse(rawBody) as Record<string, unknown>;
  const { accessToken, baseUrl } = await createPaypalAccessToken();
  const response = await fetch(
    `${baseUrl}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: webhookEvent,
      }),
    }
  );
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || "Unable to verify PayPal webhook.");
  }

  return payload?.verification_status === "SUCCESS";
}
