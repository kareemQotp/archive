// Simple Event Bus (Pub/Sub)
(function(){
  if(window.__EVENT_BUS__) return; // idempotent
  const listeners = new Map();
  const bus = {
    on(event, handler){
      if(!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(handler);
      return () => listeners.get(event)?.delete(handler);
    },
    once(event, handler){
      const off = this.on(event, (...a)=>{ off(); handler(...a); });
      return off;
    },
    emit(event, payload){
      (listeners.get(event) || []).forEach(fn => { try { fn(payload); } catch(e){ console.error('event-bus handler error', e); } });
    },
    clear(event){ if(event) listeners.delete(event); else listeners.clear(); }
  };
  window.__EVENT_BUS__ = bus;
})();