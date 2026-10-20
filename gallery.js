/* Don Turrón · Galería V4.4: arrastre visual fluido y gestos no intrusivos. */
(() => {
  'use strict';
  const modalContent = document.getElementById('product-modal-content');
  const productModal = document.getElementById('product-modal');
  if (!modalContent || !productModal) return;

  const lightbox = document.createElement('section');
  lightbox.id = 'dt-photo-lightbox';
  lightbox.className = 'dt-photo-lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', 'Vista ampliada de producto');
  lightbox.setAttribute('tabindex', '-1');
  lightbox.hidden = true;
  lightbox.innerHTML = `
    <div class="dt-lightbox-top">
      <span class="dt-lightbox-brand">DON TURRÓN <span aria-hidden="true">✦</span> DETALLES</span>
      <span class="dt-lightbox-counter" id="dt-lightbox-counter" aria-live="polite"></span>
      <button type="button" class="dt-lightbox-close" id="dt-lightbox-close" aria-label="Cerrar imagen ampliada">Cerrar <span aria-hidden="true">×</span></button>
    </div>
    <div class="dt-lightbox-stage" id="dt-lightbox-stage">
      <img class="dt-lightbox-image" id="dt-lightbox-image" alt="" />
    </div>
    <div class="dt-lightbox-footer">
      <button type="button" class="dt-lightbox-arrow" id="dt-lightbox-prev" aria-label="Ver fotografía anterior">← <span>Anterior</span></button>
      <p id="dt-lightbox-caption" class="dt-lightbox-caption" aria-live="polite"></p>
      <button type="button" class="dt-lightbox-zoom" id="dt-lightbox-zoom" aria-pressed="false">Ampliar +</button>
      <button type="button" class="dt-lightbox-arrow" id="dt-lightbox-next" aria-label="Ver fotografía siguiente"><span>Siguiente</span> →</button>
    </div>
  `;
  document.body.appendChild(lightbox);

  const stage = lightbox.querySelector('#dt-lightbox-stage');
  const largeImage = lightbox.querySelector('#dt-lightbox-image');
  const counter = lightbox.querySelector('#dt-lightbox-counter');
  const caption = lightbox.querySelector('#dt-lightbox-caption');
  const zoomButton = lightbox.querySelector('#dt-lightbox-zoom');
  const previousLightbox = lightbox.querySelector('#dt-lightbox-prev');
  const nextLightbox = lightbox.querySelector('#dt-lightbox-next');
  let returnFocus = null;
  let gesture = null;
  let suppressModalClickUntil = 0;
  let suppressLightboxClickUntil = 0;
  const warmedPhotos = new Set();
  const phoneWidth = window.matchMedia('(max-width:580px)');
  let nativeScrollSync = false;
  const emit = (event, properties={}) => { try { window.dispatchEvent(new CustomEvent('dt:interaction',{detail:{event,...properties}})); } catch {} };
  const currentProductId = () => modalContent.querySelector('img.travel-photo-modal')?.dataset.productId || null;

  function galleryButtons() {
    return [...modalContent.querySelectorAll('.travel-gallery-controls [data-photo-index]')];
  }
  function activeIndex() {
    const buttons = galleryButtons();
    const current = buttons.findIndex(btn => btn.getAttribute('aria-pressed') === 'true');
    return current < 0 ? 0 : current;
  }
  function currentModalPhoto() {
    return modalContent.querySelector('.dt-image-open img');
  }
  function setZoom(enabled) {
    lightbox.classList.toggle('dt-zoomed', enabled);
    zoomButton.setAttribute('aria-pressed', String(enabled));
    zoomButton.textContent = enabled ? 'Reducir −' : 'Ampliar +';
    if (enabled) {
      requestAnimationFrame(() => {
        stage.scrollLeft = (stage.scrollWidth - stage.clientWidth) / 2;
        stage.scrollTop = (stage.scrollHeight - stage.clientHeight) / 2;
      });
    } else {
      stage.scrollLeft = 0;
      stage.scrollTop = 0;
    }
  }
  function syncLightbox() {
    const photo = currentModalPhoto();
    if (!photo || lightbox.hidden) return;
    largeImage.src = photo.src;
    largeImage.alt = photo.alt || 'Fotografía del accesorio';
    caption.textContent = largeImage.alt;
    const total = galleryButtons().length || 1;
    counter.textContent = `${activeIndex() + 1} / ${total}`;
    const multiple = total > 1;
    previousLightbox.hidden = !multiple;
    nextLightbox.hidden = !multiple;
    setZoom(false);
  }
  function navigate(direction) {
    const controls = galleryButtons();
    if (controls.length < 2) return;
    const next = (activeIndex() + direction + controls.length) % controls.length;
    controls[next].click(); // reutiliza la lógica existente de la galería
    updatePhotoLabel();
    if (!lightbox.hidden) syncLightbox();
    settleMotion(motionTarget(lightbox.hidden?'modal':'lightbox'),direction===1?1:-1,true);
    warmNextPhoto();
  }
  // Solo cuando el visitante abre una galería: precargar anterior y siguiente
  // para eliminar espera al deslizar hacia ambos lados. Evitar redes lentas.
  function warmNextPhoto() {
    const connection = navigator.connection;
    if (location.protocol !== 'https:' || connection?.saveData || /2g|3g/.test(connection?.effectiveType || '')) return;
    const product = (window.DON_TURRON_CATALOG || []).find(p => p.id === currentProductId());
    if (!product || !Array.isArray(product.images) || product.images.length < 2) return;
    for(const direction of [-1,1]) {
      const next = product.images[(activeIndex() + direction + product.images.length) % product.images.length];
      if (!next?.src || warmedPhotos.has(next.src)) continue;
      warmedPhotos.add(next.src);
      const image = new Image();
      image.decoding = 'async';
      image.src = next.src;
    }
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function motionTarget(origin) {
    return origin === 'modal' ? modalContent.querySelector('.dt-image-open') : largeImage;
  }
  function stopMotion(element) {
    if (!element) return;
    if (typeof element.getAnimations === 'function') {
      element.getAnimations().forEach(animation => animation.cancel());
    }
    element.style.transform = '';
    element.style.opacity = '';
    element.classList.remove('dt-swipe-dragging');
  }
  function settleMotion(element, startX, changed) {
    if (!element) return;
    stopMotion(element);
    if (reducedMotion.matches || typeof element.animate !== 'function') return;
    const fromX = changed
      ? (startX > 0 ? 38 : -38)
      : Math.max(-100, Math.min(100, startX));
    if (!changed && Math.abs(fromX) < 4) return;
    element.animate([
      {transform:'translate3d(' + fromX + 'px,0,0)', opacity: changed ? 0.80 : 0.88},
      {transform:'translate3d(0,0,0)', opacity:1}
    ], {duration: changed ? 190 : 150, easing:'cubic-bezier(.2,.8,.2,1)'});
  }
  function beginSwipe(event, origin) {
    if (!['touch','pen'].includes(event.pointerType) || event.isPrimary === false) return;
    if (gesture || galleryButtons().length < 2 || !lightbox.hidden && lightbox.classList.contains('dt-zoomed')) return;
    // No interceptar el gesto del sistema en el borde del iPhone.
    if (event.clientX < 18 || event.clientX > window.innerWidth - 18) return;
    if (origin === 'modal' && (!lightbox.hidden || !productModal.classList.contains('open') || !event.target.closest('.dt-image-open'))) return;
    if (origin === 'lightbox' && lightbox.hidden) return;
    const target = motionTarget(origin);
    if (!target) return;
    // Un toque NUEVO siempre es intencional: no heredará el bloqueo sintético
    // del swipe anterior (aunque ocurra inmediatamente después).
    if (origin === 'modal') suppressModalClickUntil = 0;
    else suppressLightboxClickUntil = 0;
    stopMotion(target);
    gesture = {
      pointerId:event.pointerId, origin, element:target,
      startX:event.clientX, startY:event.clientY,
      x:event.clientX, y:event.clientY, at:performance.now(), axis:null, dragged:false,
      width:Math.max(150,target.getBoundingClientRect().width)
    };
  }
  function trackSwipe(event) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const g = gesture, dx = event.clientX - g.startX, dy = event.clientY - g.startY;
    g.x = event.clientX; g.y = event.clientY;
    if (!g.axis && Math.hypot(dx,dy) > 8) g.axis = Math.abs(dx) > Math.abs(dy)*1.15 ? 'x' : 'y';
    if (g.axis !== 'x') return;
    g.dragged = true;
    g.element.classList.add('dt-swipe-dragging');
    // La fotografía sigue el dedo; solo se anima el transform (sin recalcular layout).
    const width = g.width;
    const offset = Math.max(-width*.52,Math.min(width*.52,dx*.88));
    g.element.style.transform = 'translate3d(' + offset + 'px,0,0)';
    g.element.style.opacity = String(Math.max(.76,1-Math.abs(offset)/width*.30));
  }
  function endSwipe(event, cancelled=false) {
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    const g=gesture; gesture=null;
    const dx=event.clientX-g.startX, dy=event.clientY-g.startY;
    const horizontal = g.axis === 'x' || (!g.axis && Math.abs(dx)>Math.abs(dy)*1.15);
    const elapsed=Math.max(35,performance.now()-g.at);
    const width=g.width;
    // Distancia moderada o gesto rápido, sin activar un scroll vertical.
    const distance=Math.min(64,Math.max(30,width*.13));
    const accepted=!cancelled && horizontal && (Math.abs(dx)>=distance || Math.abs(dx)>=24 && Math.abs(dx)/elapsed>.5);
    if (g.dragged || accepted) {
      const until=performance.now()+220;
      if(g.origin==='modal') suppressModalClickUntil=until;
      else suppressLightboxClickUntil=until;
    }
    stopMotion(g.element);
    if (accepted) navigate(dx < 0 ? 1 : -1);
    else if (g.dragged) settleMotion(g.element,dx,false);
  }

  modalContent.addEventListener('pointerdown', event => beginSwipe(event,'modal'),{passive:true});
  stage.addEventListener('pointerdown', event => beginSwipe(event,'lightbox'),{passive:true});
  document.addEventListener('pointermove', trackSwipe,{passive:true});
  document.addEventListener('pointerup', event => endSwipe(event),{passive:true});
  document.addEventListener('pointercancel', event => endSwipe(event,true),{passive:true});

  // Consumir solo el click sintetizado por el mismo gesto táctil; no bloquear
  // un nuevo tap de mouse/teclado y no aplicar un bloqueo universal de 550ms.
  const touchClick = event => event.pointerType === 'touch' || event.pointerType === 'pen' ||
    event.sourceCapabilities?.firesTouchEvents === true;
  modalContent.addEventListener('click', event => {
    if (performance.now() >= suppressModalClickUntil || !touchClick(event) || !event.target.closest('.dt-image-open')) return;
    event.preventDefault(); event.stopImmediatePropagation(); suppressModalClickUntil=0;
  },true);
  stage.addEventListener('click', event => {
    if (performance.now() >= suppressLightboxClickUntil || !touchClick(event) || event.target !== largeImage) return;
    event.preventDefault(); event.stopImmediatePropagation(); suppressLightboxClickUntil=0;
  },true);

  // En teléfonos, el navegador controla la física horizontal y el ajuste de
  // las fotografías (CSS scroll snap). No competimos con Pointer Events.
  function addNativeCarousel(art) {
    const product=(window.DON_TURRON_CATALOG || []).find(p=>p.id===currentProductId());
    if(!product || !Array.isArray(product.images) || product.images.length<2) return;
    if(art.querySelector('.dt-native-carousel')) return;

    const carousel=document.createElement('div');
    carousel.className='dt-native-carousel';
    carousel.setAttribute('role','group');
    carousel.setAttribute('aria-label','Fotografías de '+product.name);
    const total=product.images.length;
    product.images.forEach((photo,index)=>{
      const slide=document.createElement('button');
      slide.type='button';
      slide.className='dt-native-slide';
      slide.dataset.nativePhotoIndex=String(index);
      slide.setAttribute('aria-label','Ampliar fotografía '+(index+1)+' de '+total+': '+photo.label);
      const image=document.createElement('img');
      image.src=photo.src;
      image.alt='Fotografía de '+product.name+': '+photo.label;
      image.loading=index===0?'eager':'lazy';
      image.decoding='async';
      image.draggable=false;
      slide.appendChild(image);
      carousel.appendChild(slide);
    });
    art.appendChild(carousel);

    // Desplazamiento nativo de Safari, Chrome y Samsung Internet.
    carousel.addEventListener('scroll',()=>{
      if(!phoneWidth.matches || nativeScrollSync || !carousel.clientWidth) return;
      const next=Math.max(0,Math.min(total-1,Math.round(carousel.scrollLeft/carousel.clientWidth)));
      if(next===activeIndex()) return;
      const target=galleryButtons()[next];
      if (!target) return;
      nativeScrollSync=true;
      try {target.click();} finally {nativeScrollSync=false;}
    },{passive:true});
    carousel.addEventListener('click',event=>{
      const slide=event.target.closest('.dt-native-slide');
      if(!slide) return;
      const index=Number(slide.dataset.nativePhotoIndex);
      if(index!==activeIndex()) {
        nativeScrollSync=true;
        try {galleryButtons()[index]?.click();} finally {nativeScrollSync=false;}
      }
      openLightbox(slide);
    });
  }
  function alignNativeCarousel(button) {
    if(!phoneWidth.matches || nativeScrollSync) return;
    const carousel=modalContent.querySelector('.dt-native-carousel');
    if(!carousel || !carousel.clientWidth) return;
    const index=Number(button.dataset.photoIndex);
    if(!Number.isInteger(index) || index<0) return;
    // Un tap sobre el indicador es una selección directa; el swipe conserva
    // la inercia natural del navegador sin animación artificial adicional.
    carousel.scrollTo({left:carousel.clientWidth*index,behavior:'instant'});
  }

  function updatePhotoLabel() {
    const photo = currentModalPhoto();
    const opener = modalContent.querySelector('.dt-image-open');
    if (opener && photo) opener.setAttribute('aria-label', `Ampliar imagen: ${photo.alt || 'detalle del producto'}`);
  }
  function openLightbox(trigger) {
    const photo = currentModalPhoto();
    if (!photo) return;
    returnFocus = trigger || document.activeElement;
    lightbox.hidden = false;
    lightbox.classList.add('dt-lightbox-visible');
    syncLightbox();
    lightbox.focus();
    warmNextPhoto();
    if(currentProductId())emit('image_zoom',{product_id:currentProductId(),zoomed:true});
  }
  function closeLightbox() {
    if (lightbox.hidden) return;
    if(gesture) stopMotion(gesture.element);
    gesture = null;
    lightbox.hidden = true;
    lightbox.classList.remove('dt-lightbox-visible');
    setZoom(false);
    if (returnFocus && returnFocus.isConnected) returnFocus.focus();
    returnFocus = null;
  }
  function enhanceModal() {
    const art = modalContent.querySelector('.modal-art');
    const photo = art && art.querySelector('img');
    if (!photo || art.querySelector('.dt-image-open')) return;
    const opener = document.createElement('button');
    opener.type = 'button';
    opener.className = 'dt-image-open';
    opener.setAttribute('aria-label', 'Ampliar fotografía del producto');
    photo.parentNode.insertBefore(opener, photo);
    opener.appendChild(photo);
    opener.addEventListener('click', () => openLightbox(opener));
    const numbered = galleryButtons();
    if (numbered.length > 1) {
      for (const [direction, name, symbol] of [[-1, 'anterior', '‹'], [1, 'siguiente', '›']]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `dt-gallery-nav dt-gallery-nav-${name}`;
        button.setAttribute('aria-label', `Ver fotografía ${name}`);
        button.textContent = symbol;
        button.addEventListener('click', () => navigate(direction));
        art.appendChild(button);
      }
    }
    updatePhotoLabel();
    addNativeCarousel(art);
    warmNextPhoto();
  }

  // openProduct reemplaza el contenido dinámicamente. Se mejora sin modificar su modelo.
  new MutationObserver(enhanceModal).observe(modalContent, {childList: true});
  modalContent.addEventListener('click', (event) => {
    const indicator=event.target.closest('[data-photo-index]');
    if(indicator){
      alignNativeCarousel(indicator);
      queueMicrotask(updatePhotoLabel);
    }
  });
  lightbox.querySelector('#dt-lightbox-close').addEventListener('click', closeLightbox);
  previousLightbox.addEventListener('click', () => navigate(-1));
  nextLightbox.addEventListener('click', () => navigate(1));
  function userZoom() {
    const next = !lightbox.classList.contains('dt-zoomed');
    setZoom(next);
    if(currentProductId())emit('image_zoom',{product_id:currentProductId(),zoomed:next});
  }
  zoomButton.addEventListener('click', userZoom);
  largeImage.addEventListener('click', userZoom);
  lightbox.addEventListener('click', (event) => { if (event.target === lightbox) closeLightbox(); });

  document.addEventListener('keydown', (event) => {
    if (!lightbox.hidden) {
      if (event.key === 'Escape') {event.preventDefault();event.stopImmediatePropagation();closeLightbox();return;}
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();event.stopImmediatePropagation();
        navigate(event.key === 'ArrowRight' ? 1 : -1);
        return;
      }
      if (event.key === 'Tab') {
        const controls = [...lightbox.querySelectorAll('button:not([hidden])')].filter(node => node.getClientRects().length);
        if (controls.length) {
          const first = controls[0], last = controls[controls.length - 1];
          if (event.shiftKey && (document.activeElement === first || document.activeElement === lightbox)) {
            event.preventDefault();last.focus();
          } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === lightbox)) {
            event.preventDefault();first.focus();
          }
        }
      }
      return;
    }
    if (!productModal.classList.contains('open') || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    if (event.target.closest('input,select,textarea,[contenteditable="true"]')) return;
    event.preventDefault();
    navigate(event.key === 'ArrowRight' ? 1 : -1);
  }, true);
  window.DON_TURRON_GALLERY_READY = true;
})();