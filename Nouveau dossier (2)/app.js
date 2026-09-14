let cart = [];
let currentFilter = "all";

const grid = document.getElementById("productGrid");
const emptyMessage = document.getElementById("emptyMessage");
const cartBtn = document.getElementById("cartBtn");
const cartModal = document.getElementById("cartModal");
const closeCart = document.getElementById("closeCart");

function renderProducts() {
  const items = currentFilter === "all"
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === currentFilter);

  grid.innerHTML = items.map(p => `
    <article class="card">
      <img src="${p.image}" alt="${p.name}">
      <div class="card-body">
        <h3>${p.name}</h3>
        <p>${p.description || ""}</p>
        <div class="price">${p.price} ${STORE.currency}</div>
        <button class="btn" onclick="addToCart(${p.id})">أضف للسلة</button>
      </div>
    </article>
  `).join("");

  emptyMessage.style.display = items.length ? "none" : "block";
}

function addToCart(id) {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) return;
  cart.push(product);
  updateCart();
}

function updateCart() {
  document.getElementById("cartCount").textContent = cart.length;
  const box = document.getElementById("cartItems");
  box.innerHTML = cart.length
    ? cart.map((p,i) => `<div class="cart-row"><span>${p.name}</span><b>${p.price} ${STORE.currency}</b><button onclick="removeFromCart(${i})">✕</button></div>`).join("")
    : "<p>السلة فارغة.</p>";
  const total = cart.reduce((sum,p) => sum + Number(p.price || 0), 0);
  document.getElementById("cartTotal").textContent = `${total} ${STORE.currency}`;
}

function removeFromCart(i) {
  cart.splice(i,1);
  updateCart();
}

document.querySelectorAll(".filters button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filters button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderProducts();
  });
});

cartBtn.addEventListener("click", () => {
  cartModal.classList.remove("hidden");
  updateCart();
});

closeCart.addEventListener("click", () => cartModal.classList.add("hidden"));
cartModal.addEventListener("click", e => {
  if (e.target === cartModal) cartModal.classList.add("hidden");
});

document.getElementById("whatsappCheckout").addEventListener("click", () => {
  if (!cart.length) return alert("السلة فارغة.");
  const lines = cart.map(p => `- ${p.name}: ${p.price} ${STORE.currency}`);
  const total = cart.reduce((s,p) => s + Number(p.price || 0), 0);
  const text = `مرحبًا Haja Naar، أريد طلب:\n${lines.join("\n")}\nالمجموع: ${total} ${STORE.currency}`;
  window.open(`https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(text)}`, "_blank");
});

document.getElementById("whatsappLink").href = `https://wa.me/${STORE.whatsapp}`;
document.getElementById("year").textContent = new Date().getFullYear();
renderProducts();
