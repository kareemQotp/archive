// إصلاح خاص لصفحة المستخدمين - تهيئة القائمة الجانبية
// Users Page Sidebar Fix

(function() {
    'use strict';

    if (window.__UNIFIED_SIDEBAR_ACTIVE__) {
        return;
    }

    // انتظار تحميل DOM
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🔧 بدء إصلاح القائمة الجانبية لصفحة المستخدمين...');
        
        // إعطاء وقت إضافي للملفات للتحميل
        setTimeout(initSidebarForUsersPage, 500);
        setTimeout(initSidebarForUsersPage, 1500);
        setTimeout(initSidebarForUsersPage, 3000);
    });

    async function initSidebarForUsersPage() {
        try {
            // التحقق من وجود العناصر المطلوبة
            const sidebarElement = document.getElementById('sidebar');
            const toggleButton = document.getElementById('sidebarToggle');
            
            if (!sidebarElement) {
                console.error('❌ عنصر القائمة الجانبية غير موجود');
                return;
            }

            // التحقق من تحميل SidebarManager
            if (!window.SidebarManager) {
                console.log('⏳ انتظار تحميل SidebarManager...');
                return;
            }

            // إنشاء أو الحصول على instance
            if (!window.sidebarManager) {
                console.log('🏗️ إنشاء instance جديد للقائمة الجانبية...');
                window.sidebarManager = new window.SidebarManager();
                await window.sidebarManager.init();
            }

            // تحديد حالة المصادقة والدور
            let isAuthenticated = false;
            let userRole = 'user';

            // التحقق من نظام المصادقة الموحد
            if (window.unifiedAuth) {
                isAuthenticated = window.unifiedAuth.isAuthenticated || !!window.unifiedAuth.currentUser;
                userRole = window.unifiedAuth.getCurrentUserRole ? window.unifiedAuth.getCurrentUserRole() : 'admin';
            }

            // التحقق من وضع العرض التوضيحي
            if (localStorage.getItem('demo_mode') === 'true') {
                isAuthenticated = true;
                userRole = 'admin';
                console.log('🎭 وضع العرض التوضيحي مفعل');
            }

            // تحديث القائمة الجانبية
            if (isAuthenticated) {
                console.log(`✅ تحديث القائمة الجانبية للمستخدم: ${userRole}`);
                window.sidebarManager.updateSidebarNav(true, userRole);
                
                // التأكد من أن القائمة مرئية
                if (sidebarElement.children.length === 0) {
                    console.log('🔄 إعادة محاولة تحديث القائمة الجانبية...');
                    setTimeout(() => {
                        window.sidebarManager.updateSidebarNav(true, userRole);
                    }, 1000);
                }
            } else {
                console.log('❌ المستخدم غير مصادق عليه');
                window.sidebarManager.updateSidebarNav(false);
            }

            // التحقق من وجود زر التبديل
            if (toggleButton && !toggleButton.onclick) {
                toggleButton.addEventListener('click', function() {
                    if (window.sidebarManager) {
                        window.sidebarManager.toggleSidebar();
                    }
                });
                console.log('🔘 تم ربط زر تبديل القائمة الجانبية');
            }

            console.log('✅ تم إصلاح القائمة الجانبية بنجاح لصفحة المستخدمين');

        } catch (error) {
            console.error('❌ خطأ في إصلاح القائمة الجانبية:', error);
        }
    }

    // دالة إضافية للتحقق من حالة القائمة الجانبية
    function debugSidebar() {
        console.log('🔍 تشخيص القائمة الجانبية:');
        console.log('- SidebarManager متاح:', !!window.SidebarManager);
        console.log('- sidebarManager instance:', !!window.sidebarManager);
        console.log('- عنصر sidebar:', !!document.getElementById('sidebar'));
        console.log('- زر التبديل:', !!document.getElementById('sidebarToggle'));
        console.log('- نظام المصادقة:', !!window.unifiedAuth);
        console.log('- وضع العرض التوضيحي:', localStorage.getItem('demo_mode'));
        
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            console.log('- محتوى القائمة الجانبية:', sidebar.innerHTML.length > 0 ? 'موجود' : 'فارغ');
            console.log('- عدد العناصر الفرعية:', sidebar.children.length);
        }
    }

    // إتاحة دالة التشخيص عالمياً
    window.debugSidebar = debugSidebar;

    // تشغيل التشخيص بعد 5 ثوانٍ
    setTimeout(debugSidebar, 5000);

})();
