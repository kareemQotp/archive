(function(){
  if(window.__INDEX_BOOTSTRAP__) return; window.__INDEX_BOOTSTRAP__=true;
  // Allow guest access on the landing (index) page to prevent auth redirects
  // This flag is read by unified-auth and any page guards to avoid redirecting to login
  try { window.__ALLOW_GUEST_ACCESS__ = true; } catch(_) {}
  function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }
  async function waitFor(predicate, attempts=50, interval=150){
    for(let i=0;i<attempts;i++){ if(predicate()) return true; await wait(interval); }
    return false;
  }
  function emitAppReady(user){
    if(window.__APP_READY_EMITTED__) return; window.__APP_READY_EMITTED__=true;
    window.__EVENT_BUS__ && window.__EVENT_BUS__.emit('app:ready', { user, registry: window.__MODULE_REGISTRY__ });
  }
  
  async function loadCoreModules() {
    const coreModules = [
      'assets/js/firebase-config.js',
      'assets/js/firebase-init.js',
      'assets/js/unified-auth.js',
      'assets/js/app-config.js',
      'assets/js/cloud-services.js'
    ];
    
    for (const modulePath of coreModules) {
      try {
        await loadScript(modulePath);
      } catch (error) {
        console.warn(`Failed to load core module: ${modulePath}`, error);
      }
    }
  }
  
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      // تحقق من وجود السكريبت مسبقاً
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  async function init(){
    // تحميل الملفات الأساسية أولاً
    await loadCoreModules();
    
    // Wait for loader to finish eager modules
    await waitFor(()=>window.__LOADER_READY__ || (window.__EVENT_BUS__ && false));
    // Wait for auth system
    await waitFor(()=>window.unifiedAuth || window.auth);
    const loadingState = document.getElementById('loadingState');
    const notAuthenticatedState = document.getElementById('notAuthenticatedState');
    const authenticatedState = document.getElementById('authenticatedState');
    function show(el){ el && el.classList.remove('d-none'); }
    function hide(el){ el && el.classList.add('d-none'); }
    function render(user){
      hide(loadingState);
      if(user){ 
        show(authenticatedState); 
        hide(notAuthenticatedState);
        // تحديث معلومات المستخدم
        const userDisplayName = document.getElementById('userDisplayName');
        const userEmail = document.getElementById('userEmail');
        if (userDisplayName) userDisplayName.textContent = user.displayName || user.email?.split('@')[0] || 'مستخدم';
        if (userEmail) userEmail.textContent = user.email || '';
        
        // إعداد زر تسجيل الخروج
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
          logoutBtn.onclick = async () => {
            try {
              if (window.unifiedAuth && window.unifiedAuth.signOut) {
                await window.unifiedAuth.signOut();
              } else if (window.auth && window.auth.signOut) {
                await window.auth.signOut();
              }
              location.reload();
            } catch (error) {
              console.error('خطأ في تسجيل الخروج:', error);
              location.href = 'login.html';
            }
          };
        }
      }
      else { 
        show(notAuthenticatedState); 
        hide(authenticatedState); 
      }
      emitAppReady(user);
    }
    if(window.unifiedAuth){
      window.unifiedAuth.onAuthStateChanged((state,user)=>{
        const resolvedUser = user && user.email ? user : (state && state.email ? state : window.unifiedAuth.currentUser);
        // بدون مستخدم حقيقي: عرض حالة الزائر العامة دون إنشاء مستخدم تجريبي
        if (!resolvedUser) {
          render(null);
        } else {
          render(resolvedUser);
        }
      });
    } else if(window.auth){
      window.auth.onAuthStateChanged(render);
    } else {
      hide(loadingState); show(notAuthenticatedState); emitAppReady(null);
    }
    if(window.initializeSidebar) try { window.initializeSidebar(); } catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init); else init();
})();