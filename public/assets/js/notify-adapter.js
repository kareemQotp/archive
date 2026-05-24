// Unified Notify Adapter
(function(){
  if(window.__NOTIFY_ADAPTER__) return; window.__NOTIFY_ADAPTER__=true;
  function resolveProvider(){
    if(window.notificationManager) return window.notificationManager;
    if(window.notificationService) return window.notificationService;
    if(window.notify) return window.notify;
    return null;
  }
  function ensure(){
    const p = resolveProvider();
    if(!p){ console.warn('notify-adapter: no provider available yet'); return null; }
    return p;
  }
  const adapter = {
    info(t,m,o={}){ const p=ensure(); p&& (p.info? p.info(t,m,o): console.info(t,m)); },
    success(t,m,o={}){ const p=ensure(); p&& (p.success? p.success(t,m,o): console.log(t,m)); },
    warning(t,m,o={}){ const p=ensure(); p&& (p.warning? p.warning(t,m,o): console.warn(t,m)); },
    error(t,m,o={}){ const p=ensure(); p&& (p.error? p.error(t,m,o): console.error(t,m)); }
  };
  window.notify = adapter; // override / unify
  window.__EVENT_BUS__ && window.__EVENT_BUS__.emit('notify:ready');
})();