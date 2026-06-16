/* ============================================================
   ون تتش | ONE TOUCH — script.js
   Handles: Data Fetching · Rendering · WhatsApp · UI
   ============================================================ */

'use strict';

// ─── CONSTANTS ────────────────────────────────────────────────
const WA_NUMBER   = '967773233997';
 const DATA_BASE   = './'; 
const CURRENCY    = 'ريال';

// ─── STATE ────────────────────────────────────────────────────
let allProducts   = [];
let allCategories = [];
let activeFilter  = 'all';

// ─── DOM REFS ─────────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ─── UTILITY: FORMAT PRICE ─────────────────────────────────────
function formatPrice(n) {
  return Number(n).toLocaleString('ar-YE') + ' ' + CURRENCY;
}

// ─── UTILITY: CALC DISCOUNTED PRICE ──────────────────────────
function calcDiscounted(price, discount) {
  if (!discount || discount <= 0) return null;
  return Math.round(price * (1 - discount / 100));
}

// ─── UTILITY: WHATSAPP ORDER ──────────────────────────────────
function orderOnWhatsApp(productName) {
  const msg = `مرحباً ون تتش، أريد طلب هذا المنتج المعروض في موقعكم الإلكتروني: ${productName}`;
  const encoded = encodeURIComponent(msg);
  const url = `https://wa.me/${WA_NUMBER}?text=${encoded}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

// ─── FETCH WRAPPER ─────────────────────────────────────────────
async function fetchJSON(path) {
  try {
    const res = await fetch(path + '?v=' + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status} — ${path}`);
    return await res.json();
  } catch (err) {
    console.error('[ONE TOUCH]', err);
    return null;
  }
}

// ─── RENDER: CATEGORY CARD ────────────────────────────────────
function renderCatCard(cat) {
  const card = document.createElement('div');
  card.className = 'cat-card reveal';
  card.setAttribute('data-cat', cat.id || cat.name);
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `فلتر ${cat.name}`);

  card.innerHTML = `
    <div class="cat-icon">${cat.icon || '📦'}</div>
    <div class="cat-name">${cat.name}</div>
    ${cat.description ? `<div class="cat-desc">${cat.description}</div>` : ''}
  `;

  // Clicking category card → filter products
  const activate = () => setFilter(cat.name);
  card.addEventListener('click', activate);
  card.addEventListener('keydown', e => e.key === 'Enter' && activate());

  return card;
}

// ─── RENDER: PRODUCT CARD ─────────────────────────────────────
function renderProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card reveal';
  card.setAttribute('data-category', product.category || '');

  const discountedPrice = calcDiscounted(product.price, product.discount);
  const isAvailable     = product.availability !== 'نفذت الكمية';

  // Badge HTML
  let badgeHTML = '';
  if (product.discount > 0) {
    badgeHTML += `<span class="badge badge-discount">خصم ${product.discount}%</span>`;
  }
  if (!isAvailable) {
    badgeHTML += `<span class="badge badge-out">نفذت الكمية</span>`;
  } else {
    badgeHTML += `<span class="badge badge-in">متوفر</span>`;
  }

  // Price HTML
  const priceHTML = discountedPrice
    ? `<span class="price-current">${formatPrice(discountedPrice)}</span>
       <span class="price-old">${formatPrice(product.price)}</span>`
    : `<span class="price-current">${formatPrice(product.price)}</span>`;

  card.innerHTML = `
    <div class="prod-img-wrap">
      <img
        class="prod-img"
        src="${product.image || 'https://placehold.co/400x400/111120/d4af37?text=ONE+TOUCH'}"
        alt="${product.name}"
        loading="lazy"
        onerror="this.src='https://placehold.co/400x400/111120/d4af37?text=ONE+TOUCH'"
      />
      <div class="badge-wrap">${badgeHTML}</div>
    </div>
    <div class="prod-body">
      <h3 class="prod-name">${product.name}</h3>
      ${product.description ? `<p class="prod-desc">${product.description}</p>` : ''}
      <div class="prod-price-row">${priceHTML}</div>
      ${product.category ? `<span class="prod-cat"><i class="fas fa-tag"></i>${product.category}</span>` : ''}
      <button
        class="btn btn-order"
        ${!isAvailable ? 'disabled aria-disabled="true"' : ''}
        aria-label="اطلب ${product.name} عبر واتساب"
      >
        <i class="fab fa-whatsapp"></i>
        ${isAvailable ? 'اطلب الآن' : 'نفذت الكمية'}
      </button>
    </div>
  `;

  // WhatsApp order
  if (isAvailable) {
    $('button', card).addEventListener('click', () => orderOnWhatsApp(product.name));
  }

  return card;
}

// ─── RENDER: CATEGORIES ──────────────────────────────────────
function renderCategories(categories) {
  const grid = $('#categoriesGrid');
  grid.innerHTML = '';

  if (!categories.length) {
    grid.innerHTML = '<p style="color:var(--text-2);text-align:center;grid-column:1/-1">لا توجد فئات</p>';
    return;
  }

  categories.forEach(cat => grid.appendChild(renderCatCard(cat)));
  observeReveal();
}

// ─── RENDER: FILTER TABS ─────────────────────────────────────
function renderFilterTabs(categories) {
  const bar = $('#filterBar');

  // Clear existing (keep "الكل")
  $$('.filter-btn:not([data-cat="all"])', bar).forEach(b => b.remove());

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.cat = cat.name;
    btn.textContent = cat.name;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', 'false');
    btn.addEventListener('click', () => setFilter(cat.name));
    bar.appendChild(btn);
  });
}

// ─── RENDER: PRODUCTS ─────────────────────────────────────────
function renderProducts(products) {
  const grid    = $('#productsGrid');
  const empty   = $('#emptyState');
  grid.innerHTML = '';

  const filtered = activeFilter === 'all'
    ? products
    : products.filter(p => p.category === activeFilter);

  if (!filtered.length) {
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  filtered.forEach(p => grid.appendChild(renderProductCard(p)));
  observeReveal();
}

// ─── FILTER LOGIC ─────────────────────────────────────────────
function setFilter(category) {
  activeFilter = category;

  // Update filter buttons
  $$('.filter-btn').forEach(btn => {
    const isActive = btn.dataset.cat === category;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
  });

  // Scroll to products on mobile
  if (window.innerWidth < 900) {
    $('#products').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  renderProducts(allProducts);
}

// ─── INIT "ALL" FILTER BUTTON ─────────────────────────────────
$('[data-cat="all"]').addEventListener('click', () => setFilter('all'));

// ─── LOAD DATA ────────────────────────────────────────────────
async function loadData() {
  const [catData, prodData] = await Promise.all([
    fetchJSON(DATA_BASE + 'categories.json'),
    fetchJSON(DATA_BASE + 'products.json')
  ]);

  // Categories
  allCategories = catData?.categories || [];
  renderCategories(allCategories);
  renderFilterTabs(allCategories);

  // Products
  allProducts = prodData?.products || [];
  renderProducts(allProducts);
}

// ─── NAVBAR: SCROLL BEHAVIOUR ─────────────────────────────────
function initNavbar() {
  const nav      = $('#navbar');
  const backTop  = $('#backTop');

  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 40);
    backTop.classList.toggle('visible', y > 400);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Back to top
  backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ─── MOBILE MENU ──────────────────────────────────────────────
function initMobileMenu() {
  const hamburger = $('#hamburger');
  const navLinks  = $('#navLinks');
  const overlay   = $('#navOverlay');

  const close = () => {
    navLinks.classList.remove('open');
    overlay.classList.remove('visible');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  const open = () => {
    navLinks.classList.add('open');
    overlay.classList.add('visible');
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };

  hamburger.addEventListener('click', () => {
    navLinks.classList.contains('open') ? close() : open();
  });

  overlay.addEventListener('click', close);

  // Close on nav link click
  $$('.nav-link', navLinks).forEach(link => link.addEventListener('click', close));
}

// ─── REVEAL OBSERVER ──────────────────────────────────────────
let revealObserver;
function observeReveal() {
  if (revealObserver) revealObserver.disconnect();

  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  $$('.reveal').forEach(el => revealObserver.observe(el));
}

// ─── ACTIVE NAV LINK ON SCROLL ────────────────────────────────
function initActiveNavLink() {
  const sections = $$('section[id]');
  const links    = $$('.nav-link');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(l => l.classList.remove('active-nav'));
        const active = links.find(l => l.getAttribute('href') === `#${entry.target.id}`);
        if (active) active.classList.add('active-nav');
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(s => observer.observe(s));
}

// ─── FOOTER YEAR ──────────────────────────────────────────────
function setFooterYear() {
  const el = $('#footerYear');
  if (el) el.textContent = new Date().getFullYear();
}

// ─── INIT ─────────────────────────────────────────────────────
function init() {
  setFooterYear();
  initNavbar();
  initMobileMenu();
  initActiveNavLink();
  loadData();
}

document.addEventListener('DOMContentLoaded', init);
