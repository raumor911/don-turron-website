/* Don Turrón · Telemetría opcional. Sin cookies, datos personales ni efectos visuales. */
(()=>{
 'use strict';
 try{
  if(navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true||!crypto?.randomUUID||
     /bot|crawler|spider|ChatGPT-User/i.test(navigator.userAgent||''))return;
  const controller=new AbortController();
  const deadline=setTimeout(()=>controller.abort(),1400);
  fetch('/api/telemetry/config',{cache:'no-store',credentials:'same-origin',signal:controller.signal})
   .then(r=>r.ok?r.json():null).then(cfg=>{
    clearTimeout(deadline);
    if(!cfg||cfg.enabled!==true||cfg.site_id!=='don-turron')return;
    const key='don-turron:telemetry-v1';
    const now=Date.now();let ids=null;
    try{ids=JSON.parse(sessionStorage.getItem(key)||'null')}catch{}
    if(!ids||!Number.isFinite(ids.active)||now-ids.active>1800000||
       typeof ids.visitor_id!=='string'||typeof ids.session_id!=='string')
      ids={visitor_id:crypto.randomUUID(),session_id:crypto.randomUUID(),active:now};
    const store=()=>{ids.active=Date.now();try{sessionStorage.setItem(key,JSON.stringify(ids))}catch{}};
    store();
    function send(event,properties={}){
     try{
      if(Date.now()-ids.active>1800000)ids.session_id=crypto.randomUUID();
      store();
      const payload={event,visitor_id:ids.visitor_id,session_id:ids.session_id,
       path:location.pathname,device_type:innerWidth<768?'mobile':innerWidth<1024?'tablet':'desktop',properties};
      const data=JSON.stringify(payload);
      if(navigator.sendBeacon?.('/api/telemetry',new Blob([data],{type:'application/json'})))return;
      fetch('/api/telemetry',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:data,keepalive:true}).catch(()=>{});
     }catch{} // No impact on interaction.
    }
    send('page_view');
    window.addEventListener('dt:interaction',e=>{
     if(!e||!e.detail||typeof e.detail.event!=='string')return;
     const {event,product_id,filter,image_index,zoomed}=e.detail;
     const allowed=['product_view','gallery_navigation','image_zoom','category_filter','selection_add','selection_remove','selection_open','selection_copy'];
     if(!allowed.includes(event))return;
     const props={};
     if(typeof product_id==='string'&&/^[a-z0-9-]{1,70}$/.test(product_id))props.product_id=product_id;
     if(typeof filter==='string')props.filter=filter;
     if(Number.isInteger(image_index))props.image_index=image_index;
     if(typeof zoomed==='boolean')props.zoomed=zoomed;
     send(event,props);
    },{passive:true});
    document.addEventListener('click',e=>{
     const link=e.target?.closest?.('a[href]');if(!link)return;
     const href=link.getAttribute('href')||'';
     if(/^(mailto:|tel:|https:\/\/wa\.me\/)/i.test(href))send('contact_click');
    },{passive:true});
    if('IntersectionObserver' in window){
     const observer=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting){
       const id=entry.target.id;
       if(id&&/^[a-z0-9_-]{1,48}$/i.test(id))send('section_view',{section:id});
       observer.unobserve(entry.target);
      }
     },{threshold:.35});
     document.querySelectorAll('main>section[id]').forEach(el=>observer.observe(el));
    }
   }).catch(()=>clearTimeout(deadline));
 }catch{} // A telemetry failure never interrupts the page.
})();
