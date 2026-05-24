// index-page.js - functions previously inline in index.html (extracted 2025-08-20)
(function(){
  if(window.__INDEX_PAGE_SCRIPT__) return; window.__INDEX_PAGE_SCRIPT__=true;
  const bus = window.__EVENT_BUS__;
  function safe(fn){ try { return fn(); } catch(e){ console.error('[index-page] error', e);} }
  function initializeNotificationSystem(){
    // تعطيل نظام الإشعارات بالكامل في الصفحة الرئيسية
    console.log('🔇 تم تعطيل نظام الإشعارات في الصفحة الرئيسية بالكامل');
    
    // إخفاء حاوي الإشعارات في الصفحة الرئيسية
    const notificationContainer = document.getElementById('notificationContainer');
    if (notificationContainer) {
      notificationContainer.style.display = 'none';
      notificationContainer.classList.add('hidden');
    }
    
    // منع تحميل أي خدمات إشعارات
    window.__NOTIFICATIONS_DISABLED__ = true;
    
    // منع أي استدعاءات لحذف الإشعارات
    window.clearAllNotifications = function() {
      console.log('🔇 تم منع حذف الإشعارات في الصفحة الرئيسية');
      return false;
    };
    
    // منع أي confirm dialogs متعلقة بالإشعارات
    const originalConfirm = window.confirm;
    window.confirm = function(message) {
      if (message && message.includes('إشعار')) {
        console.log('🔇 تم منع رسالة تأكيد الإشعارات:', message);
        return false;
      }
      return originalConfirm.call(this, message);
    };
    
    console.log('✅ تم تعطيل نظام الإشعارات بالكامل في الصفحة الرئيسية');
  }
  function showNavigationLoading(message){
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'navigationLoading';
    loadingOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,180,216,.9);display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:9999;color:#fff;font-family:Cairo,sans-serif;';
    loadingOverlay.innerHTML = '<div class="spinner-border text-light mb-3" style="width:3rem;height:3rem;" role="status"><span class="visually-hidden">جاري التحميل...</span></div><h4 class="text-white">'+message+'</h4>';
    document.body.appendChild(loadingOverlay);
  }
  window.goToUpload = ()=>{ showNavigationLoading('جاري الانتقال لصفحة رفع الملفات...'); setTimeout(()=>location.href='upload.html',500); };
  window.goToSearch = ()=>{ showNavigationLoading('جاري الانتقال لصفحة البحث...'); setTimeout(()=>location.href='search.html',500); };
  window.goToScanner = ()=>{ showNavigationLoading('جاري تحضير الماسح الضوئي...'); setTimeout(()=>location.href='scanner.html',500); };
  window.goToFileTracking = ()=>{ showNavigationLoading('جاري تحميل نظام التتبع...'); setTimeout(()=>location.href='file-tracking.html',500); };
  window.goToMovementReports = ()=>{ showNavigationLoading('جاري تحضير التقارير...'); setTimeout(()=>location.href='movement-reports.html',500); };
  window.goToFileManagement = ()=>{ showNavigationLoading('جاري تحميل لوحة الإدارة...'); setTimeout(()=>location.href='file-management-dashboard.html',500); };
  window.goToNotificationSettings = ()=>{ showNavigationLoading('جاري تحميل إعدادات الإشعارات...'); setTimeout(()=>location.href='notification-settings.html',500); };
  window.goToCreateAdmin = ()=>{ showNavigationLoading('جاري تحميل إدارة المدراء...'); setTimeout(()=>location.href='create-admin.html',500); };
  window.goToAdminManagement = ()=>{ showNavigationLoading('جاري تحميل إدارة الأدوار...'); setTimeout(()=>location.href='admin-management.html',500); };
  function showWelcomeNotification(displayName){
    const notification = document.createElement('div');
    notification.className='welcome-notification';
    notification.style.cssText='position:fixed;top:20px;right:20px;background:linear-gradient(135deg,rgba(255,255,255,.3),rgba(255,255,255,.1));color:#fff;padding:1rem 1.5rem;border-radius:12px;border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:0 8px 32px rgba(31,38,135,.37);z-index:1000;transform:translateX(100%) scale(.8);transition:all .4s cubic-bezier(.4,0,.2,1);font-family:Cairo,sans-serif;max-width:320px;text-shadow:0 1px 2px rgba(0,0,0,.1);';
    notification.innerHTML='<div class="d-flex align-items-center"><div class="me-3" style="font-size:1.5rem;"><i class="fas fa-check-circle" style="color:#28a745;"></i></div><div><div style="font-weight:700;margin-bottom:.25rem;">أهلاً وسهلاً، '+displayName+'! 👋</div><div style="font-size:.9rem;opacity:.9;">تم تسجيل الدخول بنجاح ✨</div></div></div>';
    document.body.appendChild(notification);
    setTimeout(()=>{ notification.style.transform='translateX(0) scale(1)'; },100);
    setTimeout(()=>{ notification.style.animation='float 3s ease-in-out infinite'; },500);
    setTimeout(()=>{ notification.style.transform='translateX(100%) scale(.8)'; notification.style.opacity='0'; setTimeout(()=>notification.remove(),400); },4000);
  }
  function attachFloatingAnimation(){
    if(document.getElementById('floating-animation-style')) return;
    const style=document.createElement('style');
    style.id='floating-animation-style';
    style.textContent='@keyframes float {0%,100%{transform:translateX(0) translateY(0) scale(1);}50%{transform:translateX(0) translateY(-5px) scale(1.02);}}';
    document.head.appendChild(style);
  }
  // Listen for app ready to show welcome if authenticated
  function onAppReady(e){
    const user = (e && e.user) || (window.unifiedAuth && window.unifiedAuth.currentUser);
    attachFloatingAnimation();
    
  // Check for automatic redirection to dashboard for authenticated users
  if (user && window.unifiedAuth && window.unifiedAuth.isAuthenticated) {
      // Add a small delay to ensure user profile is loaded
      setTimeout(async () => {
        try {
          const userData = await window.unifiedAuth.getCurrentUserData();
          
      if (userData) {
      console.log('🚀 مستخدم مسجل دخول - التوجيه عبر الراوتر المركزي');
      if (typeof window.redirectToDashboard === 'function') {
        return window.redirectToDashboard(userData);
      }
      if (window.roleBasedRouter) {
        const target = window.roleBasedRouter.getDashboardRoute(userData);
        console.log('🎯 التوجيه النهائي (محسوب):', target);
        window.location.href = target || 'dashboard.html';
        return;
      }
      window.location.href = 'dashboard.html';
      return;
      }
        } catch (error) {
          console.warn('⚠️ خطأ في التوجيه التلقائي:', error);
        }
        
        // Show welcome notification if staying on homepage
        if (user) {
          showWelcomeNotification(user.displayName || (user.email && user.email.split('@')[0]) || 'مستخدم');
        }
      }, 1000);
    } else if (user) {
      showWelcomeNotification(user.displayName || (user.email && user.email.split('@')[0]) || 'مستخدم');
    }
    
    initializeNotificationSystem();
    document.removeEventListener('app:ready', onAppReady);
  }
  if(bus){ bus.on('app:ready', onAppReady); } else { document.addEventListener('app:ready', onAppReady); }
})();