// page-bootstrap.js - shared bootstrap for all non-index pages
(function(){
  if(window.__PAGE_BOOTSTRAP__) return; window.__PAGE_BOOTSTRAP__=true;
  const bus = window.__EVENT_BUS__;
  function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }
  async function waitFor(pred, attempts=60, interval=100){ for(let i=0;i<attempts;i++){ try { if(pred()) return true; } catch(e){} await wait(interval);} return false; }
  async function init(){
    await waitFor(()=>window.__LOADER_READY__);
    await waitFor(()=>window.unifiedAuth && window.unifiedAuth.isInitialized);
    // emit page:ready when auth state resolved at least once
    if(window.unifiedAuth && !window.__PAGE_APP_READY_LISTENER__){
      window.__PAGE_APP_READY_LISTENER__=true;
      window.unifiedAuth.onAuthStateChanged((user)=>{
        if(!window.__APP_READY_EMITTED__){
          window.__APP_READY_EMITTED__=true;
          bus && bus.emit('app:ready', { user, registry: window.__MODULE_REGISTRY__ });
        }
        bus && bus.emit('page:ready', { user });
      });
    } else {
      // fallback
      bus && bus.emit('page:ready', { user: (window.unifiedAuth && window.unifiedAuth.currentUser)||null });
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();