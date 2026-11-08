// رقم واتساب المكتبة بصيغة دولية، أرقام فقط (مثال: 963912345678).
const WHATSAPP_NUMBER = "963998495881";
const CART_KEY = "yousef-cart", THEME_KEY = "yousef-theme", MAX_QTY = 99;

const categories = new Map([["all", "الكل"]]);
let items = [], selectedCategory = "all";
let cart = new Map();

const $ = (id) => document.getElementById(id);
const el = {
    grid: $("menuGrid"), filters: $("categoryFilters"), select: $("categorySelect"), search: $("menuSearch"), noResults: $("noResults"), status: $("statusMessage"),
    theme: $("themeToggle"),
    cartButton: $("cartButton"), cartCount: $("cartCount"), modal: $("cartModal"), closeCart: $("closeCartButton"),
    cartItems: $("cartItems"), emptyCart: $("emptyCart"), total: $("cartTotal"), form: $("orderForm"), name: $("customerName"), message: $("formMessage")
};

function format(value) { return `${new Intl.NumberFormat("ar-SY").format(value)} ل.س`; }
function make(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
function normalize(value) { return value.toLowerCase().replace(/[\u064B-\u065F\u0640]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").trim(); }
function available(id) { return items.find((item) => item.id === id && item.available); }

function loadCart() {
    try { JSON.parse(localStorage.getItem(CART_KEY) || "[]").forEach(([id, qty]) => { if (Number.isInteger(qty) && qty > 0 && qty <= MAX_QTY) cart.set(id, qty); }); } catch {}
}
function saveCart() { try { localStorage.setItem(CART_KEY, JSON.stringify([...cart])); } catch {} }
function orderNumber() {
    const d = new Date(), p = (n) => String(n).padStart(2, "0");
    return `${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function loadMenu() {
    try {
        const response = await fetch("menu-data.json", { cache: "no-store" });
        if (!response.ok) throw new Error(response.status);
        const data = await response.json();
        data.categories.forEach((category) => categories.set(category.id, category.name));
        items = data.items;
        for (const id of [...cart.keys()]) if (!available(id)) cart.delete(id);
        saveCart();
        renderFilters(); renderMenu(); renderCart();
    } catch {
        el.status.replaceChildren(make("p", "", "تعذر تحميل المنتجات، حاول مرة أخرى"));
        const retry = make("button", "primary-button", "إعادة المحاولة"); retry.type = "button"; retry.addEventListener("click", () => { el.status.classList.add("hidden"); loadMenu(); });
        el.status.append(retry); el.status.classList.remove("hidden");
    }
}

function renderFilters() {
    el.filters.replaceChildren(...[...categories].map(([id, name]) => {
        const button = make("button", `filter-button${id === selectedCategory ? " active" : ""}`, name);
        button.type = "button"; button.dataset.category = id; return button;
    }));
    el.select.replaceChildren(...[...categories].map(([id, name]) => {
        const option = make("option", "", name);
        option.value = id;
        option.selected = id === selectedCategory;
        return option;
    }));
}

function renderMenu() {
    const query = normalize(el.search.value);
    const visible = items.filter((item) => (selectedCategory === "all" || item.category === selectedCategory) && (!query || normalize(`${item.name} ${item.description}`).includes(query)));
    el.grid.replaceChildren(...visible.map((item) => {
        const card = make("article", "menu-card"), info = make("div"), footer = make("div", "card-footer");
        info.append(make("h3", "item-name", item.name), make("p", "description", item.description));
        const add = make("button", "add-button", item.available ? "+ أضف إلى السلة" : "غير متوفر");
        add.type = "button"; add.dataset.addId = item.id; if (item.available) add.setAttribute("aria-label", `أضف ${item.name} إلى السلة`); add.disabled = !item.available;
        footer.append(make("strong", "price", format(item.price)), add);
        card.append(info, footer); return card;
    }));
    el.noResults.classList.toggle("hidden", visible.length > 0);
}

function renderCart() {
    const entries = [...cart].map(([id, qty]) => ({ item: available(id), qty })).filter((entry) => entry.item);
    el.cartCount.textContent = entries.reduce((sum, entry) => sum + entry.qty, 0);
    el.total.textContent = format(entries.reduce((sum, entry) => sum + entry.item.price * entry.qty, 0));
    el.emptyCart.classList.toggle("hidden", entries.length > 0);
    el.cartItems.replaceChildren(...entries.map(({ item, qty }) => {
        const row = make("div", "cart-row"), title = make("div", "cart-row-title"), controls = make("div", "quantity-controls");
        title.append(make("span", "", item.name), make("small", "", format(item.price * qty)));
        controls.append(qtyButton("−", "decrease", item.id), make("span", "quantity", qty), qtyButton("+", "increase", item.id), qtyButton("حذف", "remove", item.id));
        row.append(title, controls); return row;
    }));
}
const ARIA_ACTIONS = { decrease: "إنقاص كمية", increase: "زيادة كمية", remove: "حذف" };
function qtyButton(label, action, id) { const button = make("button", "quantity-button", label); button.type = "button"; button.setAttribute("aria-label", `${ARIA_ACTIONS[action]} ${available(id)?.name || ""}`.trim()); button.dataset.action = action; button.dataset.id = id; return button; }

function changeQuantity(id, delta) {
    const next = (cart.get(id) || 0) + delta;
    if (next <= 0) cart.delete(id); else if (next > MAX_QTY) return; else cart.set(id, next);
    saveCart(); renderCart();
}

function setBackgroundInert(value) {
    [document.querySelector("header"), document.querySelector("main"), el.cartButton].forEach((node) => { if (node) node.inert = value; });
    document.body.classList.toggle("modal-open", value);
    el.cartButton.setAttribute("aria-expanded", String(value));
}
function openCart() { setBackgroundInert(true); el.modal.classList.remove("hidden"); el.closeCart.focus(); }
function closeCart() { el.modal.classList.add("hidden"); el.message.classList.add("hidden"); setBackgroundInert(false); el.cartButton.focus(); }
function showError(text) { el.message.textContent = text; el.message.classList.remove("hidden"); }

function submitOrder(event) {
    event.preventDefault();
    const entries = [...cart].map(([id, qty]) => ({ item: available(id), qty })).filter((entry) => entry.item);
    if (!entries.length) return showError("أضف منتجاً واحداً على الأقل.");
    const name = el.name.value.replace(/\s+/g, " ").trim();
    if (name.length < 2 || name.length > 30) return showError("اكتب اسم المستلم (من حرفين إلى 30 حرفاً).");
    if (!/^\d{8,15}$/.test(WHATSAPP_NUMBER)) return showError("رقم واتساب غير مضبوط.");
    const number = orderNumber();
    const total = entries.reduce((sum, entry) => sum + entry.item.price * entry.qty, 0);
    const lines = entries.map(({ item, qty }, index) => `${index + 1}. ${item.name} × ${qty} = ${format(item.price * qty)}`);
    const text = ["مرحباً، أريد طلباً من مكتبة اليوسف", `رقم الطلب: ${number}`, "", `اسم المستلم: ${name}`, "", ...lines, "", `المجموع: ${format(total)}`].join("\n");

    window.location.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

el.filters.addEventListener("click", (event) => { const button = event.target.closest("button[data-category]"); if (button) { selectedCategory = button.dataset.category; renderFilters(); renderMenu(); } });
el.select.addEventListener("change", () => { selectedCategory = el.select.value; renderFilters(); renderMenu(); });
el.search.addEventListener("input", renderMenu);
el.grid.addEventListener("click", (event) => { const button = event.target.closest("button[data-add-id]"); if (button) changeQuantity(button.dataset.addId, 1); });
el.cartItems.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    if (button.dataset.action === "remove") cart.delete(button.dataset.id);
    else changeQuantity(button.dataset.id, button.dataset.action === "increase" ? 1 : -1);
    if (button.dataset.action === "remove") { saveCart(); renderCart(); }
});
el.cartButton.addEventListener("click", openCart);
el.closeCart.addEventListener("click", closeCart);
el.modal.addEventListener("click", (event) => { if (event.target === el.modal) closeCart(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !el.modal.classList.contains("hidden")) closeCart(); });
el.form.addEventListener("submit", submitOrder);

function icon(dark) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    for (const [key, value] of Object.entries({ viewBox: "0 0 24 24", width: "20", height: "20", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) svg.setAttribute(key, value);
    path.setAttribute("d", dark ? "M12 3v2m0 14v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M3 12h2m14 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" : "M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5z");
    svg.append(path);
    return svg;
}
function updateThemeButton() {
    const dark = document.documentElement.classList.contains("dark");
    el.theme.setAttribute("aria-pressed", String(dark));
    el.theme.setAttribute("aria-label", dark ? "تفعيل الوضع النهاري" : "تفعيل الوضع الليلي");
    el.theme.replaceChildren(icon(dark));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0f172a" : "#2563eb");
}
el.theme.addEventListener("click", () => {
    const dark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    try { localStorage.setItem(THEME_KEY, dark ? "dark" : "light"); } catch {}
    updateThemeButton();
});

updateThemeButton();
loadCart(); renderCart(); loadMenu();
