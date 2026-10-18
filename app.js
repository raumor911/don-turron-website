(() => {
  'use strict';
  const catalog = window.DON_TURRON_CATALOG || [];
  const config = window.DON_TURRON_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const KEY = 'dt-selection-v1';
  const AGE_KEY = 'dt-age-confirmed-v1';
  const MAX_QUANTITY = 20;
  const REAL_HUMIDOR_ID = 'humidor-viaje-5-puros';
  const PHOTO_VIEWS = [
    {src:'assets/products/humidor-viaje-interior.webp', label:'Interior abierto'},
    {src:'assets/products/humidor-viaje-medidas.webp', label:'Estuche cerrado y medidas ilustrativas'},
    {src:'assets/products/humidor-viaje-detalles.webp', label:'Cierres y humidificador'},
    {src:'assets/products/humidor-viaje-ambientado.webp', label:'Vista ambientada'}
  ];
  const CENICERO_VIEWS = [
    {src:'assets/products/set-portatil-conjunto.webp', label:'Vista del conjunto completo'},
    {src:'assets/products/set-portatil-herramientas.webp', label:'Guillotina, cortador en V y punzón'},
    {src:'assets/products/set-portatil-cenicero.webp', label:'Cenicero portátil de cerámica en uso; puro no incluido'},
    {src:'assets/products/set-portatil-punzon.webp', label:'Detalle del punzón (punch)'},
    {src:'assets/products/set-portatil-cortador-v.webp', label:'Detalle del cortador en V'}
  ];
  const photosOf = p => p.id === REAL_HUMIDOR_ID ? PHOTO_VIEWS : p.id === 'cenicero-mesa' ? CENICERO_VIEWS : null;
  function productPicture(p, placement) {
    if (!photosOf(p)) return `<img src="assets/${html(p.art)}.svg" alt="Ilustración conceptual de ${html(p.name)}" loading="lazy" />`;
    return `<img class="travel-photo travel-photo-${placement}" data-product-id="${html(p.id)}" src="${photosOf(p)[0].src}" alt="Fotografía de ${html(p.name)}; ${photosOf(p)[0].label}" loading="lazy" width="620" height="620" />`;
  }
  let selectedFilter = 'todos';
  let lastFocused = null;
  let currentDialog = null;
  let toastTimer = null;
  let cart = {};

  const html = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const productById = (id) => catalog.find(p => p.id === id);
  const asInt = (x) => Number.isFinite(Number(x)) ? Math.max(0, Math.min(MAX_QUANTITY, Math.floor(Number(x)))) : 0;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) { /* optional persistence */ } };
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        Object.entries(saved).forEach(([id, count]) => { if (productById(id) && asInt(count)) cart[id] = asInt(count); });
      }
    } catch(e) { cart = {}; }
  }
  const count = () => Object.values(cart).reduce((sum, n) => sum + n, 0);
  const singular = (n) => `${n} ${n === 1 ? 'artículo' : 'artículos'}`;

  function toast(message) {
    const node = $('toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('visible'), 3200);
  }

  function renderProducts() {
    const visible = selectedFilter === 'todos' ? catalog : catalog.filter(p => p.category === selectedFilter);
    $('result-count').textContent = singular(visible.length);
    $('product-grid').innerHTML = visible.map(p => `
      <article class="product-card" data-id="${html(p.id)}">
        <div class="product-art art-${html(p.art)}">
          ${p.badge ? `<span class="product-badge">${html(p.badge)}</span>` : ''}
          ${productPicture(p, "card")}
          <button type="button" class="product-quick" data-detail="${html(p.id)}" aria-label="Ver detalles de ${html(p.name)}">↗</button>
        </div>
        <div class="product-details"><div class="product-category">${html(p.categoryLabel.toUpperCase())}</div>
          <h3>${html(p.name)}</h3><p class="product-subtitle">${html(p.subtitle)}</p>
          <div class="product-buy"><span class="product-price">Precio por confirmar</span><button type="button" class="add-product" data-add="${html(p.id)}">Seleccionar <span>＋</span></button></div>
        </div>
      </article>`).join('');
  }

  function setFilter(filter, scroll = false) {
    if (filter !== 'todos' && !catalog.some(p => p.category === filter)) return;
    selectedFilter = filter;
    document.querySelectorAll('[data-filter]').forEach(btn => {
      const active = btn.dataset.filter === filter;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    renderProducts();
    if (scroll) setTimeout(() => $('coleccion').scrollIntoView({behavior:'smooth'}), 30);
  }

  function updateCounters() {
    $('cart-count').textContent = count();
    $('drawer-count').textContent = `(${count()})`;
  }
  function changeQuantity(id, by) {
    if (!productById(id)) return;
    const newQuantity = asInt((cart[id] || 0) + by);
    if (newQuantity > 0) cart[id] = newQuantity;
    else delete cart[id];
    save();
    updateCounters();
    renderDrawer();
    if (by > 0) toast('Pieza añadida a tu selección.');
  }
  function renderDrawer() {
    const contents = $('drawer-contents');
    const items = Object.entries(cart).map(([id, qty]) => ({product:productById(id),qty})).filter(v => v.product);
    if (!items.length) contents.innerHTML = `<div class="drawer-empty"><span class="empty-signet">✦</span><h3>Tu selección está vacía.</h3><p>Descubre la colección y guarda los accesorios que llamen tu atención.</p></div>`;
    else contents.innerHTML = items.map(({product:p,qty}) => `
      <div class="drawer-line"><div class="drawer-art">${productPicture(p, "drawer")}</div>
        <div class="drawer-line-text"><h3>${html(p.name)}</h3><p>PRECIO Y DISPONIBILIDAD POR CONFIRMAR</p>
          <div class="qty-controls"><button type="button" data-qty="-1" data-id="${html(p.id)}" aria-label="Quitar una unidad de ${html(p.name)}">−</button><span>${qty}</span><button type="button" data-qty="1" data-id="${html(p.id)}" aria-label="Agregar una unidad de ${html(p.name)}">+</button></div>
          <button type="button" class="remove-line" data-remove="${html(p.id)}">Eliminar</button>
        </div></div>`).join('');
    $('copy-selection').disabled = !items.length;
    $('request-selection').hidden = !items.length || !validEmail(config.contactEmail);
  }
  function validEmail(email) { return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
  function selectionText() {
    const lines = ['Don Turrón — Consulta de disponibilidad', '', ...Object.entries(cart).filter(([id]) => productById(id)).map(([id,qty]) => `• ${productById(id).name} × ${qty}`),'','Solicito confirmar precios, existencias y opciones de entrega.','Esta lista no constituye un pedido ni una reserva.'];
    return lines.join('\n');
  }
  async function copySelection() {
    if (!count()) return;
    const text = selectionText();
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const field = document.createElement('textarea'); field.value = text; field.style.position='fixed'; field.style.left='-9999px'; document.body.appendChild(field); field.select();
        if (!document.execCommand('copy')) throw new Error('copy failed');
        field.remove();
      }
      toast('Selección copiada. Compártela cuando quieras.');
    } catch (e) {
      toast('No fue posible copiar automáticamente.');
    }
  }

  function lockPage(state) { document.body.classList.toggle('locked', state); }
  function openDialog(el, backdrop, trigger) {
    if (currentDialog) closeDialog();
    lastFocused = trigger || document.activeElement;
    backdrop.hidden = false;
    el.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => el.classList.add('open'));
    lockPage(true);
    currentDialog = {el, backdrop};
    el.focus();
  }
  function closeDialog() {
    if (!currentDialog) return;
    const {el, backdrop} = currentDialog;
    el.classList.remove('open');
    el.setAttribute('aria-hidden','true');
    backdrop.hidden = true;
    lockPage(false);
    currentDialog = null;
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }
  function openSelection(trigger) {
    renderDrawer();
    openDialog($('selection-drawer'), $('drawer-backdrop'), trigger);
  }
  function openProduct(id, trigger) {
    const p = productById(id);
    if (!p) return;
    $('product-modal-content').innerHTML = `<div class="modal-content-layout"><div class="modal-art">${productPicture(p, "modal")}${photosOf(p) ? `<div class="travel-gallery-controls" role="group" aria-label="Vistas de ${html(p.name)}">${photosOf(p).map((item, i) => `<button type="button" data-photo-index="${i}" aria-label="${item.label}" aria-pressed="${i === 0}">${String(i + 1).padStart(2, "0")}</button>`).join("")}</div>` : ""}</div><div class="modal-text"><p class="eyebrow eyebrow-dark">${html(p.categoryLabel.toUpperCase())} / ${photosOf(p) ? "ARTÍCULO PRESENTADO" : "CATÁLOGO CONCEPTUAL"}</p><h2 id="product-modal-name">${html(p.name)}</h2><p>${html(p.description)}</p><ul>${p.features.map(s=>`<li>${html(s)}</li>`).join('')}</ul><p class="modal-caption">Precio, inventario y especificaciones pendientes de validación.</p><button type="button" class="btn btn-gold" data-add="${html(p.id)}">Añadir a mi selección <span>＋</span></button></div></div>`;
    openDialog($('product-modal'), $('product-modal-backdrop'), trigger);
  }
  function trapFocus(event) {
    if (event.key !== 'Tab') return;
    const container = !($('age-overlay').hidden) ? $('age-overlay') : (currentDialog && currentDialog.el);
    if (!container) return;
    const focusable = [...container.querySelectorAll('button:not([disabled]):not([hidden]),a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(el=>el.getClientRects().length);
    if (!focusable.length) return;
    const first=focusable[0],last=focusable[focusable.length-1];
    if (event.shiftKey && document.activeElement===first) {event.preventDefault();last.focus();}
    else if (!event.shiftKey && document.activeElement===last) {event.preventDefault();first.focus();}
  }

  function initAgeGate() {
    let confirmed = false;
    try { confirmed = sessionStorage.getItem(AGE_KEY) === 'yes'; } catch (e) {}
    if (!confirmed) { $('age-overlay').hidden = false; lockPage(true); $('age-yes').focus(); }
    $('age-yes').addEventListener('click', () => {
      try { sessionStorage.setItem(AGE_KEY,'yes'); } catch (e) {}
      $('age-overlay').hidden = true;
      lockPage(false);
      $('menu-toggle').focus();
    });
    $('age-no').addEventListener('click', () => {
      const box = document.querySelector('.age-panel');
      box.innerHTML = '<p class="eyebrow">DON TURRÓN</p><h2>Acceso restringido.</h2><p>Este sitio está dirigido solamente a personas mayores de 18 años.</p>';
      box.setAttribute('tabindex','-1');box.focus();
    });
  }

  function bind() {
    $('filters').addEventListener('click', e => { const btn = e.target.closest('[data-filter]'); if (btn) setFilter(btn.dataset.filter); });
    document.querySelectorAll('[data-category]').forEach(link => link.addEventListener('click', () => setFilter(link.dataset.category)));
    $('product-grid').addEventListener('click', e => { const add=e.target.closest('[data-add]'), detail=e.target.closest('[data-detail]'); if(add) changeQuantity(add.dataset.add,1); if(detail) openProduct(detail.dataset.detail,detail); });
    $('product-modal-content').addEventListener('click', e => {
      const add=e.target.closest('[data-add]'); if (add) changeQuantity(add.dataset.add,1);
      const view=e.target.closest('[data-photo-index]');
      if (view) {
        const frame=e.currentTarget.querySelector('.travel-photo-modal');
        if (!frame) return;
        const i=Number(view.dataset.photoIndex);
        const selectedProduct=productById(frame.dataset.productId);
        const views=selectedProduct && photosOf(selectedProduct);
        if (!views || !Number.isInteger(i) || i<0 || i>=views.length) return;
        frame.src=views[i].src;
        frame.alt='Fotografía de '+selectedProduct.name+': '+views[i].label;
        e.currentTarget.querySelectorAll('[data-photo-index]').forEach(button => button.setAttribute('aria-pressed', String(button === view)));
      }
    });
    $('open-selection').addEventListener('click', e=>openSelection(e.currentTarget));
    $('close-selection').addEventListener('click', closeDialog);
    $('drawer-backdrop').addEventListener('click',closeDialog);
    $('product-modal-close').addEventListener('click',closeDialog);
    $('product-modal-backdrop').addEventListener('click',closeDialog);
    $('drawer-contents').addEventListener('click',e=>{
      const qty=e.target.closest('[data-qty]'); const remove=e.target.closest('[data-remove]');
      if(qty) changeQuantity(qty.dataset.id,Number(qty.dataset.qty));
      if(remove) {delete cart[remove.dataset.remove];save();updateCounters();renderDrawer();}
    });
    $('copy-selection').addEventListener('click',copySelection);
    $('request-selection').addEventListener('click', () => {
      if(!validEmail(config.contactEmail) || !count()) return;
      const subject=encodeURIComponent('Consulta de accesorios — Don Turrón');
      const body=encodeURIComponent(selectionText());
      location.href=`mailto:${config.contactEmail}?subject=${subject}&body=${body}`;
    });
    $('menu-toggle').addEventListener('click',()=>{
      const button=$('menu-toggle');const open=button.getAttribute('aria-expanded')!=='true';
      button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú');
      $('mobile-nav').hidden=!open;
    });
    $('mobile-nav').addEventListener('click',e=>{
      if(e.target.closest('a')) {$('mobile-nav').hidden=true;$('menu-toggle').setAttribute('aria-expanded','false');$('menu-toggle').setAttribute('aria-label','Abrir menú');}
    });
    document.addEventListener('keydown',event=>{
      if (event.key==='Escape' && currentDialog) closeDialog();
      trapFocus(event);
    });
    $('year').textContent=String(new Date().getFullYear());
  }
  load();renderProducts();renderDrawer();updateCounters();bind();initAgeGate();
})();
