(() => {
  'use strict';
  let catalog = window.DON_TURRON_CATALOG || [];
  const config = window.DON_TURRON_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const emit = (event, properties={}) => { try { window.dispatchEvent(new CustomEvent('dt:interaction',{detail:{event,...properties}})); } catch {} };
  const KEY = 'dt-selection-v1';
  const AGE_KEY = 'dt-age-confirmed-v1';
  const MAX_QUANTITY = 20;
  // Las imágenes proceden exclusivamente de knowledge/products.json (catálogo generado).
  const photosOf = p => Array.isArray(p.images) && p.images.length ? p.images : null;
  const responsiveCardImages = new Set((window.DON_TURRON_CATALOG || []).map(p=>photosOf(p)?.[0]?.src).filter(Boolean));
  function productPicture(p, placement) {
    const photos = photosOf(p);
    const hints = placement === 'modal' ? 'loading="eager" fetchpriority="high"' : 'loading="lazy" fetchpriority="low"';
    const priority = placement !== 'modal' && photos && responsiveCardImages.has(photos[0].src)
      ? `${hints} srcset="${html(photos[0].src.replace(/\.webp$/, '-320.webp').replace('assets/products/', 'assets/responsive/'))} 320w, ${html(photos[0].src.replace(/\.webp$/, '-640.webp').replace('assets/products/', 'assets/responsive/'))} 640w" sizes="(max-width:580px) calc((100vw - 47px)/2), (max-width:960px) 45vw, 360px"`
      : hints;
    if (!photosOf(p)) return `<img src="assets/${html(p.art)}.svg" alt="Ilustración conceptual de ${html(p.name)}" decoding="async" ${priority} />`;
    return `<img class="travel-photo travel-photo-${placement}" data-product-id="${html(p.id)}" src="${html(photosOf(p)[0].src)}" alt="Fotografía de ${html(p.name)}; ${html(photosOf(p)[0].label)}" decoding="async" ${priority} width="620" height="620" />`;
  }
  let selectedFilter = 'todos';
  let lastFocused = null;
  let currentDialog = null;
  let toastTimer = null;
  let cart = {};

  const html = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const productById = (id) => catalog.find(p => p.id === id);
  const retailText = p => p.retailPrice ? '$'+Number(p.retailPrice.amount).toLocaleString('es-MX')+' MXN' : null;
  const priceMarkup = p => p.retailPrice ? `<span class="product-price product-price-set"><strong>${retailText(p)}</strong><small>IVA incluido</small></span>` : '<span class="product-price">Precio por confirmar</span>';
  const asInt = (x) => Number.isFinite(Number(x)) ? Math.max(0, Math.min(MAX_QUANTITY, Math.floor(Number(x)))) : 0;
  const hasRecordedStock = p => !!p && Array.isArray(p.variants) && p.variants.length > 0 && p.variants.every(v => Number.isInteger(v.stock) && v.stock >= 0);
  const keyFor = (p, label) => hasRecordedStock(p) ? p.id + '::' + label : p.id;
  function entryFor(key) {
    const [id, label, extra] = key.split('::');
    if (extra !== undefined) return null;
    const p = productById(id);
    if (!p) return null;
    if (!hasRecordedStock(p)) return label === undefined ? {p, variant:null} : null;
    const variant = p.variants.find(v => v.label === label);
    return variant ? {p, variant} : null;
  }
  const hasProductStock = p => !!p && Number.isInteger(p.stock) && p.stock >= 0;
  const productStockText = p => p.stock + (p.stock === 1 ? ' unidad disponible' : ' unidades disponibles');
  const maxFor = entry => entry.variant ? Math.min(MAX_QUANTITY, entry.variant.stock) : hasProductStock(entry.p) ? Math.min(MAX_QUANTITY, entry.p.stock) : MAX_QUANTITY;
  const stockLine = p => p.variants.map(v => v.label + ': ' + v.stock + ' ' + (v.stock === 1 ? 'disponible' : 'disponibles')).join(' · ');
  function variantPicker(p) {
    if (!hasRecordedStock(p)) return '';
    return `<div class="variant-picker" data-variant-product="${html(p.id)}"><label>Color<select data-variant-color aria-label="Color de ${html(p.name)}">${p.variants.map(v => `<option value="${html(v.label)}">${html(v.label)}</option>`).join('')}</select></label><label>Cantidad<select data-variant-qty aria-label="Cantidad de ${html(p.name)}"><option value="1">1</option><option value="2">2</option></select></label><p class="variant-remaining" data-variant-remaining aria-live="polite"></p></div>`;
  }
  function syncVariantPicker(root) {
    if (!root) return;
    const p = productById(root.dataset.variantProduct);
    if (!hasRecordedStock(p)) return;
    const color = root.querySelector('[data-variant-color]')?.value;
    const variant = p.variants.find(v => v.label === color);
    if (!variant) return;
    const qty = root.querySelector('[data-variant-qty]');
    const available = Math.max(0, variant.stock - (cart[keyFor(p, color)] || 0));
    const previous = Number(qty.value) || 1;
    qty.innerHTML = available ? Array.from({length:available},(_,i) => `<option value="${i+1}">${i+1}</option>`).join('') : '<option value="0">0</option>';
    qty.value = String(available ? Math.min(previous,available) : 0);
    qty.disabled = available === 0;
    const button = root.closest('.product-card, .modal-text')?.querySelector('[data-add]');
    if (button) button.disabled = available === 0;
    root.querySelector('[data-variant-remaining]').textContent = available ? available + (available === 1 ? ' unidad restante para agregar' : ' unidades restantes para agregar') : 'Todas las unidades de este color ya están en tu selección';
  }
  function syncAllStockControls() {
    document.querySelectorAll('[data-variant-product]').forEach(syncVariantPicker);
    document.querySelectorAll('[data-add]').forEach(button => {
      const product = productById(button.dataset.add);
      if (!hasProductStock(product)) return;
      button.disabled = (cart[product.id] || 0) >= product.stock;
      button.title = button.disabled ? 'La unidad disponible ya está en tu selección' : '';
    });
  }
  function addFromButton(button) {
    const p = productById(button.dataset.add);
    if (!p) return;
    if (!hasRecordedStock(p)) return changeQuantity(p.id, 1);
    const picker = button.closest('.product-card, .modal-text')?.querySelector('[data-variant-product]');
    if (!picker) return;
    const label = picker.querySelector('[data-variant-color]').value;
    const qty = Number(picker.querySelector('[data-variant-qty]').value);
    if (Number.isInteger(qty) && qty > 0) changeQuantity(keyFor(p, label), qty);
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) { /* optional persistence */ } };
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
        Object.entries(saved).forEach(([key, value]) => { const entry=entryFor(key); if (!entry) return; const qty=Math.min(asInt(value), maxFor(entry)); if (qty) cart[key] = qty; });
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
          <button type="button" class="product-image-trigger" data-open-photo="${html(p.id)}" aria-label="Ver detalles de ${html(p.name)}">
            ${productPicture(p, "card")}
          </button>
          <button type="button" class="product-quick" data-detail="${html(p.id)}" aria-label="Ver detalles de ${html(p.name)}">↗</button>
        </div>
        <div class="product-details"><div class="product-category">${html(p.categoryLabel.toUpperCase())}</div>
          <h3>${html(p.name)}</h3><p class="product-subtitle">${html(p.subtitle)}</p>${hasProductStock(p) ? `<p class="product-stock">${html(productStockText(p))}</p>` : ''}${hasRecordedStock(p) ? `<p class="product-stock">${html(stockLine(p))}</p>${variantPicker(p)}` : ''}${p.launchWindow ? `<p class="product-availability">${html(p.launchWindow.label)}</p>` : ''}
          <div class="product-buy">${priceMarkup(p)}<button type="button" class="add-product" data-add="${html(p.id)}">Seleccionar <span>＋</span></button></div>
        </div>
      </article>`).join('');
  }

  // El HTML del catálogo ya viene prerenderizado: evitar destruirlo y volver a
  // insertar siete imágenes durante el primer render. Los filtros siguen siendo dinámicos.
  function prerenderMatchesCatalog() {
    const grid = $('product-grid');
    if (!grid) return false;
    const cards = [...grid.querySelectorAll(':scope > .product-card')];
    return cards.length === catalog.length && cards.every((card, index) => {
      const product = catalog[index];
      if (!product || card.dataset.id !== product.id) return false;
      const visiblePrice = card.querySelector('.product-price strong')?.textContent?.trim();
      if (hasRecordedStock(product) && (!card.querySelector('[data-variant-product]') || !card.textContent.includes(stockLine(product)))) return false;
      if (hasProductStock(product) && card.querySelector('.product-stock')?.textContent !== productStockText(product)) return false;
      return product.retailPrice ? visiblePrice === retailText(product) : !!card.querySelector('.product-price');
    });
  }

  function setFilter(filter, scroll = false) {
    if (filter !== 'todos' && !catalog.some(p => p.category === filter)) return;
    const previousFilter = selectedFilter;
    selectedFilter = filter;
    document.querySelectorAll('[data-filter]').forEach(btn => {
      const active = btn.dataset.filter === filter;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    renderProducts();
    syncAllStockControls();
    if (filter!==previousFilter) emit('category_filter',{filter});
    if (scroll) setTimeout(() => $('coleccion').scrollIntoView({behavior:'smooth'}), 30);
  }

  function updateCounters() {
    $('cart-count').textContent = count();
    $('drawer-count').textContent = `(${count()})`;
  }
  function changeQuantity(key, by) {
    const entry = entryFor(key);
    if (!entry) return;
    const beforeQuantity = cart[key] || 0;
    const newQuantity = Math.min(maxFor(entry), asInt(beforeQuantity + by));
    if (newQuantity > 0) cart[key] = newQuantity;
    else delete cart[key];
    if (newQuantity !== beforeQuantity) {
      save();
      updateCounters();
      renderDrawer();
      emit(newQuantity > beforeQuantity ? 'selection_add' : 'selection_remove', {product_id:entry.p.id, variant:entry.variant?.label, quantity:Math.abs(newQuantity-beforeQuantity)});
    }
    syncAllStockControls();
    if (by > 0) toast(newQuantity > beforeQuantity ? 'Agregamos el accesorio a tu selección.' : 'Ya tienes el máximo registrado para '+(entry.variant ? 'este color' : 'este producto')+'.');
  }
  function renderDrawer() {
    const contents = $('drawer-contents');
    const items = Object.entries(cart).map(([key,qty]) => ({key,entry:entryFor(key),qty})).filter(v => v.entry);
    if (!items.length) contents.innerHTML = `<div class="drawer-empty"><span class="empty-signet">✦</span><h3>Tu selección está vacía.</h3><p>Puedes guardar aquí los accesorios que te interesen.</p></div>`;
    else contents.innerHTML = items.map(({key,entry,qty}) => {
      const p = entry.p, variant = entry.variant;
      return `<div class="drawer-line"><div class="drawer-art">${productPicture(p, "drawer")}</div>
        <div class="drawer-line-text"><h3>${html(p.name)}</h3>${variant ? `<p class="drawer-variant">Color: ${html(variant.label)}</p>` : ''}<p>${p.retailPrice ? retailText(p)+' · IVA incluido, envío aparte · '+(variant || hasProductStock(p) ? 'Inventario registrado, sin reserva' : 'Disponibilidad por confirmar') : 'PRECIO Y DISPONIBILIDAD POR CONFIRMAR'}</p>
          <div class="qty-controls"><button type="button" data-qty="-1" data-id="${html(key)}" aria-label="Quitar una unidad de ${html(p.name)}${variant?' en '+html(variant.label):''}" ${qty <= 0 ? 'disabled' : ''}>−</button><span>${qty}</span><button type="button" data-qty="1" data-id="${html(key)}" aria-label="Agregar una unidad de ${html(p.name)}${variant?' en '+html(variant.label):''}" ${qty >= maxFor(entry) ? 'disabled' : ''}>+</button></div>
          <button type="button" class="remove-line" data-remove="${html(key)}">Eliminar</button>
        </div></div>`;
    }).join('');
    const whatsapp=$('whatsapp-selection');
    if(items.length)whatsapp.href='https://wa.me/525586494076?text='+encodeURIComponent(selectionText());
    else whatsapp.removeAttribute('href');
    whatsapp.setAttribute('aria-disabled',String(!items.length));
    whatsapp.tabIndex=items.length?0:-1;
    $('request-selection').hidden = !items.length || !validEmail(config.contactEmail);
  }
  function validEmail(email) { return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
  function selectionText() {
    const items=Object.entries(cart).map(([key,qty])=>({entry:entryFor(key),qty})).filter(x=>x.entry);
    const priced=items.filter(({entry})=>entry.p.retailPrice);
    const subtotal=priced.reduce((sum,{entry,qty})=>sum+entry.p.retailPrice.amount*qty,0);
    const lines=[
      'Hola, Don Turrón. Me gustaría adquirir los siguientes accesorios:',
      '',
      ...items.map(({entry,qty})=>{
        const {p,variant}=entry;
        return '• '+p.name+(variant?' · Color: '+variant.label:'')+' · Cantidad: '+qty+(p.retailPrice?' · '+retailText(p)+' c/u (IVA incluido)':' · Precio por confirmar');
      }),
      '',
      'Total de artículos: '+count()
    ];
    if(priced.length)lines.push((priced.length===items.length?'Subtotal de productos: ':'Subtotal parcial de productos con precio: ')+subtotal.toLocaleString('es-MX',{style:'currency',currency:'MXN'})+' (IVA incluido; envío no incluido).');
    lines.push('¿Podrían confirmarme las existencias, el costo de envío y los pasos para completar la compra?','Entiendo que este mensaje no constituye un pedido confirmado ni una reserva.');
    return lines.join('\n');
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
    emit('selection_open');
  }
  function modalDisclosure(p) {
    if (p.retailPrice) return '<p class="modal-caption">Envío no incluido. '+(hasRecordedStock(p)||hasProductStock(p)?'Inventario registrado sujeto a cambios; seleccionar no reserva unidades.':'Existencias por confirmar.')+' La compra se confirma por WhatsApp; aún no hay pagos en este sitio.</p>';
    if (p.id === 'encendedor-honest-punch') return '';
    if (p.id === 'encendedor-sarike-butano') return '';
    if (p.id === 'cortador-v-geometrico') return '<p class="modal-caption">Precio por confirmar.</p>';
    return '<p class="modal-caption">' + (p.launchWindow ? 'Fecha prevista, sujeta a cambios; precio y existencias por confirmar.' : 'Precio y disponibilidad por confirmar.') + ' Las características se muestran según la información disponible.</p>';
  }
  function openProduct(id, trigger) {
    const p = productById(id);
    if (!p) return;
    $('product-modal-content').innerHTML = `<div class="modal-content-layout"><div class="modal-art">${productPicture(p, "modal")}${photosOf(p) ? `<div class="travel-gallery-controls" role="group" aria-label="Vistas de ${html(p.name)}">${photosOf(p).map((item, i) => `<button type="button" data-photo-index="${i}" aria-label="${html(item.label)}" aria-pressed="${i === 0}">${String(i + 1).padStart(2, "0")}</button>`).join("")}</div>` : ""}</div><div class="modal-text"><p class="eyebrow eyebrow-dark">${html(p.categoryLabel.toUpperCase())} / ${photosOf(p) ? "ARTÍCULO PRESENTADO" : "CATÁLOGO CONCEPTUAL"}</p><h2 id="product-modal-name">${html(p.name)}</h2><p>${html(p.description)}</p>${hasProductStock(p) ? `<p class="product-stock">${html(productStockText(p))}</p>` : ''}${p.launchWindow ? `<p class="modal-availability">${html(p.launchWindow.label)}</p>` : ''}${p.retailPrice ? `<p class="modal-retail-price"><strong>${retailText(p)}</strong><small>IVA incluido · Envío no incluido</small></p>` : ''}<ul>${p.features.map(s=>`<li>${html(s)}</li>`).join('')}</ul>${modalDisclosure(p)}${variantPicker(p)}<button type="button" class="btn btn-gold" data-add="${html(p.id)}">Añadir a mi selección <span>＋</span></button></div></div>`;
    syncAllStockControls();
    openDialog($('product-modal'), $('product-modal-backdrop'), trigger);
    emit('product_view',{product_id:id});
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
    $('product-grid').addEventListener('click', e => { const add=e.target.closest('[data-add]'), detail=e.target.closest('[data-detail], [data-open-photo]'); if(add) addFromButton(add); if(detail) openProduct(detail.dataset.detail || detail.dataset.openPhoto,detail); });
    $('product-modal-content').addEventListener('click', e => {
      const add=e.target.closest('[data-add]'); if (add) addFromButton(add);
      const view=e.target.closest('[data-photo-index]');
      if (view) {
        const frame=e.currentTarget.querySelector('.travel-photo-modal');
        if (!frame) return;
        const i=Number(view.dataset.photoIndex);
        const selectedProduct=productById(frame.dataset.productId);
        const views=selectedProduct && photosOf(selectedProduct);
        if (!views || !Number.isInteger(i) || i<0 || i>=views.length) return;
        const changed = view.getAttribute('aria-pressed') !== 'true';
        frame.src=views[i].src;
        frame.alt='Fotografía de '+selectedProduct.name+': '+views[i].label;
        e.currentTarget.querySelectorAll('[data-photo-index]').forEach(button => button.setAttribute('aria-pressed', String(button === view)));
        if(changed) emit('gallery_navigation',{product_id:selectedProduct.id,image_index:i});
      }
    });
    ['product-grid','product-modal-content'].forEach(id => $(id).addEventListener('change', e => {
      if (e.target.matches('[data-variant-color]')) syncVariantPicker(e.target.closest('[data-variant-product]'));
    }));
    $('open-selection').addEventListener('click', e=>openSelection(e.currentTarget));
    $('close-selection').addEventListener('click', closeDialog);
    $('drawer-backdrop').addEventListener('click',closeDialog);
    $('product-modal-close').addEventListener('click',closeDialog);
    $('product-modal-backdrop').addEventListener('click',closeDialog);
    $('drawer-contents').addEventListener('click',e=>{
      const qty=e.target.closest('[data-qty]'); const remove=e.target.closest('[data-remove]');
      if(qty) changeQuantity(qty.dataset.id,Number(qty.dataset.qty));
      if(remove) {const key=remove.dataset.remove;const entry=entryFor(key);const existed=Boolean(cart[key]);delete cart[key];save();updateCounters();renderDrawer();syncAllStockControls();if(existed&&entry)emit('selection_remove',{product_id:entry.p.id,variant:entry.variant?.label});}
    });
    $('whatsapp-selection').addEventListener('click',()=>{if(count())emit('selection_whatsapp',{item_count:count()});});
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

  // La fuente de verdad para campos comerciales y disponibilidad es MySQL
  // cuando se activa el release gate. Esta consulta NO bloquea la primera pintura.
  // El HTML y las fichas estáticas siguen existiendo para bots/no-JS.
  const imageAllowed = /^assets\/products\/[a-z0-9-]+\.webp$/;
  const nonempty = (value, max) => typeof value === 'string' ? value.slice(0,max) : '';
  function remoteProduct(remote, current) {
    if (!remote || !/^[a-z0-9-]+$/.test(remote.id||'') || !Array.isArray(remote.features) || !Array.isArray(remote.images) || !Array.isArray(remote.variants)) return null;
    // Un artículo nuevo en MySQL no necesita existir en el catálogo estático.
    const baseline = current || {id:remote.id,variants:[],features:[],images:[]};
    const previousVariants = Array.isArray(baseline.variants) ? baseline.variants : [];
    const images = remote.images.filter(image => image && typeof image.label === 'string' && imageAllowed.test(image.src))
      .map(image => ({src:image.src,label:nonempty(image.label,200)}));
    if (!images.length) return null;
    const stock = Number.isInteger(remote.stock) && remote.stock>=0 ? remote.stock : undefined;
    // Incorporar altas/bajas de acabados desde dt_variants, conservando el
    // orden de los colores conocidos para no alterar de golpe la experiencia.
    const variants = remote.variants.filter(v=>v && typeof v.label==='string')
      .sort((a,b)=>{
        const ia=previousVariants.findIndex(v=>v.label===a.label);
        const ib=previousVariants.findIndex(v=>v.label===b.label);
        return (ia<0?999:ia)-(ib<0?999:ib);
      }).map(record=>{
        const prior=previousVariants.find(v=>v.label===record.label)||{};
        const count=Number.isInteger(record.stock)&&record.stock>=0?record.stock:undefined;
        return {...prior,label:nonempty(record.label,80),stock:count,
          status:count===undefined?'pending_confirmation':'confirmed'};
      });
    const incomingLaunch=remote.launchWindow;
    const launchWindow=incomingLaunch && baseline.launchWindow?.month===incomingLaunch.month &&
      baseline.launchWindow?.label===incomingLaunch.label ? baseline.launchWindow : incomingLaunch || undefined;
    const price=remote.retailPrice && Number.isFinite(remote.retailPrice.amount) && remote.retailPrice.amount>=0 &&
      remote.retailPrice.currency==='MXN' ? remote.retailPrice : undefined;
    return {...baseline,id:remote.id,
      name:nonempty(remote.name,200),category:nonempty(remote.category,64),
      categoryLabel:nonempty(remote.categoryLabel,100),
      subtitle:nonempty(remote.subtitle,250),description:nonempty(remote.description,10000),
      features:remote.features.filter(v=>typeof v==='string').slice(0,24).map(v=>nonempty(v,500)),
      images,art:/^[a-z0-9-]+$/.test(remote.art)?remote.art:current.art,
      badge:nonempty(remote.badge,80),stock,variants,retailPrice:price,launchWindow};
  }
  function refreshSelectionAfterCatalog() {
    for (const [key,qty] of Object.entries(cart)) {
      const entry=entryFor(key);
      if (!entry) delete cart[key];
      else {
        const adjusted=Math.min(qty,maxFor(entry));
        if (adjusted>0)cart[key]=adjusted;
        else delete cart[key];
      }
    }
    save();updateCounters();renderDrawer();syncAllStockControls();
  }
  function useRemoteCatalog() {
    if (config.liveCatalogEnabled !== true || !/^https?:$/.test(location.protocol)) return;
    document.documentElement.dataset.catalogSource='loading';
    const abort = new AbortController();
    // El servidor Hostinger puede iniciar una conexión MySQL en frío.
    // No bloquea la carga del HTML; sólo el refresco de tarjetas.
    const deadline = setTimeout(()=>abort.abort(),10000);
    fetch('/api/catalog',{method:'GET',credentials:'omit',signal:abort.signal,cache:'no-store'})
      .then(async response=>{
        if(!response.ok){
          const detail=await response.json().catch(()=>null);
          throw new Error('catalog_'+(detail?.reason||'http_'+response.status));
        }
        return response.json();
      })
      .then(data=>{
        if(data?.version!==1 || data?.source!=='don-turron-inventory' ||
          !Array.isArray(data.products))throw new Error('catalog_invalid_response');
        const byId=new Map(catalog.map(p=>[p.id,p]));
        const ids=new Set(data.products.map(p=>p?.id));
        if(ids.size!==data.products.length)throw new Error('catalog_duplicate_ids');
        // La BD gobierna cuáles artículos están activos, sus altas y bajas.
        const latest=data.products.map(p=>remoteProduct(p,byId.get(p?.id)));
        if(latest.some(p=>!p))throw new Error('catalog_invalid_product');
        const hasChange=JSON.stringify(latest)!==JSON.stringify(catalog);
        catalog=latest;
        document.documentElement.dataset.catalogSource='mysql';
        if(hasChange){
          const existingDialog=currentDialog?.el?.id === 'product-modal';
          const openedId=existingDialog ? $('product-modal-content')?.querySelector('[data-product-id]')?.dataset.productId : null;
          renderProducts();
          if(openedId && productById(openedId)){
            // Mantener el diálogo y el foco; la galería vuelve a cargar al siguiente acceso.
            const refreshed=productById(openedId);
            const heading=$('product-modal-name');
            if(heading)heading.textContent=refreshed.name;
          }
        }
        refreshSelectionAfterCatalog();
        emit('catalog_hydrated',{source:'mysql',products:latest.length});
      })
      .catch(error=>{
        document.documentElement.dataset.catalogSource='unavailable';
        console.warn('[Don Turrón] catálogo MySQL no disponible:',error?.message||'error_desconocido');
        // Sin BD disponible, jamás presentar como confirmados los stocks del build.
        catalog=catalog.map(p=>({...p,stock:undefined,retailPrice:undefined,
          variants:p.variants.map(v=>({...v,stock:undefined,status:'pending_confirmation'}))}));
        renderProducts();
        refreshSelectionAfterCatalog();
        emit('catalog_unavailable');
      })
      .finally(()=>clearTimeout(deadline));
  }

  load();
  if (!prerenderMatchesCatalog()) renderProducts();
  else $('result-count').textContent = singular(catalog.length);
  renderDrawer();updateCounters();bind();syncAllStockControls();initAgeGate();useRemoteCatalog();
})();
