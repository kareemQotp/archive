// Lazy Loader Helper
// Provides declarative and imperative APIs to load manifest modules marked lazy
(function(){
  if(window.__LAZY_LOADER__) return; window.__LAZY_LOADER__=true;
  function load(name){
    if(!window.__loadModule){ console.warn('lazy-loader: core loader not ready'); return Promise.resolve(); }
    return window.__loadModule(name);
  }
  // Auto: elements with data-load-module on interaction
  function attachHandlers(){
    document.querySelectorAll('[data-load-module]').forEach(el=>{
      const mod = el.getAttribute('data-load-module');
      const trigger = el.getAttribute('data-load-trigger') || 'click';
      const handler = ()=>{ load(mod); el.removeEventListener(trigger, handler); };
      el.addEventListener(trigger, handler, { once:true });
    });
    // Intersection Observer for data-load-on="visible"
    if('IntersectionObserver' in window){
      const io = new IntersectionObserver(entries=>{
        entries.forEach(e=>{
          if(e.isIntersecting){
            const mod = e.target.getAttribute('data-load-visible');
            if(mod){ load(mod); io.unobserve(e.target); }
          }
        });
      }, { rootMargin: '200px' });
      document.querySelectorAll('[data-load-visible]').forEach(el=>io.observe(el));
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', attachHandlers); else attachHandlers();
  window.lazyModules = { load };
})();