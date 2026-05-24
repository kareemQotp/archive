// ux-core.js: shared UX helpers (loading overlay, focus trap, toasts skeleton)
(function(){
  if(window.__UX_CORE__) return; window.__UX_CORE__ = true;
  const UX = {};
  // Loading overlay singleton
  let overlayEl = null; let overlayCounter = 0;
  UX.showLoading = function(label='جاري المعالجة...'){
    overlayCounter++;
    if(!overlayEl){
      overlayEl = document.createElement('div');
      overlayEl.className='global-loading-overlay';
      overlayEl.innerHTML = `<div class="glo-container" role="status" aria-live="assertive"><div class="glo-spinner"></div><div class="glo-label">${label}</div></div>`;
      document.body.appendChild(overlayEl);
      requestAnimationFrame(()=>overlayEl.classList.add('visible'));
    } else {
      const lbl = overlayEl.querySelector('.glo-label'); if(lbl) lbl.textContent = label;
    }
  };
  UX.hideLoading = function(){
    overlayCounter = Math.max(0, overlayCounter-1);
    if(overlayCounter===0 && overlayEl){
      overlayEl.classList.remove('visible');
      setTimeout(()=>{ if(overlayCounter===0 && overlayEl){ overlayEl.remove(); overlayEl=null; } },250);
    }
  };
  UX.focusRing = function(){
    // Add a11y focus class on keyboard nav
    function handle(e){ if(e.key==='Tab'){ document.documentElement.classList.add('using-keyboard'); window.removeEventListener('keydown', handle); } }
    window.addEventListener('keydown', handle);
  };
  UX.announce = function(msg){
    let region = document.getElementById('aria-live-region');
    if(!region){ region = document.createElement('div'); region.id='aria-live-region'; region.setAttribute('aria-live','polite'); region.className='visually-hidden'; document.body.appendChild(region); }
    region.textContent=''; setTimeout(()=> region.textContent=msg, 50);
  };
  // Lightweight toast wrapper that prefers existing notify adapter
  const recentToasts = new Map(); // key => last timestamp
  UX.toast = function(type='info', title='إشعار', message=''){ /* unify with window.notify if available */
    const F = window.FormatUtils || {};
    const esc = t => (F.escapeHtml? F.escapeHtml(t): (t? String(t).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])):''));
    const key = type+'|'+title+'|'+message;
    const now = Date.now();
    if(recentToasts.has(key) && (now - recentToasts.get(key) < 2500)) return; // suppress duplicates within 2.5s
    recentToasts.set(key, now);
    if(window.notify){
      const fn = window.notify[type] || window.notify.info; fn(esc(title), esc(message));
      UX.announce(title+': '+message);
      return;
    }
    // Fallback accessible toast
    let c = document.getElementById('ux-toast-container');
    if(!c){
      c=document.createElement('div'); c.id='ux-toast-container'; c.className='ux-toast-container'; c.setAttribute('role','region'); c.setAttribute('aria-label','إشعارات النظام');
      document.body.appendChild(c);
    }
    const iconMap = { success:'<i class="fas fa-check-circle"></i>', error:'<i class="fas fa-times-circle"></i>', warning:'<i class="fas fa-exclamation-triangle"></i>', info:'<i class="fas fa-info-circle"></i>' };
    const el=document.createElement('div');
    el.className='ux-toast ux-toast-'+type; el.setAttribute('role','alert'); el.setAttribute('aria-live','assertive');
    el.innerHTML=`<div class="ux-toast-icon">${iconMap[type]||iconMap.info}</div><div class="ux-toast-content"><strong class="ux-toast-title">${esc(title)}</strong><div class="ux-toast-msg">${esc(message)}</div></div><button class="ux-toast-close" aria-label="إغلاق" title="إغلاق">&times;</button>`;
    c.appendChild(el);
    el.querySelector('.ux-toast-close').addEventListener('click', ()=> { el.classList.remove('show'); setTimeout(()=> el.remove(),300); });
    requestAnimationFrame(()=> el.classList.add('show'));
    UX.announce(title+': '+message);
    setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=> el.remove(),400); }, 5000);
  };
  window.UX = UX;
})();