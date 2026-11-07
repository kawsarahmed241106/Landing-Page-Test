const SUPABASE_SETTINGS_KEY = "site-supabase-settings";
const MAIN_TITLE_CACHE_KEY = "site-main-title";
const BRAND_NAME_CACHE_KEY = "site-brand-name";
const LOGO_URL_CACHE_KEY = "site-logo-url";
const HEADER_COPY_CACHE_KEY = "site-header-copy";
const SITE_COLORS_KEY = "site-colors";
const SITE_LAYOUT_KEY = "site-layout";
const META_PIXEL_CACHE_KEY = "site-meta-pixel-id";
const SITE_LAYOUTS = new Set(["original", "editorial", "showcase", "reverse", "compact", "immersive", "soft", "midnight"]);

function applySiteLayout(layout = "") {
  const cached = localStorage.getItem(SITE_LAYOUT_KEY) || "original";
  const selected = SITE_LAYOUTS.has(layout) ? layout : SITE_LAYOUTS.has(cached) ? cached : "original";
  document.body.dataset.layout = selected;
  const stylesheet = document.getElementById("store-layout-style");
  if (stylesheet) stylesheet.href = `layouts/layout-${selected}.css`;
  if (layout) localStorage.setItem(SITE_LAYOUT_KEY, selected);
}

function applyMetaPixel(pixelId = "") {
  const id = String(pixelId || "").trim();
  if (!/^\d{5,20}$/.test(id)) {
    document.getElementById("meta-pixel-loader")?.remove();
    localStorage.removeItem(META_PIXEL_CACHE_KEY);
    return;
  }
  if (window.__siteMetaPixelId === id) return;
  window.__siteMetaPixelId = id;
  localStorage.setItem(META_PIXEL_CACHE_KEY, id);
  const loader = document.createElement("script");
  loader.id = "meta-pixel-loader";
  loader.textContent = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(id)});fbq('track','PageView');`;
  document.head.appendChild(loader);
}
const PRODUCT_IMAGE_CACHE_KEY = "site-product-image-url";
const PRODUCT_TITLE_CACHE_KEY = "site-product-title";
const PRODUCT_PRICING_CACHE_KEY = "site-product-pricing";
const DELIVERY_CHARGES_CACHE_KEY = "site-delivery-charges";
const DELIVERY_MESSAGE_CACHE_KEY = "site-delivery-message";
const DEFAULT_DELIVERY_MESSAGE = "Thank you for your order. Your order number is {order_no}.";
const PAYMENT_MODE_CACHE_KEY = "site-payment-mode";

function applyPaymentMode(mode) {
  const prepaid = mode === "prepaid";
  const wrap = document.getElementById("order-email-wrap");
  const email = wrap.querySelector('input[name="email"]');
  wrap.hidden = !prepaid;
  email.required = prepaid;
  localStorage.setItem(PAYMENT_MODE_CACHE_KEY, prepaid ? "prepaid" : "pay-on-delivery");
}
const FOOTER_SOCIAL_CACHE_KEY = "site-footer-social-links";
const FOOTER_CONTACT_CACHE_KEY = "site-footer-contact";
const FOOTER_DESCRIPTION_CACHE_KEY = "site-footer-description";
const DEFAULT_FOOTER_DESCRIPTION = "Quality products, carefully selected and delivered to your door.";
const FOOTER_LOCATION_CACHE_KEY = "site-footer-location";
const DEFAULT_FOOTER_LOCATION = "Bosila Future Town,\nMohammadpur, Dhaka-1207";
const DEFAULT_DELIVERY_CHARGES = {
  inside: { name: "Inside Dhaka", charge: 60 },
  sub: { name: "Sub Dhaka", charge: 70 },
  outside: { name: "Outside Dhaka", charge: 100 }
};
const DEFAULT_PRODUCT_TITLE = "Primal Gold (প্রাইমাল গোল্ড) – সুখী দাম্পত্যের সুন্দর মুহূর্তগুলোকে আরো সুন্দর করুন";
const DEFAULT_PRODUCT_PRICING = {
  mode: "single",
  single: { price: 950, discountPrice: 1200, saved: 250 },
  tiers: [
    { size: 450, price: 950, discountPrice: 1200, saved: 250 },
    { size: 900, price: 1750, discountPrice: 2000, saved: 250 }
  ]
};

function applyProductTitle(title = "") {
  const value = title || localStorage.getItem(PRODUCT_TITLE_CACHE_KEY) || DEFAULT_PRODUCT_TITLE;
  document.getElementById("product-title").textContent = value;
  document.getElementById("bill-product-title").textContent = value;
  if (title) localStorage.setItem(PRODUCT_TITLE_CACHE_KEY, title);
}

function applyFooterSocialLinks(values = {}) {
  let cached = {};
  try { cached = JSON.parse(localStorage.getItem(FOOTER_SOCIAL_CACHE_KEY) || "{}"); } catch { /* no social links saved */ }
  const links = Object.keys(values).length ? values : cached;
  for (const key of ["facebook", "instagram", "linkedin", "youtube"]) {
    const anchor = document.getElementById(`social-link-${key}`);
    const url = links[key] || "";
    if (url && /^https?:\/\//i.test(url)) {
      anchor.href = url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.hidden = false;
    } else {
      anchor.removeAttribute("href");
      anchor.hidden = true;
    }
  }
  if (Object.keys(values).length) localStorage.setItem(FOOTER_SOCIAL_CACHE_KEY, JSON.stringify(values));
}

function applyFooterContact(values = {}, fallbackPhone = "") {
  let cached = {};
  try { cached = JSON.parse(localStorage.getItem(FOOTER_CONTACT_CACHE_KEY) || "{}"); } catch { /* use defaults */ }
  const contact = { ...cached, ...values };
  const email = (contact.email || "corporate@falaqfood.com").trim();
  const emailLink = document.getElementById("footer-email-link");
  document.getElementById("footer-email").textContent = email;
  emailLink.href = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`;
  emailLink.target = "_blank";
  emailLink.rel = "noopener noreferrer";
  emailLink.hidden = !email;

  const phone = contact.number || fallbackPhone || "09613-821489";
  document.getElementById("footer-phone").textContent = phone;
  document.getElementById("footer-phone-link").href = `tel:${phone.replace(/[^\d+]/g, "")}`;

  const whatsapp = contact.whatsapp || "";
  const whatsappLink = document.getElementById("footer-whatsapp-link");
  const whatsappNumber = whatsapp.replace(/\D/g, "");
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : "#";
  document.getElementById("footer-whatsapp-number").textContent = whatsapp;
  whatsappLink.href = whatsappUrl;
  whatsappLink.hidden = !whatsappNumber;
  const floatingWhatsapp = document.getElementById("floating-whatsapp");
  floatingWhatsapp.href = whatsappUrl;
  floatingWhatsapp.hidden = !whatsappNumber;
  if (Object.keys(values).length) localStorage.setItem(FOOTER_CONTACT_CACHE_KEY, JSON.stringify(values));
}

function applyFooterDescription(value) {
  const description = value || localStorage.getItem(FOOTER_DESCRIPTION_CACHE_KEY) || DEFAULT_FOOTER_DESCRIPTION;
  document.getElementById("footer-description").textContent = description;
  if (value) localStorage.setItem(FOOTER_DESCRIPTION_CACHE_KEY, value);
}

function applyFooterLocation(value) {
  const location = value || localStorage.getItem(FOOTER_LOCATION_CACHE_KEY) || DEFAULT_FOOTER_LOCATION;
  document.getElementById("footer-location").textContent = location;
  if (value) localStorage.setItem(FOOTER_LOCATION_CACHE_KEY, value);
}

function applyProductImage(url = "") {
  const image = document.getElementById("product-photo");
  const billImage = document.getElementById("bill-product-image");
  const billPlaceholder = document.getElementById("bill-product-placeholder");
  const visual = document.querySelector(".product-visual");
  if (url) {
    image.src = url;
    image.hidden = false;
    if (billImage) { billImage.src = url; billImage.hidden = false; }
    if (billPlaceholder) billPlaceholder.hidden = true;
    visual.classList.add("has-product-image");
  } else {
    image.removeAttribute("src");
    image.hidden = true;
    if (billImage) { billImage.removeAttribute("src"); billImage.hidden = true; }
    if (billPlaceholder) billPlaceholder.hidden = false;
    visual.classList.remove("has-product-image");
  }
}

function applySiteColors(values = {}) {
  let cached = {};
  try { cached = JSON.parse(localStorage.getItem(SITE_COLORS_KEY) || "{}"); } catch { /* use theme defaults */ }
  const colors = {
    primary_color: values.primary_color || cached.primary_color || "#119b5d",
    secondary_color: values.secondary_color || cached.secondary_color || "#172637",
    tertiary_color: values.tertiary_color || cached.tertiary_color || "#8190a1"
  };
  document.documentElement.style.setProperty("--green", colors.primary_color);
  document.documentElement.style.setProperty("--primary-color", colors.primary_color);
  document.documentElement.style.setProperty("--icon-blue", colors.primary_color);
  document.documentElement.style.setProperty("--ink", colors.secondary_color);
  document.documentElement.style.setProperty("--secondary-color", colors.secondary_color);
  document.documentElement.style.setProperty("--tertiary", colors.tertiary_color);
  document.documentElement.style.setProperty("--tertiary-color", colors.tertiary_color);
  document.documentElement.style.setProperty("--accent-color", colors.primary_color);
  document.documentElement.style.setProperty("--bg-surface", "#ffffff");
  if (values.primary_color) localStorage.setItem(SITE_COLORS_KEY, JSON.stringify(colors));
}

applySiteLayout();

function renderIdentity(title, brand, logoUrl, copy = {}) {
  document.getElementById("store-brand").textContent = brand;
  document.getElementById("footer-brand-name").textContent = brand;
  document.getElementById("footer-copyright-brand").textContent = brand;
  document.getElementById("footer-year").textContent = new Date().getFullYear();
  const logo = document.getElementById("store-logo");
  const footerLogo = document.getElementById("footer-logo");
  if (logoUrl) {
    logo.src = logoUrl;
    logo.alt = `${brand} logo`;
    logo.hidden = false;
    footerLogo.src = logoUrl;
    footerLogo.alt = `${brand} logo`;
    footerLogo.hidden = false;
  } else {
    logo.removeAttribute("src");
    logo.hidden = true;
    footerLogo.removeAttribute("src");
    footerLogo.hidden = true;
  }
  window.setBrandFavicon(logoUrl);
  document.querySelector(".brand").setAttribute("aria-label", `${brand} home`);
  document.querySelector(".benefits").setAttribute("aria-label", `Why shop with ${brand}`);
  document.getElementById("home").setAttribute("aria-label", `${brand} home`);
  document.querySelector('meta[name="description"]').setAttribute("content", `${brand} — 100% natural, delivered fresh to your door.`);
  document.getElementById("benefit-natural").textContent = copy.benefit_natural || "Product Quality";
  document.getElementById("benefit-payment").textContent = copy.benefit_payment || "Cash on Delivery";
  document.getElementById("benefit-delivery").textContent = copy.benefit_delivery || "Fast Delivery";
  document.getElementById("benefit-trusted").textContent = copy.benefit_trusted || "Trusted by 10,000+ Customers";
  const phone = copy.order_phone || "09613-821489";
  document.getElementById("order-phone").textContent = phone;
  document.getElementById("order-call").href = `tel:${phone.replace(/[^\d+]/g, "")}`;
  document.getElementById("footer-phone").textContent = phone;
  document.getElementById("footer-phone-link").href = `tel:${phone.replace(/[^\d+]/g, "")}`;
  applyFooterContact(copy.footer_contact || {}, phone);
  applyFooterDescription(copy.footer_description);
  applyFooterLocation(copy.footer_location);
  document.title = title;
}

let selectedDeliveryCharge = 100;
let selectedDeliveryIndex = 2;
let quantity = 1;
let pricingMode = "single";
let productPricing = DEFAULT_PRODUCT_PRICING;
let selectedTier = DEFAULT_PRODUCT_PRICING.tiers[0];
let deliveryCharges = DEFAULT_DELIVERY_CHARGES;

function applyDeliveryCharges(values = {}) {
  let cached = {};
  try { cached = JSON.parse(localStorage.getItem(DELIVERY_CHARGES_CACHE_KEY) || "{}"); } catch { /* use defaults */ }
  const input = Object.keys(values).length ? values : cached;
  const keys = ["inside", "sub", "outside"];
  const rawAreas = Array.isArray(input) ? input : keys.map((key, index) => {
    const value = input[key];
    return value && typeof value === "object" ? { ...DEFAULT_DELIVERY_CHARGES[index], ...value } : { ...DEFAULT_DELIVERY_CHARGES[index], charge: value ?? DEFAULT_DELIVERY_CHARGES[index].charge };
  });
  deliveryCharges = rawAreas.map((area, index) => ({ ...(DEFAULT_DELIVERY_CHARGES[index] || {}), ...area, charge: Number(area.charge) }));
  if (!deliveryCharges.length) deliveryCharges = DEFAULT_DELIVERY_CHARGES;
  selectedDeliveryIndex = Math.min(selectedDeliveryIndex, deliveryCharges.length - 1);
  const options = document.getElementById("delivery-options");
  options.replaceChildren();
  deliveryCharges.forEach((area, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `delivery-option${index === selectedDeliveryIndex ? " selected" : ""}`;
    const name = document.createElement("small");
    name.textContent = area.name;
    const amount = document.createElement("strong");
    amount.textContent = `৳${Number(area.charge).toLocaleString("en-US")}`;
    const check = document.createElement("span");
    check.className = "check";
    check.textContent = "✓";
    button.append(name, amount, check);
    button.addEventListener("click", () => {
      selectedDeliveryIndex = index;
      selectedDeliveryCharge = Number(area.charge);
      options.querySelectorAll(".delivery-option").forEach(option => option.classList.remove("selected"));
      button.classList.add("selected");
      updateOrderTotals();
    });
    options.append(button);
  });
  selectedDeliveryCharge = Number(deliveryCharges[selectedDeliveryIndex].charge);
  if (Object.keys(values).length) localStorage.setItem(DELIVERY_CHARGES_CACHE_KEY, JSON.stringify(deliveryCharges));
}

function applyProductPricing(values = {}) {
  let cached = {};
  try { cached = JSON.parse(localStorage.getItem(PRODUCT_PRICING_CACHE_KEY) || "{}"); } catch { /* use defaults */ }
  const input = values.mode ? values : cached.mode ? cached : DEFAULT_PRODUCT_PRICING;
  pricingMode = input.mode === "multiple" ? "multiple" : "single";
  const single = { ...DEFAULT_PRODUCT_PRICING.single, ...(input.single || {}) };
  const savedTiers = Array.isArray(input.tiers) && input.tiers.length ? input.tiers : DEFAULT_PRODUCT_PRICING.tiers;
  const tiers = savedTiers.map((tier, index) => ({ ...tier, size: tier.size ?? DEFAULT_PRODUCT_PRICING.tiers[index]?.size ?? 450 + index * 450 }));
  productPricing = { mode: pricingMode, single, tiers: [...tiers].sort((a, b) => Number(a.size) - Number(b.size)) };
  const options = document.getElementById("quantity-tier-options");
  options.replaceChildren();
  document.getElementById("single-quantity-control").hidden = false;
  options.hidden = pricingMode !== "multiple";
  document.getElementById("quantity-choice-label").textContent = pricingMode === "multiple" ? "Select size" : "Quantity";
  if (pricingMode === "multiple") {
    productPricing.tiers.forEach((tier, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "quantity-tier-option";
      button.setAttribute("aria-pressed", index === 0 ? "true" : "false");
      const heading = document.createElement("strong");
      heading.textContent = `${tier.size}gm`;
      button.append(heading);
      button.addEventListener("click", () => {
        selectedTier = tier;
        quantity = 1;
        options.querySelectorAll(".quantity-tier-option").forEach(option => {
          const selected = option === button;
          option.classList.toggle("selected", selected);
          option.setAttribute("aria-pressed", String(selected));
        });
        updateOrderTotals();
      });
      options.append(button);
    });
    selectedTier = productPricing.tiers[0];
    quantity = 1;
    options.firstElementChild?.classList.add("selected");
  } else {
    quantity = 1;
  }
  if (values.mode) localStorage.setItem(PRODUCT_PRICING_CACHE_KEY, JSON.stringify(productPricing));
}

function updateOrderTotals() {
  const currentPrice = pricingMode === "single" ? Number(productPricing.single.price) : Number(selectedTier.price);
  const discountPrice = pricingMode === "single" ? Number(productPricing.single.discountPrice) : Number(selectedTier.discountPrice);
  const saved = pricingMode === "single" ? Number(productPricing.single.saved) : Number(selectedTier.saved);
  const subtotal = currentPrice * quantity;
  const money = value => `৳${value.toLocaleString("en-US")}`;
  document.getElementById("product-price").textContent = money(currentPrice);
  document.getElementById("product-original-price").textContent = money(discountPrice);
  document.getElementById("product-saving").textContent = money(saved);
  document.getElementById("quantity").textContent = quantity;
  document.getElementById("bill-variant").textContent = pricingMode === "multiple" ? `${selectedTier.size}gm | ${quantity}x` : `${quantity} ${quantity === 1 ? "item" : "items"}`;
  document.getElementById("bill-subtotal").textContent = money(subtotal);
  document.getElementById("bill-subtotal-row").textContent = money(subtotal);
  document.getElementById("delivery-charge").textContent = money(selectedDeliveryCharge);
  document.getElementById("total-price").textContent = money(subtotal + selectedDeliveryCharge);
}

document.getElementById("qty-minus").addEventListener("click", () => { quantity = Math.max(1, quantity - 1); updateOrderTotals(); });
document.getElementById("qty-plus").addEventListener("click", () => { quantity += 1; updateOrderTotals(); });
document.getElementById("order-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const message = document.getElementById("order-submit-message");
  let credentials;
  try { credentials = JSON.parse(localStorage.getItem(SUPABASE_SETTINGS_KEY) || "null"); } catch { credentials = null; }
  if (!credentials?.url || !credentials?.publishableKey || !window.supabase) {
    message.textContent = "Orders are temporarily unavailable. Please contact us by phone.";
    return;
  }
  const customer = Object.fromEntries(new FormData(form).entries());
  const area = deliveryCharges[selectedDeliveryIndex] || deliveryCharges[0];
  const unitPrice = pricingMode === "single" ? Number(productPricing.single.price) : Number(selectedTier.price);
  const subtotal = unitPrice * quantity;
  const payload = {
    p_customer_name: customer.customer_name.trim(), p_email: customer.email.trim(), p_phone: customer.phone.trim(),
    p_address: customer.address.trim(), p_notes: (customer.notes || "").trim(),
    p_product_title: document.getElementById("product-title").textContent,
    p_size: pricingMode === "multiple" ? `${selectedTier.size}gm` : "",
    p_quantity: quantity, p_subtotal: subtotal, p_delivery_area: area.name,
    p_delivery_charge: Number(area.charge), p_total: subtotal + Number(area.charge)
  };
  const button = document.querySelector(".confirm-order");
  button.disabled = true;
  message.className = "order-submit-message";
  message.textContent = "Submitting your order…";
  try {
    const client = window.supabase.createClient(credentials.url, credentials.publishableKey);
    if (localStorage.getItem(PAYMENT_MODE_CACHE_KEY) === "prepaid") {
      message.textContent = "Creating secure payment…";
      const { data, error } = await client.functions.invoke("uddoktapay", { body: { action: "create", order: payload } });
      if (error) {
        let details = "";
        const response = error.context;
        if (response && typeof response.clone === "function") {
          try {
            const bodyText = await response.clone().text();
            if (bodyText) {
              try {
                const body = JSON.parse(bodyText);
                details = body.error || body.message || body.msg || "";
              } catch { details = bodyText.slice(0, 500); }
            }
            if (!details && response.status) details = `Payment service returned HTTP ${response.status}.`;
          } catch { /* fall back to the function client's message */ }
        }
        throw new Error(details || error.message || "Could not start UddoktaPay checkout.");
      }
      if (!data?.payment_url || !data?.token) throw new Error(data?.error || "Could not start UddoktaPay checkout.");
      localStorage.setItem("site-payment-intent", data.token);
      window.location.assign(data.payment_url);
      return;
    }
    const orderPayload = { ...payload };
    delete orderPayload.p_email;
    const { data: orderNumber, error } = await client.rpc("submit_customer_order", orderPayload);
    if (error) throw error;
    message.replaceChildren();
    const confirmation = document.createElement("div"); confirmation.className = "order-confirmation-card"; confirmation.setAttribute("role", "status");
    const title = document.createElement("strong"); title.textContent = "Order confirmed";
    let confirmationText = localStorage.getItem(DELIVERY_MESSAGE_CACHE_KEY) || DEFAULT_DELIVERY_MESSAGE;
    confirmationText = confirmationText.replaceAll("{order_no}", orderNumber).replaceAll("{area}", area.name).replaceAll("{charge}", `৳${Number(area.charge).toLocaleString("en-US")}`);
    if (!confirmationText.includes(orderNumber)) confirmationText = `${confirmationText} Order number: ${orderNumber}.`;
    const number = document.createElement("p"); number.textContent = confirmationText;
    const delivery = document.createElement("p"); delivery.textContent = `${area.name} delivery charge: ৳${Number(area.charge).toLocaleString("en-US")}.`;
    confirmation.append(title, number, delivery); message.append(confirmation);
    form.reset();
  } catch (error) {
    console.error("Order submission failed:", error);
    message.textContent = `We couldn't submit your order. ${error.message || "Please try again or contact us by phone."}`;
    message.style.color = "#b34432";
  } finally { button.disabled = false; }
});
applyProductPricing();
applyDeliveryCharges();
updateOrderTotals();

async function loadMainPageTitle() {
  let fallbackTitle = "Your Brand";
  let fallbackBrand = "Your Brand";
  let fallbackLogo = "";
  let fallbackCopy = {};
  try {
    fallbackTitle = localStorage.getItem(MAIN_TITLE_CACHE_KEY) || fallbackTitle;
    fallbackBrand = localStorage.getItem(BRAND_NAME_CACHE_KEY) || fallbackBrand;
    fallbackLogo = localStorage.getItem(LOGO_URL_CACHE_KEY) || fallbackLogo;
    fallbackCopy = JSON.parse(localStorage.getItem(HEADER_COPY_CACHE_KEY) || "{}");
    const credentials = JSON.parse(localStorage.getItem(SUPABASE_SETTINGS_KEY) || "null");
    if (!credentials?.url || !credentials?.publishableKey || !window.supabase) {
      applyMetaPixel(localStorage.getItem(META_PIXEL_CACHE_KEY) || "");
      applyPaymentMode(localStorage.getItem(PAYMENT_MODE_CACHE_KEY));
      applySiteColors();
      applyProductImage(localStorage.getItem(PRODUCT_IMAGE_CACHE_KEY) || "");
      applyProductTitle();
      applyFooterSocialLinks();
      applyFooterContact({}, fallbackCopy.order_phone || "");
      applyProductPricing();
      applyDeliveryCharges();
      updateOrderTotals();
      renderIdentity(fallbackTitle, fallbackBrand, fallbackLogo, fallbackCopy);
      return;
    }
    const client = window.supabase.createClient(credentials.url, credentials.publishableKey);
    const { data, error } = await client.from("main_page_settings").select("*").eq("id", 1).maybeSingle();
    const configuredPixelId = !error && data && Object.prototype.hasOwnProperty.call(data, "meta_pixel_id")
      ? data.meta_pixel_id
      : localStorage.getItem(META_PIXEL_CACHE_KEY) || "";
    applyMetaPixel(configuredPixelId);
    const title = !error && data?.main_title ? data.main_title : fallbackTitle;
    const brand = !error && data?.brand_name ? data.brand_name : fallbackBrand;
    const logoUrl = !error && data?.logo_url ? data.logo_url : fallbackLogo;
    const copy = !error && data ? data : fallbackCopy;
    if (!error && data && typeof data.payment_required === "boolean") applyPaymentMode(data.payment_required ? "prepaid" : "pay-on-delivery");
    applySiteColors(!error && data ? data : {});
    applySiteLayout(!error && data ? data.layout_style : "");
    const productImageUrl = !error && data?.product_image_url ? data.product_image_url : localStorage.getItem(PRODUCT_IMAGE_CACHE_KEY) || "";
    if (!error && data?.product_image_url) localStorage.setItem(PRODUCT_IMAGE_CACHE_KEY, data.product_image_url);
    applyProductImage(productImageUrl);
    applyProductTitle(!error && data?.product_title ? data.product_title : "");
    applyFooterSocialLinks(!error && data?.social_links ? data.social_links : {});
    applyFooterContact(!error && data?.footer_contact ? data.footer_contact : {}, copy.order_phone || "");
    applyProductPricing(!error && data?.product_pricing ? data.product_pricing : {});
    applyDeliveryCharges(!error && data?.delivery_charges ? data.delivery_charges : {});
    if (!error && data?.delivery_message) localStorage.setItem(DELIVERY_MESSAGE_CACHE_KEY, data.delivery_message);
    updateOrderTotals();
    renderIdentity(title, brand, logoUrl, copy);
  } catch (error) {
    console.error("Could not load the main page title:", error);
    applyMetaPixel(localStorage.getItem(META_PIXEL_CACHE_KEY) || "");
    applyPaymentMode(localStorage.getItem(PAYMENT_MODE_CACHE_KEY));
    applySiteColors();
    applyProductImage(localStorage.getItem(PRODUCT_IMAGE_CACHE_KEY) || "");
    applyProductTitle();
    applyFooterSocialLinks();
    applyFooterContact({}, fallbackCopy.order_phone || "");
    applyProductPricing();
    applyDeliveryCharges();
    updateOrderTotals();
    renderIdentity(fallbackTitle, fallbackBrand, fallbackLogo, fallbackCopy);
  }
}

async function handlePaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  const paymentState = params.get("payment");
  if (!paymentState) return;
  const message = document.getElementById("order-submit-message");
  message.className = "order-submit-message";
  if (paymentState === "cancelled") {
    message.textContent = "Payment was cancelled. Your order has not been placed.";
    message.style.color = "#b34432";
    localStorage.removeItem("site-payment-intent");
    history.replaceState({}, "", window.location.pathname);
    return;
  }
  const token = params.get("token") || localStorage.getItem("site-payment-intent");
  const invoiceId = params.get("invoice_id");
  if (!token || !invoiceId) { message.textContent = "Payment reference is missing. Contact us before trying again."; return; }
  message.textContent = "Verifying payment…";
  try {
    const credentials = JSON.parse(localStorage.getItem(SUPABASE_SETTINGS_KEY) || "null");
    if (!credentials?.url || !credentials?.publishableKey || !window.supabase) throw new Error("Supabase is not configured.");
    const client = window.supabase.createClient(credentials.url, credentials.publishableKey);
    const { data, error } = await client.functions.invoke("uddoktapay", { body: { action: "verify", token, invoice_id: invoiceId } });
    if (error || !data?.order_number) throw new Error(data?.error || error?.message || "Payment could not be verified.");
    const confirmation = document.createElement("div"); confirmation.className = "order-confirmation-card"; confirmation.setAttribute("role", "status");
    const title = document.createElement("strong"); title.textContent = "Payment received — order confirmed";
    let text = localStorage.getItem(DELIVERY_MESSAGE_CACHE_KEY) || DEFAULT_DELIVERY_MESSAGE;
    text = text.replaceAll("{order_no}", data.order_number);
    if (!text.includes(data.order_number)) text = `${text} Order number: ${data.order_number}.`;
    const body = document.createElement("p"); body.textContent = text;
    confirmation.append(title, body); message.replaceChildren(confirmation);
    localStorage.removeItem("site-payment-intent");
    history.replaceState({}, "", window.location.pathname);
  } catch (error) {
    message.textContent = error.message;
    message.style.color = "#b34432";
  }
}

loadMainPageTitle();
handlePaymentReturn();
window.addEventListener("focus", loadMainPageTitle);
