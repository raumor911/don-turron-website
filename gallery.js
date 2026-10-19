/* Don Turrón · Visor fotográfico V4.2. Sin cajas superiores duplicadas; zoom y navegación intactos. */
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
    if(currentProductId())emit('image_zoom',{product_id:currentProductId(),zoomed:true});
  }
  function closeLightbox() {
    if (lightbox.hidden) return;
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
  }

  // openProduct reemplaza el contenido dinámicamente. Se mejora sin modificar su modelo.
  new MutationObserver(enhanceModal).observe(modalContent, {childList: true});
  modalContent.addEventListener('click', (event) => {
    if (event.target.closest('[data-photo-index]')) queueMicrotask(updateModalStatus);
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