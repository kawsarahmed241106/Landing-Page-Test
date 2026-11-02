import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const getApiRoot = (value: string) => {
  const url = new URL(value.trim());
  url.pathname = url.pathname.replace(/\/(checkout-v2|checkout|verify-payment|refund-payment)\/?$/i, "").replace(/\/$/, "");
  if (!url.pathname.endsWith("/api")) url.pathname = `${url.pathname}/api`;
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
};

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Payment server is not configured." }, 500);
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  try {
    const body = await request.json();
    const action = body.action;
    if (action === "create") {
      const order = body.order;
      if (!order?.p_customer_name || !order?.p_email || !order?.p_phone || !order?.p_address || Number(order?.p_total) <= 0) return json({ error: "Complete the required order details." }, 400);
      const { data: settings, error: settingsError } = await db.from("payment_settings").select("uddoktapay_api_key,uddoktapay_base_url").eq("id", 1).single();
      if (settingsError || !settings?.uddoktapay_api_key) return json({ error: "UddoktaPay is not configured in admin settings." }, 400);
      const apiRoot = getApiRoot(String(settings.uddoktapay_base_url));
      const token = crypto.randomUUID();
      const { error: intentError } = await db.from("payment_intents").insert({ token, payload: order });
      if (intentError) return json({ error: "Could not prepare payment." }, 500);
      const origin = new URL(request.headers.get("origin") || supabaseUrl).origin;
      const redirectUrl = `${origin}/?payment=return&token=${encodeURIComponent(token)}`;
      const cancelUrl = `${origin}/?payment=cancelled&token=${encodeURIComponent(token)}`;
      const response = await fetch(`${apiRoot}/checkout-v2`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "RT-UDDOKTAPAY-API-KEY": settings.uddoktapay_api_key },
        body: JSON.stringify({
          full_name: order.p_customer_name, email: order.p_email, amount: String(order.p_total),
          metadata: { token }, redirect_url: redirectUrl, return_type: "GET", cancel_url: cancelUrl,
        }),
      });
      const responseText = await response.text();
      let result: Record<string, unknown> = {};
      try { result = JSON.parse(responseText); } catch { result = { message: responseText.trim() }; }
      if (!response.ok || result.status !== true || !result.payment_url) {
        await db.from("payment_intents").update({ status: "failed" }).eq("token", token);
        const upstreamMessage = String(result.message || "").trim();
        const error = response.status === 404
          ? `UddoktaPay returned HTTP 404 from ${apiRoot}/checkout-v2. Check the API base URL in Admin; use ${apiRoot} without an endpoint suffix.`
          : `${upstreamMessage || "UddoktaPay did not create a checkout session."} (HTTP ${response.status} from ${apiRoot}/checkout-v2)`;
        return json({ error }, 502);
      }
      return json({ payment_url: result.payment_url, token });
    }

    if (action === "verify") {
      const token = String(body.token || "");
      const invoiceId = String(body.invoice_id || "");
      if (!token || !invoiceId) return json({ error: "Missing payment reference." }, 400);
      const { data: intent, error: intentError } = await db.from("payment_intents").select("*").eq("token", token).single();
      if (intentError || !intent) return json({ error: "Order payment could not be found." }, 404);
      if (intent.status === "paid" && intent.order_number) return json({ order_number: intent.order_number, already_paid: true });
      const { data: settings, error: settingsError } = await db.from("payment_settings").select("uddoktapay_api_key,uddoktapay_base_url").eq("id", 1).single();
      if (settingsError || !settings?.uddoktapay_api_key) return json({ error: "Payment verification is not configured." }, 500);
      const apiRoot = getApiRoot(String(settings.uddoktapay_base_url));
      const response = await fetch(`${apiRoot}/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", "RT-UDDOKTAPAY-API-KEY": settings.uddoktapay_api_key },
        body: JSON.stringify({ invoice_id: invoiceId }),
      });
      const result = await response.json();
      if (!response.ok || result.status !== "COMPLETED" || Number(result.amount) !== Number(intent.payload.p_total) || result.metadata?.token !== token) return json({ error: "Payment is not completed or could not be verified." }, 402);
      const { data: orderNumber, error: orderError } = await db.rpc("submit_customer_order", {
        p_customer_name: intent.payload.p_customer_name, p_phone: intent.payload.p_phone,
        p_address: intent.payload.p_address, p_notes: intent.payload.p_notes || "",
        p_product_title: intent.payload.p_product_title, p_size: intent.payload.p_size || "",
        p_quantity: intent.payload.p_quantity, p_subtotal: intent.payload.p_subtotal,
        p_delivery_area: intent.payload.p_delivery_area, p_delivery_charge: intent.payload.p_delivery_charge,
        p_total: intent.payload.p_total,
      });
      if (orderError) return json({ error: "Payment verified but order recording failed. Contact the store with your payment reference." }, 500);
      const { error: saveError } = await db.from("payment_intents").update({ status: "paid", invoice_id: invoiceId, order_number: orderNumber }).eq("token", token);
      if (saveError) return json({ error: "Order saved, but payment reference update failed." }, 500);
      return json({ order_number: orderNumber });
    }
    return json({ error: "Unsupported payment action." }, 400);
  } catch (error) {
    console.error("UddoktaPay function error:", error);
    return json({ error: "Payment request failed. Please try again." }, 500);
  }
});
