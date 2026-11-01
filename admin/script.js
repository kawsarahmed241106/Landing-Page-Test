const SESSION_KEY = "site-admin-session";
const SUPABASE_SETTINGS_KEY = "site-supabase-settings";
const PAYMENT_MODE_CACHE_KEY = "site-payment-mode";
const MAIN_TITLE_CACHE_KEY = "site-main-title";
const BRAND_NAME_CACHE_KEY = "site-brand-name";
const LOGO_URL_CACHE_KEY = "site-logo-url";
const HEADER_COPY_CACHE_KEY = "site-header-copy";
const SITE_COLORS_KEY = "site-colors";
const PRODUCT_IMAGE_CACHE_KEY = "site-product-image-url";
const PRODUCT_TITLE_CACHE_KEY = "site-product-title";
const DEFAULT_PRODUCT_TITLE = "Primal Gold (প্রাইমাল গোল্ড) – সুখী দাম্পত্যের সুন্দর মুহূর্তগুলোকে আরো সুন্দর করুন";
const PRODUCT_PRICING_CACHE_KEY = "site-product-pricing";
const DELIVERY_CHARGES_CACHE_KEY = "site-delivery-charges";
const DELIVERY_MESSAGE_CACHE_KEY = "site-delivery-message";
const DEFAULT_DELIVERY_MESSAGE = "Thank you for your order. Your order number is {order_no}.";
const FOOTER_SOCIAL_CACHE_KEY = "site-footer-social-links";
const FOOTER_CONTACT_CACHE_KEY = "site-footer-contact";
const FOOTER_DESCRIPTION_CACHE_KEY = "site-footer-description";
const DEFAULT_FOOTER_DESCRIPTION = "Quality products, carefully selected and delivered to your door.";
const FOOTER_LOCATION_CACHE_KEY = "site-footer-location";
const DEFAULT_FOOTER_LOCATION = "Bosila Future Town,\nMohammadpur, Dhaka-1207";
const DEFAULT_DELIVERY_CHARGES = [
  { name: "Inside Dhaka", charge: 60 },
  { name: "Sub Dhaka", charge: 70 },
  { name: "Outside Dhaka", charge: 100 }
];
const DEFAULT_PRODUCT_PRICING = {
  mode: "single",
  single: { price: 950, discountPrice: 1200, saved: 250 },
  tiers: [
    { size: 450, price: 950, discountPrice: 1200, saved: 250 },
    { size: 900, price: 1750, discountPrice: 2000, saved: 250 }
  ]
};
const $ = (id) => document.getElementById(id);

function showAdmin() {
  $("login-page").hidden = true;
  $("admin-app").hidden = false;
  loadSupabaseSettings();
  loadMainTitle();
  loadPaymentSettings();
}

async function loadPaymentSettings() {
  let mode = localStorage.getItem(PAYMENT_MODE_CACHE_KEY) || "pay-on-delivery";
  const client = getSupabaseClient();
  if (client) {
    const { data } = await client.from("main_page_settings").select("payment_required").eq("id", 1).maybeSingle();
    if (data) mode = data.payment_required ? "prepaid" : "pay-on-delivery";
    if (data?.payment_required) {
      const { data: secret } = await client.from("payment_settings").select("uddoktapay_api_key,uddoktapay_base_url").eq("id", 1).maybeSingle();
      if (secret?.uddoktapay_api_key) $("uddoktapay-api-key").value = secret.uddoktapay_api_key;
      if (secret?.uddoktapay_base_url && secret.uddoktapay_base_url !== "https://sandbox.uddoktapay.com") $("uddoktapay-base-url").value = secret.uddoktapay_base_url;
    }
  }
  const radio = document.querySelector(`input[name="payment-mode"][value="${mode}"]`);
  if (radio) radio.checked = true;
  $("uddoktapay-key-wrap").hidden = mode !== "prepaid";
}

async function loadOrders(filter = "All") {
  const client = getSupabaseClient();
  const message = $("orders-message");
  const list = $("orders-list");
  if (!client) { message.textContent = "Add your Supabase project URL and publishable key in Settings first."; return; }
  const { data: { session } } = await client.auth.getSession();
  if (!session) { message.textContent = "Sign in with your Supabase Auth admin email on the login page to view customer orders."; list.replaceChildren(); return; }
  message.textContent = "Loading orders…";
  const { data: allOrders, error } = await client.from("orders").select("*").order("created_at", { ascending:false }).limit(100);
  if (error) { message.textContent = `Could not load orders: ${error.message}`; return; }
  const counts = Object.fromEntries(["All", "Pending", "Processing", "Completed", "Cancelled"].map(key => [key, key === "All" ? allOrders.length : allOrders.filter(order => (order.status || "Pending") === key).length]));
  document.querySelectorAll("#orders-status-tabs button").forEach(button => {
    button.classList.toggle("active", button.dataset.filter === filter);
    button.querySelector("span").textContent = counts[button.dataset.filter];
  });
  const data = filter === "All" ? allOrders : allOrders.filter(order => (order.status || "Pending") === filter);
  message.textContent = data.length ? `${data.length} recent order${data.length === 1 ? "" : "s"}` : "No orders yet.";
  list.replaceChildren();
  for (const order of data) {
    const card = document.createElement("article"); card.className = "admin-order-card";
    const heading = document.createElement("h3"); heading.textContent = `${order.order_number} · ${order.customer_name}`;
    const date = document.createElement("small"); date.textContent = new Date(order.created_at).toLocaleString("en-GB", { timeZone:"Asia/Dhaka", dateStyle:"medium", timeStyle:"short" }) + " (Bangladesh time)";
    const status = document.createElement("select");
    status.className = `order-status status-${(order.status || "Pending").toLowerCase()}`;
    status.setAttribute("aria-label", `Status for order ${order.order_number}`);
    for (const value of ["Pending", "Processing", "Completed", "Cancelled"]) {
      const option = document.createElement("option"); option.value = value; option.textContent = value; option.selected = value === (order.status || "Pending"); status.append(option);
    }
    status.addEventListener("change", async () => {
      status.disabled = true;
      const { error } = await client.from("orders").update({ status: status.value }).eq("id", order.id);
      if (error) { message.textContent = `Could not update ${order.order_number}: ${error.message}`; status.value = order.status || "Pending"; }
      else { order.status = status.value; status.className = `order-status status-${status.value.toLowerCase()}`; }
      status.disabled = false;
      if (!error) loadOrders(filter);
    });
    const header = document.createElement("div"); header.className = "admin-order-header";
    const identity = document.createElement("div"); identity.append(heading, date);
    const actions = document.createElement("div"); actions.className = "admin-order-actions";
    const badge = document.createElement("span"); badge.className = `order-status-badge status-${(order.status || "Pending").toLowerCase()}`; badge.textContent = order.status || "Pending";
    const deleteButton = document.createElement("button"); deleteButton.type = "button"; deleteButton.className = "delete-order-button"; deleteButton.textContent = "Delete order";
    deleteButton.addEventListener("click", async () => {
      if (!window.confirm(`Delete order ${order.order_number}? This cannot be undone.`)) return;
      deleteButton.disabled = true;
      const { error } = await client.from("orders").delete().eq("id", order.id);
      if (error) { message.textContent = `Could not delete ${order.order_number}: ${error.message}`; deleteButton.disabled = false; return; }
      loadOrders(filter);
    });
    actions.append(badge, deleteButton); header.append(identity, actions); card.append(header);
    const statusRow = document.createElement("div"); statusRow.className = "admin-order-status-row";
    const statusLabel = document.createElement("strong"); statusLabel.textContent = "Order status"; statusRow.append(statusLabel, status);
    card.append(statusRow);
    const fields = [
      ["Customer name", order.customer_name],
      ["Mobile no", order.phone],
      ["Address", order.address],
      ["Message", order.notes || "—"],
      ["Product name", order.product_title],
      ["Product size", order.size || "Standard"],
      ["Product quantity", String(order.quantity)],
      ["Total bill", `৳${Number(order.total).toLocaleString("en-US")}`]
    ];
    const fieldList = document.createElement("dl"); fieldList.className = "order-detail-list";
    for (const [label, value] of fields) {
      const row = document.createElement("div"); row.className = "order-detail-row";
      const term = document.createElement("dt"); term.textContent = label;
      const description = document.createElement("dd"); description.textContent = value;
      row.append(term, description); fieldList.append(row);
    }
    card.append(fieldList);
    list.append(card);
  }
}

function applyBrandName(name, logoUrl = localStorage.getItem(LOGO_URL_CACHE_KEY) || "") {
  const brand = name?.trim() || "Your Brand";
  $("login-brand").textContent = brand;
  $("sidebar-brand-name").textContent = brand;
  $("brand-icon").textContent = brand.charAt(0).toUpperCase();
  const logo = $("admin-brand-logo");
  const iconBox = $("brand-icon").parentElement;
  if (logoUrl) {
    logo.src = logoUrl;
    logo.alt = `${brand} logo`;
    logo.hidden = false;
    $("brand-icon").hidden = true;
    iconBox.classList.add("has-logo");
  } else {
    logo.removeAttribute("src");
    logo.hidden = true;
    $("brand-icon").hidden = false;
    iconBox.classList.remove("has-logo");
  }
  $("sidebar-brand").setAttribute("aria-label", `${brand} admin home`);
  document.title = `${brand} admin`;
  window.setBrandFavicon(logoUrl);
}

function loadSupabaseSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SUPABASE_SETTINGS_KEY) || "{}");
    $("supabase-url").value = saved.url || "";
    $("supabase-key").value = saved.publishableKey || "";
  } catch {
    $("supabase-url").value = "";
    $("supabase-key").value = "";
  }
}

function getSupabaseClient() {
  const credentials = JSON.parse(localStorage.getItem(SUPABASE_SETTINGS_KEY) || "null");
  if (!credentials?.url || !credentials?.publishableKey || !window.supabase) return null;
  return window.supabase.createClient(credentials.url, credentials.publishableKey);
}

function setHeaderCopy(values) {
  $("benefit-natural-input").value = values.benefit_natural || "Product Quality";
  $("benefit-payment-input").value = values.benefit_payment || "Cash on Delivery";
  $("benefit-delivery-input").value = values.benefit_delivery || "Fast Delivery";
  $("benefit-trusted-input").value = values.benefit_trusted || "Trusted by 10,000+ Customers";
  $("order-phone-input").value = values.order_phone || "09613-821489";
}

function setSiteColors(values = {}) {
  let cached = {};
  try { cached = JSON.parse(localStorage.getItem(SITE_COLORS_KEY) || "{}"); } catch { /* use theme defaults */ }
  const colors = {
    primary: values.primary_color || cached.primary_color || "#119b5d",
    secondary: values.secondary_color || cached.secondary_color || "#172637",
    tertiary: values.tertiary_color || cached.tertiary_color || "#8190a1"
  };
  for (const [name, value] of Object.entries(colors)) {
    $(`${name}-color`).value = value;
    $(`${name}-picker`).value = value;
  }
}

function setProductImage(url = "") {
  $("product-image-url").value = url;
  const preview = $("product-image-preview");
  if (url) { preview.src = url; preview.hidden = false; }
  else { preview.removeAttribute("src"); preview.hidden = true; }
}

function addTierRow(tier = {}) {
  const row = document.createElement("div");
  row.className = "tier-row";
  for (const field of [
    { key: "size", label: "Size (gm)", min: 1 },
    { key: "price", label: "Price", min: 0 },
    { key: "discountPrice", label: "Discount price", min: 0 },
    { key: "saved", label: "Saved money", min: 0 }
  ]) {
    const wrap = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = field.label;
    const input = document.createElement("input");
    input.type = "number";
    input.min = field.min;
    input.step = "1";
    input.required = true;
    input.dataset.field = field.key;
    if (tier[field.key] !== undefined) input.value = tier[field.key];
    wrap.append(label, input);
    row.append(wrap);
  }
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "tier-remove";
  remove.textContent = "×";
  remove.setAttribute("aria-label", "Remove quantity price");
  remove.addEventListener("click", () => row.remove());
  row.append(remove);
  $("tier-list").append(row);
}

function syncPricingMode() {
  const mode = document.querySelector('input[name="pricing-mode"]:checked').value;
  const single = $("single-price-settings");
  const multiple = $("multiple-pricing");
  single.hidden = mode !== "single";
  multiple.hidden = mode !== "multiple";
  single.querySelectorAll("input").forEach(input => { input.disabled = mode !== "single"; });
  multiple.querySelectorAll("input").forEach(input => { input.disabled = mode !== "multiple"; });
}

function setProductPricing(values = {}) {
  const config = values.mode ? values : DEFAULT_PRODUCT_PRICING;
  const single = { ...DEFAULT_PRODUCT_PRICING.single, ...(config.single || {}) };
  $("single-price").value = single.price;
  $("single-discount").value = single.discountPrice;
  $("single-saving").value = single.saved;
  document.querySelector(`input[name="pricing-mode"][value="${config.mode}"]`).checked = true;
  $("tier-list").replaceChildren();
  (config.tiers?.length ? config.tiers : DEFAULT_PRODUCT_PRICING.tiers).forEach((tier, index) => {
    addTierRow({ ...tier, size: tier.size ?? DEFAULT_PRODUCT_PRICING.tiers[index]?.size ?? 450 + index * 450 });
  });
  syncPricingMode();
}

function readProductPricing() {
  const mode = document.querySelector('input[name="pricing-mode"]:checked').value;
  return {
    mode,
    single: { price: Number($("single-price").value), discountPrice: Number($("single-discount").value), saved: Number($("single-saving").value) },
    tiers: Array.from(document.querySelectorAll(".tier-row"), row => Object.fromEntries(
      Array.from(row.querySelectorAll("input"), input => [input.dataset.field, Number(input.value)])
    ))
  };
}

function setDeliveryCharges(values = {}) {
  let cached = {};
  try { cached = JSON.parse(localStorage.getItem(DELIVERY_CHARGES_CACHE_KEY) || "{}"); } catch { /* use defaults */ }
  const source = Object.keys(values).length ? values : cached;
  let areas = Array.isArray(source) ? source : null;
  if (!areas) {
    areas = ["inside", "sub", "outside"].map((key, index) => {
      const fallback = DEFAULT_DELIVERY_CHARGES[index];
      const value = source[key];
      return value && typeof value === "object" ? { ...fallback, ...value } : { ...fallback, charge: value ?? fallback.charge };
    });
  }
  $("delivery-area-list").replaceChildren();
  (areas.length ? areas : DEFAULT_DELIVERY_CHARGES).forEach(addDeliveryAreaCard);
}

function readDeliveryCharges() {
  return Array.from(document.querySelectorAll(".delivery-area-card"), card => ({
    name: card.querySelector('[data-field="name"]').value.trim(),
    charge: Number(card.querySelector('[data-field="charge"]').value)
  }));
}

function addDeliveryAreaCard(area = {}) {
  const card = document.createElement("section");
  card.className = "delivery-area-card";
  const heading = document.createElement("h3");
  heading.textContent = `Delivery area ${$("delivery-area-list").children.length + 1}`;
  card.append(heading);
  for (const field of [
    { key: "name", label: "Area name", type: "text", value: area.name || "", maxLength: 50 },
    { key: "charge", label: "Delivery charge", type: "number", value: area.charge ?? "", min: 0 }
  ]) {
    const wrapper = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = field.label;
    const input = document.createElement("input");
    input.type = field.type;
    input.required = true;
    input.dataset.field = field.key;
    input.value = field.value;
    if (field.type === "text") input.maxLength = field.maxLength;
    else { input.min = field.min; input.step = "1"; }
    wrapper.append(label, input);
    card.append(wrapper);
  }
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "tier-remove";
  remove.textContent = "×";
  remove.setAttribute("aria-label", "Remove delivery area");
  remove.addEventListener("click", () => {
    if ($("delivery-area-list").children.length > 1) card.remove();
    else card.querySelector('[data-field="name"]').focus();
    document.querySelectorAll(".delivery-area-card h3").forEach((title, index) => { title.textContent = `Delivery area ${index + 1}`; });
  });
  card.append(remove);
  $("delivery-area-list").append(card);
}

function setFooterSocialLinks(values = {}) {
  let cached = {};
  try { cached = JSON.parse(localStorage.getItem(FOOTER_SOCIAL_CACHE_KEY) || "{}"); } catch { /* empty social links */ }
  const links = { ...cached, ...values };
  for (const key of ["facebook", "instagram", "linkedin", "youtube"]) $(`social-${key}`).value = links[key] || "";
}

function readFooterSocialLinks() {
  return Object.fromEntries(["facebook", "instagram", "linkedin", "youtube"].map(key => [`${key}`, $(`social-${key}`).value.trim()]));
}

function setFooterContact(values = {}) {
  let cached = {};
  try { cached = JSON.parse(localStorage.getItem(FOOTER_CONTACT_CACHE_KEY) || "{}"); } catch { /* no contact details saved */ }
  let headerCopy = {};
  try { headerCopy = JSON.parse(localStorage.getItem(HEADER_COPY_CACHE_KEY) || "{}"); } catch { /* use cached footer number */ }
  const contact = { number: headerCopy.order_phone || "", ...cached, ...values };
  if (!contact.number) contact.number = headerCopy.order_phone || "";
  $("footer-email-input").value = contact.email || "";
  $("footer-number-input").value = contact.number || "";
  $("footer-whatsapp-input").value = contact.whatsapp || "";
}

function readFooterContact() {
  return {
    email: $("footer-email-input").value.trim(),
    number: $("footer-number-input").value.trim(),
    whatsapp: $("footer-whatsapp-input").value.trim()
  };
}

async function loadMainTitle() {
  $("main-title-input").value = localStorage.getItem(MAIN_TITLE_CACHE_KEY) || "Your Brand";
  const cachedBrand = localStorage.getItem(BRAND_NAME_CACHE_KEY) || "Your Brand";
  $("brand-name-input").value = cachedBrand;
  $("logo-url-input").value = localStorage.getItem(LOGO_URL_CACHE_KEY) || "";
  try { setHeaderCopy(JSON.parse(localStorage.getItem(HEADER_COPY_CACHE_KEY) || "{}")); } catch { setHeaderCopy({}); }
  try { setSiteColors(JSON.parse(localStorage.getItem(SITE_COLORS_KEY) || "{}")); } catch { setSiteColors(); }
  setProductImage(localStorage.getItem(PRODUCT_IMAGE_CACHE_KEY) || "");
  $("product-title-input").value = localStorage.getItem(PRODUCT_TITLE_CACHE_KEY) || DEFAULT_PRODUCT_TITLE;
  try { setProductPricing(JSON.parse(localStorage.getItem(PRODUCT_PRICING_CACHE_KEY) || "{}")); } catch { setProductPricing(); }
  setDeliveryCharges();
  $("delivery-message-input").value = localStorage.getItem(DELIVERY_MESSAGE_CACHE_KEY) || DEFAULT_DELIVERY_MESSAGE;
  setFooterSocialLinks();
  try { setFooterContact(JSON.parse(localStorage.getItem(FOOTER_CONTACT_CACHE_KEY) || "{}")); } catch { setFooterContact(); }
  $("footer-description-input").value = localStorage.getItem(FOOTER_DESCRIPTION_CACHE_KEY) || DEFAULT_FOOTER_DESCRIPTION;
  $("footer-location-input").value = localStorage.getItem(FOOTER_LOCATION_CACHE_KEY) || DEFAULT_FOOTER_LOCATION;
  applyBrandName(cachedBrand);
  const client = getSupabaseClient();
  if (!client) return;
  const { data, error } = await client.from("main_page_settings").select("*").eq("id", 1).maybeSingle();
  if (error) {
    $("title-save-message").textContent = `Could not load shared settings: ${error.message}`;
    $("title-save-message").style.color = "#a56b13";
    return;
  }
  if (!error && data?.main_title) {
    $("main-title-input").value = data.main_title;
    localStorage.setItem(MAIN_TITLE_CACHE_KEY, data.main_title);
  }
  if (!error && data?.brand_name) {
    $("brand-name-input").value = data.brand_name;
    localStorage.setItem(BRAND_NAME_CACHE_KEY, data.brand_name);
    applyBrandName(data.brand_name, data.logo_url || "");
  }
  if (!error && data?.logo_url !== undefined) {
    $("logo-url-input").value = data.logo_url;
    localStorage.setItem(LOGO_URL_CACHE_KEY, data.logo_url);
  }
  if (!error && data) setHeaderCopy(data);
  if (!error && data) {
    setSiteColors(data);
    if (data.primary_color) localStorage.setItem(SITE_COLORS_KEY, JSON.stringify({ primary_color: data.primary_color, secondary_color: data.secondary_color, tertiary_color: data.tertiary_color }));
  }
  if (!error && data?.product_image_url) {
    setProductImage(data.product_image_url);
    localStorage.setItem(PRODUCT_IMAGE_CACHE_KEY, data.product_image_url);
  }
  if (!error && data?.product_title) {
    $("product-title-input").value = data.product_title;
    localStorage.setItem(PRODUCT_TITLE_CACHE_KEY, data.product_title);
  }
  if (!error && data?.product_pricing) {
    setProductPricing(data.product_pricing);
    localStorage.setItem(PRODUCT_PRICING_CACHE_KEY, JSON.stringify(data.product_pricing));
  }
  if (!error && data?.delivery_charges) {
    setDeliveryCharges(data.delivery_charges);
    localStorage.setItem(DELIVERY_CHARGES_CACHE_KEY, JSON.stringify(data.delivery_charges));
  }
  if (!error && data?.delivery_message) {
    $("delivery-message-input").value = data.delivery_message;
    localStorage.setItem(DELIVERY_MESSAGE_CACHE_KEY, data.delivery_message);
  }
  if (!error && data?.social_links) {
    setFooterSocialLinks(data.social_links);
    localStorage.setItem(FOOTER_SOCIAL_CACHE_KEY, JSON.stringify(data.social_links));
  }
  if (!error && data?.footer_contact) {
    setFooterContact(data.footer_contact);
    localStorage.setItem(FOOTER_CONTACT_CACHE_KEY, JSON.stringify(data.footer_contact));
  } else if (!error && data?.order_phone) {
    setFooterContact({ number: data.order_phone });
  }
  if (!error && data?.footer_description) {
    $("footer-description-input").value = data.footer_description;
    localStorage.setItem(FOOTER_DESCRIPTION_CACHE_KEY, data.footer_description);
  }
  if (!error && data?.footer_location) {
    $("footer-location-input").value = data.footer_location;
    localStorage.setItem(FOOTER_LOCATION_CACHE_KEY, data.footer_location);
  }
}

function closeMobileNav() {
  $("admin-app").classList.remove("mobile-nav-open");
  $("menu-toggle").setAttribute("aria-label", "Open navigation");
}

$("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = $("username").value.trim();
  const password = $("password").value;
  const client = getSupabaseClient();
  if (!client) {
    $("login-error").textContent = "Supabase connection is missing. Configure this browser with your Supabase project URL and publishable key.";
    return;
  }
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) { $("login-error").textContent = "Email or password is incorrect."; $("password").value = ""; $("password").focus(); return; }
  sessionStorage.setItem(SESSION_KEY, "1");
  $("login-error").textContent = "";
  showAdmin();
  loadOrders();
});

$("logout-button").addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  $("admin-app").hidden = true;
  $("login-page").hidden = false;
  $("login-form").reset();
  $("username").focus();
});

$("sidebar-collapse").addEventListener("click", () => {
  const collapsed = $("admin-app").classList.toggle("sidebar-collapsed");
  $("sidebar-collapse").setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
  $("sidebar-collapse").title = collapsed ? "Expand sidebar" : "Collapse sidebar";
});

$("menu-toggle").addEventListener("click", () => {
  if (window.matchMedia("(max-width: 760px)").matches) {
    const opened = $("admin-app").classList.toggle("mobile-nav-open");
    $("menu-toggle").setAttribute("aria-label", opened ? "Close navigation" : "Open navigation");
  } else {
    const collapsed = $("admin-app").classList.toggle("sidebar-collapsed");
    $("sidebar-collapse").setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
  }
});

$("sidebar-backdrop").addEventListener("click", closeMobileNav);

document.querySelectorAll(".side-nav .side-link").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    document.querySelectorAll(".side-nav .side-link").forEach((item) => {
      item.classList.remove("active");
      item.removeAttribute("aria-current");
    });
    link.classList.add("active");
    link.setAttribute("aria-current", "page");
    $("page-heading").textContent = link.dataset.title;
    const settingsSelected = link.dataset.title === "Settings";
    const headerSelected = link.dataset.title === "Header";
    const colorsSelected = link.dataset.title === "Color and Layout";
    const productSelected = link.dataset.title === "Product";
    const deliverySelected = link.dataset.title === "Delivery Charges";
    const footerSelected = link.dataset.title === "Footer";
    const orderFilter = link.dataset.orderFilter || (link.dataset.title === "Dashboard" ? "All" : null);
    const dashboardSelected = Boolean(orderFilter);
    $("dashboard-view").hidden = !dashboardSelected;
    $("settings-view").hidden = !settingsSelected;
    $("header-view").hidden = !headerSelected;
    $("colors-view").hidden = !colorsSelected;
    $("product-view").hidden = !productSelected;
    $("delivery-charges-view").hidden = !deliverySelected;
    $("footer-view").hidden = !footerSelected;
    if (dashboardSelected) loadOrders(orderFilter);
    if (headerSelected) loadMainTitle();
    if (colorsSelected) loadMainTitle();
    if (productSelected) loadMainTitle();
    if (deliverySelected) loadMainTitle();
    if (footerSelected) loadMainTitle();
    closeMobileNav();
  });
});

document.querySelectorAll("#orders-status-tabs button").forEach(button => button.addEventListener("click", () => {
  const filter = button.dataset.filter;
  document.querySelectorAll("#orders-status-tabs button").forEach(tab => tab.classList.toggle("active", tab === button));
  $("page-heading").textContent = filter === "All" ? "Orders" : filter;
  loadOrders(filter);
}));

$("settings-save-button").addEventListener("click", () => {
  if (!$('header-view').hidden) return $("main-title-form").requestSubmit();
  if (!$('settings-view').hidden) return $("supabase-settings-form").requestSubmit();
  if (!$('colors-view').hidden) return $("colors-form").requestSubmit();
  if (!$('product-view').hidden) return $("product-form").requestSubmit();
  if (!$('delivery-charges-view').hidden) return $("delivery-charges-form").requestSubmit();
  if (!$('footer-view').hidden) return $("footer-form").requestSubmit();
  document.querySelector('.side-nav [data-title="Settings"]').click();
  $("supabase-settings-form").requestSubmit();
});

for (const name of ["primary", "secondary", "tertiary"]) {
  $(`${name}-picker`).addEventListener("input", event => { $(`${name}-color`).value = event.currentTarget.value; });
  $(`${name}-color`).addEventListener("input", event => {
    const value = event.currentTarget.value;
    if (/^#[0-9a-f]{6}$/i.test(value)) $(`${name}-picker`).value = value;
  });
}

$("colors-form").addEventListener("submit", async event => {
  event.preventDefault();
  const colors = {
    primary_color: $("primary-color").value.trim(),
    secondary_color: $("secondary-color").value.trim(),
    tertiary_color: $("tertiary-color").value.trim()
  };
  const message = $("title-save-message");
  if (!Object.values(colors).every(value => /^#[0-9a-f]{6}$/i.test(value))) {
    message.textContent = "Enter each color as a six-digit hex code, such as #119B5D.";
    message.style.color = "#b34432";
    return;
  }
  localStorage.setItem(SITE_COLORS_KEY, JSON.stringify(colors));
  const client = getSupabaseClient();
  if (client) {
    message.textContent = "Saving colors…";
    message.style.color = "#85877e";
    const { error } = await client.from("main_page_settings").upsert({ id: 1, ...colors, updated_at: new Date().toISOString() });
    if (error) {
      message.textContent = "Saved in this browser. Run the latest setup.sql to sync colors across devices.";
      message.style.color = "#a56b13";
      return;
    }
    message.textContent = "Saved";
  } else {
    message.textContent = "Saved";
  }
  message.style.color = "#37885a";
});

$("delivery-charges-form").addEventListener("submit", async event => {
  event.preventDefault();
  const charges = readDeliveryCharges();
  const deliveryMessage = $("delivery-message-input").value.trim() || DEFAULT_DELIVERY_MESSAGE;
  const message = $("title-save-message");
  if (!charges.length) {
    message.textContent = "Add at least one delivery area.";
    message.style.color = "#b34432";
    return;
  }
  localStorage.setItem(DELIVERY_CHARGES_CACHE_KEY, JSON.stringify(charges));
  localStorage.setItem(DELIVERY_MESSAGE_CACHE_KEY, deliveryMessage);
  const client = getSupabaseClient();
  if (client) {
    message.textContent = "Saving…";
    message.style.color = "#85877e";
    const { error } = await client.from("main_page_settings").upsert({ id: 1, delivery_charges: charges, delivery_message: deliveryMessage, updated_at: new Date().toISOString() });
    if (error) {
      message.textContent = "Saved in this browser. Run the latest setup.sql to sync across devices.";
      message.style.color = "#a56b13";
      return;
    }
    message.textContent = "Saved";
  } else {
    message.textContent = "Saved in this browser only";
  }
  message.style.color = "#37885a";
});

$("add-delivery-area").addEventListener("click", () => addDeliveryAreaCard());

$("footer-form").addEventListener("submit", async event => {
  event.preventDefault();
  const links = readFooterSocialLinks();
  const contact = readFooterContact();
  const description = $("footer-description-input").value.trim();
  const location = $("footer-location-input").value.trim();
  const message = $("title-save-message");
  for (const url of Object.values(links).filter(Boolean)) {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Invalid protocol");
    } catch {
      message.textContent = "Use valid http:// or https:// profile links.";
      message.style.color = "#b34432";
      return;
    }
  }
  if (contact.email && !/^\S+@\S+\.\S+$/.test(contact.email)) {
    message.textContent = "Enter a valid email address.";
    message.style.color = "#b34432";
    return;
  }
  if (!contact.number) {
    message.textContent = "Enter a contact number.";
    message.style.color = "#b34432";
    return;
  }
  localStorage.setItem(FOOTER_SOCIAL_CACHE_KEY, JSON.stringify(links));
  localStorage.setItem(FOOTER_CONTACT_CACHE_KEY, JSON.stringify(contact));
  localStorage.setItem(FOOTER_DESCRIPTION_CACHE_KEY, description);
  localStorage.setItem(FOOTER_LOCATION_CACHE_KEY, location);
  try {
    const headerCopy = JSON.parse(localStorage.getItem(HEADER_COPY_CACHE_KEY) || "{}");
    headerCopy.order_phone = contact.number;
    localStorage.setItem(HEADER_COPY_CACHE_KEY, JSON.stringify(headerCopy));
  } catch { /* the contact details still save independently */ }
  const client = getSupabaseClient();
  if (client) {
    message.textContent = "Saving…";
    message.style.color = "#85877e";
    const { error } = await client.from("main_page_settings").upsert({ id: 1, social_links: links, footer_contact: contact, footer_description: description, footer_location: location, order_phone: contact.number, updated_at: new Date().toISOString() });
    if (error) {
      message.textContent = "Saved in this browser. Run the latest setup.sql to sync across devices.";
      message.style.color = "#a56b13";
      return;
    }
  }
  message.textContent = client ? "Saved" : "Saved in this browser only";
  message.style.color = "#37885a";
});

$("product-image-url").addEventListener("input", event => setProductImage(event.currentTarget.value));
document.querySelectorAll('input[name="pricing-mode"]').forEach(input => input.addEventListener("change", syncPricingMode));
$("add-tier-button").addEventListener("click", () => {
  const sizes = Array.from(document.querySelectorAll('.tier-row input[data-field="size"]'), input => Number(input.value) || 0);
  addTierRow({ size: Math.max(0, ...sizes) + 50 });
  syncPricingMode();
});
$("product-form").addEventListener("submit", async event => {
  event.preventDefault();
  const imageUrl = $("product-image-url").value.trim();
  const productTitle = $("product-title-input").value.trim();
  const productPricing = readProductPricing();
  const message = $("title-save-message");
  if (!productTitle) {
    message.textContent = "Enter a product title before saving.";
    message.style.color = "#b34432";
    return;
  }
  if (productPricing.mode === "multiple") {
    const sizes = productPricing.tiers.map(tier => tier.size);
    if (!sizes.length || new Set(sizes).size !== sizes.length) {
      message.textContent = "Add at least one size and use a different size for each price.";
      message.style.color = "#b34432";
      return;
    }
  }
  if (imageUrl) {
    try {
      const parsed = new URL(imageUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Invalid protocol");
    } catch {
      message.textContent = "Enter a valid image link or upload an image file.";
      message.style.color = "#b34432";
      return;
    }
  }
  localStorage.setItem(PRODUCT_IMAGE_CACHE_KEY, imageUrl);
  localStorage.setItem(PRODUCT_TITLE_CACHE_KEY, productTitle);
  localStorage.setItem(PRODUCT_PRICING_CACHE_KEY, JSON.stringify(productPricing));
  const client = getSupabaseClient();
  if (client) {
    message.textContent = "Saving…";
    message.style.color = "#85877e";
    const { error } = await client.from("main_page_settings").upsert({ id: 1, product_image_url: imageUrl, product_title: productTitle, product_pricing: productPricing, updated_at: new Date().toISOString() });
    if (error) {
      message.textContent = "Saved in this browser. Run the latest setup.sql to sync across devices.";
      message.style.color = "#a56b13";
      return;
    }
  }
  message.textContent = "Saved";
  message.style.color = "#37885a";
});

$("product-image-file").addEventListener("change", async event => {
  const file = event.currentTarget.files?.[0];
  if (!file) return;
  const status = $("product-upload-message");
  if (!file.type.startsWith("image/")) {
    status.textContent = "Choose an image file.";
    status.style.color = "#b34432";
    event.currentTarget.value = "";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    status.textContent = "Product images must be 5 MB or smaller.";
    status.style.color = "#b34432";
    event.currentTarget.value = "";
    return;
  }
  const client = getSupabaseClient();
  if (!client) {
    status.textContent = "Set up Supabase in Settings to upload a product image. You can use an image link without it.";
    status.style.color = "#a56b13";
    event.currentTarget.value = "";
    return;
  }
  status.textContent = "Uploading image…";
  status.style.color = "#85877e";
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, "-");
  const objectPath = `products/${Date.now()}-${safeName}`;
  const { error } = await client.storage.from("site-assets").upload(objectPath, file, { contentType: file.type, upsert: false });
  if (error) {
    status.textContent = `Upload failed: ${error.message}`;
    status.style.color = "#b34432";
    return;
  }
  const { data } = client.storage.from("site-assets").getPublicUrl(objectPath);
  $("product-image-url").value = data.publicUrl;
  setProductImage(data.publicUrl);
  status.textContent = "Image uploaded. Click Save changes to publish it.";
  status.style.color = "#37885a";
});

$("main-title-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = $("main-title-input").value.trim();
  const brandName = $("brand-name-input").value.trim();
  const logoUrl = $("logo-url-input").value.trim();
  const headerCopy = {
    benefit_natural: $("benefit-natural-input").value.trim(),
    benefit_payment: $("benefit-payment-input").value.trim(),
    benefit_delivery: $("benefit-delivery-input").value.trim(),
    benefit_trusted: $("benefit-trusted-input").value.trim(),
    order_phone: $("order-phone-input").value.trim()
  };
  const message = $("title-save-message");
  if (!title || !brandName) {
    message.textContent = "Enter both the brand name and page title before saving.";
    message.style.color = "#b34432";
    return;
  }
  if (logoUrl) {
    try {
      const parsedLogoUrl = new URL(logoUrl);
      if (!["http:", "https:"].includes(parsedLogoUrl.protocol)) throw new Error("Invalid URL protocol");
    } catch {
      message.textContent = "Enter a valid logo image URL or upload a logo file.";
      message.style.color = "#b34432";
      return;
    }
  }
  const client = getSupabaseClient();
  if (!client) {
    message.textContent = "Add your Supabase URL and publishable key in Settings first.";
    message.style.color = "#b34432";
    return;
  }
  message.textContent = "Saving…";
  message.style.color = "#85877e";
  const { error } = await client.from("main_page_settings").upsert({ id: 1, main_title: title, brand_name: brandName, logo_url: logoUrl, ...headerCopy, updated_at: new Date().toISOString() });
  if (error) {
    message.textContent = `Could not save title: ${error.message}`;
    message.style.color = "#b34432";
    return;
  }
  localStorage.setItem(MAIN_TITLE_CACHE_KEY, title);
  localStorage.setItem(BRAND_NAME_CACHE_KEY, brandName);
  localStorage.setItem(LOGO_URL_CACHE_KEY, logoUrl);
  localStorage.setItem(HEADER_COPY_CACHE_KEY, JSON.stringify(headerCopy));
  setHeaderCopy(headerCopy);
  applyBrandName(brandName, logoUrl);
  message.textContent = "Saved";
  message.style.color = "#37885a";
});

$("logo-file-input").addEventListener("change", async (event) => {
  const file = event.currentTarget.files?.[0];
  if (!file) return;
  const status = $("logo-upload-message");
  if (!file.type.startsWith("image/")) {
    status.textContent = "Choose an image file.";
    status.style.color = "#b34432";
    event.currentTarget.value = "";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    status.textContent = "Logo files must be 5 MB or smaller.";
    status.style.color = "#b34432";
    event.currentTarget.value = "";
    return;
  }
  const client = getSupabaseClient();
  if (!client) {
    status.textContent = "Save your Supabase URL and publishable key in Settings first.";
    status.style.color = "#b34432";
    return;
  }
  status.textContent = "Uploading logo…";
  status.style.color = "#85877e";
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, "-");
  const objectPath = `logos/${Date.now()}-${safeName}`;
  const { error } = await client.storage.from("site-assets").upload(objectPath, file, { contentType: file.type, upsert: false });
  if (error) {
    status.textContent = `Upload failed: ${error.message}`;
    status.style.color = "#b34432";
    return;
  }
  const { data } = client.storage.from("site-assets").getPublicUrl(objectPath);
  $("logo-url-input").value = data.publicUrl;
  status.textContent = "Logo uploaded. Save changes to publish it.";
  status.style.color = "#37885a";
});

$("supabase-settings-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const url = $("supabase-url").value.trim().replace(/\/$/, "");
  const publishableKey = $("supabase-key").value.trim();
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    parsedUrl = null;
  }
  if (!parsedUrl || parsedUrl.protocol !== "https:") {
    $("settings-save-message").textContent = "Enter a valid https:// Supabase project URL.";
    $("settings-save-message").style.color = "#b34432";
    return;
  }
  if (!publishableKey) {
    $("settings-save-message").textContent = "Enter your Supabase publishable key.";
    $("settings-save-message").style.color = "#b34432";
    return;
  }
  localStorage.setItem(SUPABASE_SETTINGS_KEY, JSON.stringify({ url, publishableKey }));
  $("supabase-url").value = url;
  $("settings-save-message").textContent = "Supabase settings saved in this browser. Checking connection…";
  $("settings-save-message").style.color = "#37885a";
  const client = getSupabaseClient();
  const { error } = await client.from("main_page_settings").select("id").eq("id", 1).maybeSingle();
  if (error) {
    $("settings-save-message").textContent = `Credentials saved, but connection failed: ${error.message}`;
    $("settings-save-message").style.color = "#b34432";
  } else {
    const mode = document.querySelector('input[name="payment-mode"]:checked').value;
    const required = mode === "prepaid";
    const apiKey = $("uddoktapay-api-key").value.trim();
    const baseUrl = $("uddoktapay-base-url").value.trim().replace(/\/$/, "");
    if (required && !apiKey) {
      $("settings-save-message").textContent = "Enter the UddoktaPay API key to enable prepayment.";
      $("settings-save-message").style.color = "#b34432";
      return;
    }
    if (required && !/^https:\/\//i.test(baseUrl)) { $("settings-save-message").textContent = "Enter a valid HTTPS UddoktaPay API base URL."; return; }
    if (required) {
      const { error: keyError } = await client.from("payment_settings").upsert({ id: 1, uddoktapay_api_key: apiKey, uddoktapay_base_url: baseUrl, updated_at: new Date().toISOString() });
      if (keyError) { $("settings-save-message").textContent = `Could not save API key: ${keyError.message}`; return; }
    }
    const { error: modeError } = await client.from("main_page_settings").upsert({ id: 1, payment_required: required, updated_at: new Date().toISOString() });
    if (modeError) { $("settings-save-message").textContent = `Could not save payment mode: ${modeError.message}`; return; }
    localStorage.setItem(PAYMENT_MODE_CACHE_KEY, mode);
    $("settings-save-message").textContent = "Supabase connected. Payment settings saved.";
    $("settings-save-message").style.color = "#37885a";
  }
});

document.querySelectorAll('input[name="payment-mode"]').forEach(radio => radio.addEventListener("change", () => {
  $("uddoktapay-key-wrap").hidden = radio.value !== "prepaid";
}));

applyBrandName(localStorage.getItem(BRAND_NAME_CACHE_KEY), localStorage.getItem(LOGO_URL_CACHE_KEY) || "");

sessionStorage.removeItem(SESSION_KEY);
