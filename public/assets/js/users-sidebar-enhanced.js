/**
 * إصلاح القائمة الجانبية المحسن لصفحة المستخدمين
 * يضمن عمل القائمة الجانبية بشكل صحيح في صفحة users.html
 */

(function() {
    'use strict';

    if (window.__UNIFIED_SIDEBAR_ACTIVE__) {
        return;
    }

    console.log('🔧 بدء إصلاح القائمة الجانبية المحسن لصفحة المستخدمين...');

    // إنشاء قائمة جانبية أساسية في حالة فشل التحميل
    function createBasicSidebar() {
        console.log('🔧 إنشاء قائمة جانبية أساسية...');
        
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) {
            console.error('❌ عنصر القائمة الجانبية غير موجود');
            return;
        }
        
        const basicHTML = `
            <div class="sidebar-header p-3">
                <div class="sidebar-brand">
                    <div class="d-flex align-items-center">
                        <div class="brand-icon me-2">
                            <i class="fas fa-archive text-primary"></i>
                        </div>
                        <div class="brand-text">
                            <h4 class="mb-0">نظام الأرشيف</h4>
                            <span class="text-muted small">v2.1</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="sidebar-content p-3">
                <ul class="sidebar-nav list-unstyled" id="sidebarNav">
                    <li class="sidebar-nav-item mb-2">
                        <a href="index.html" class="sidebar-nav-link d-flex align-items-center p-2 rounded">
                            <i class="fas fa-home me-2"></i>
                            <span class="nav-text">الصفحة الرئيسية</span>
                        </a>
                    </li>
                    <li class="sidebar-nav-item mb-2">
                        <a href="dashboard.html" class="sidebar-nav-link d-flex align-items-center p-2 rounded">
                            <i class="fas fa-tachometer-alt me-2"></i>
                            <span class="nav-text">لوحة التحكم</span>
                        </a>
                    </li>
                    <li class="sidebar-nav-item mb-2">
                        <a href="users.html" class="sidebar-nav-link d-flex align-items-center p-2 rounded active bg-primary text-white">
                            <i class="fas fa-users me-2"></i>
                            <span class="nav-text">إدارة المستخدمين</span>
                        </a>
                    </li>
                    <li class="sidebar-nav-item mb-2">
                        <a href="files.html" class="sidebar-nav-link d-flex align-items-center p-2 rounded">
                            <i class="fas fa-file-alt me-2"></i>
                            <span class="nav-text">الملفات</span>
                        </a>
                    </li>
                    <li class="sidebar-nav-item mb-2">
                        <a href="upload.html" class="sidebar-nav-link d-flex align-items-center p-2 rounded">
                            <i class="fas fa-cloud-upload-alt me-2"></i>
                            <span class="nav-text">رفع الملفات</span>
                        </a>
                    </li>
                    <li class="sidebar-nav-item mb-2">
                        <a href="search.html" class="sidebar-nav-link d-flex align-items-center p-2 rounded">
                            <i class="fas fa-search me-2"></i>
                            <span class="nav-text">البحث</span>
                        </a>
                    </li>
                    <li class="sidebar-nav-item mb-2">
                        <a href="barcode-scanner.html" class="sidebar-nav-link d-flex align-items-center p-2 rounded">
                            <i class="fas fa-qrcode me-2"></i>
                            <span class="nav-text">مسح الباركود</span>
                        </a>
                    </li>
                    <li class="sidebar-nav-item mb-2">
                        <a href="reports.html" class="sidebar-nav-link d-flex align-items-center p-2 rounded">
                            <i class="fas fa-chart-bar me-2"></i>
                            <span class="nav-text">التقارير</span>
                        </a>
                    </li>
                </ul>
            </div>
            
            <div class="sidebar-footer p-3 mt-auto">
                <hr>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">الإصدار 2.1</small>
                    <button class="btn btn-sm btn-outline-secondary" onclick="logout()">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                </div>
            </div>
        `;
        
        sidebar.innerHTML = basicHTML;
        sidebar.classList.remove('hidden');
        
        console.log('✅ تم إنشاء قائمة جانبية أساسية بنجاح');
        
        // إضافة أحداث أساسية
        addBasicSidebarEvents();
    }

    // إضافة أحداث أساسية للقائمة الجانبية
    function addBasicSidebarEvents() {
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('hidden');
                if (overlay) {
                    overlay.classList.toggle('show');
                }
                console.log('🔄 تم تبديل حالة القائمة الجانبية');
            });
        }
        
        if (overlay) {
            overlay.addEventListener('click', () => {
                sidebar.classList.add('hidden');
                overlay.classList.remove('show');
                console.log('🔄 تم إغلاق القائمة الجانبية عبر الطبقة');
            });
        }
        
        // إضافة أحداث للروابط
        const sidebarLinks = sidebar.querySelectorAll('.sidebar-nav-link');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', () => {
                // إغلاق القائمة في الشاشات الصغيرة
                if (window.innerWidth <= 768) {
                    sidebar.classList.add('hidden');
                    if (overlay) {
                        overlay.classList.remove('show');
                    }
                }
            });
        });
        
        console.log('✅ تم إضافة الأحداث الأساسية للقائمة الجانبية');
    }

    // وظيفة إضافية لضمان تهيئة القائمة الجانبية
    async function ensureSidebarInitialization() {
        console.log('🔍 فحص حالة SidebarManager...');
        
        // التحقق من توفر SidebarManager
        if (window.SidebarManager && !window.sidebarManager) {
            console.log('🔧 إنشاء مثيل SidebarManager جديد...');
            try {
                window.sidebarManager = new window.SidebarManager();
                console.log('✅ تم إنشاء SidebarManager بنجاح');
                return true;
            } catch (error) {
                console.error('❌ خطأ في إنشاء SidebarManager:', error);
                return false;
            }
        } else if (window.sidebarManager) {
            console.log('✅ SidebarManager موجود مسبقاً');
            return true;
        } else {
            console.log('⏳ انتظار تحميل SidebarManager...');
            
            let attempts = 0;
            const maxAttempts = 15;
            
            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 300));
                attempts++;
                
                if (window.SidebarManager) {
                    console.log('🔧 إنشاء مثيل SidebarManager...');
                    try {
                        window.sidebarManager = new window.SidebarManager();
                        console.log('✅ تم إنشاء SidebarManager بنجاح (متأخر)');
                        return true;
                    } catch (error) {
                        console.error('❌ خطأ في إنشاء SidebarManager:', error);
                        return false;
                    }
                }
            }
            
            console.error('❌ فشل في تحميل SidebarManager بعد المحاولات المتعددة');
            return false;
        }
    }

    // تحديث القائمة الجانبية مع معلومات المستخدم
    async function updateSidebarWithUserInfo() {
        if (!window.sidebarManager) {
            console.log('⚠️ SidebarManager غير متوفر، استخدام القائمة الأساسية');
            return;
        }

        try {
            // تحديد حالة المصادقة والدور
            let isAuthenticated = false;
            let userRole = 'user';

            // التحقق من نظام المصادقة الموحد
            if (window.unifiedAuth) {
                isAuthenticated = window.unifiedAuth.isAuthenticated || !!window.unifiedAuth.currentUser;
                if (window.unifiedAuth.getCurrentUserRole) {
                    userRole = window.unifiedAuth.getCurrentUserRole();
                } else {
                    userRole = 'admin'; // افتراضي للمدير
                }
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
                
                // التحقق من نجاح التحديث
                setTimeout(() => {
                    const sidebar = document.getElementById('sidebar');
                    if (sidebar && sidebar.children.length === 0) {
                        console.log('⚠️ القائمة فارغة بعد التحديث، إنشاء قائمة أساسية');
                        createBasicSidebar();
                    }
                }, 500);
            } else {
                console.log('❌ المستخدم غير مصادق عليه');
                window.sidebarManager.updateSidebarNav(false);
            }

        } catch (error) {
            console.error('❌ خطأ في تحديث القائمة الجانبية:', error);
            createBasicSidebar();
        }
    }

    // تشخيص حالة القائمة الجانبية
    function diagnoseSidebar() {
        console.log('🔍 تشخيص حالة القائمة الجانبية:');
        console.log('- SidebarManager class متاح:', !!window.SidebarManager);
        console.log('- sidebarManager instance متاح:', !!window.sidebarManager);
        console.log('- عنصر sidebar موجود:', !!document.getElementById('sidebar'));
        console.log('- زر التبديل موجود:', !!document.getElementById('sidebarToggle'));
        console.log('- طبقة التغطية موجودة:', !!document.getElementById('sidebarOverlay'));
        console.log('- نظام المصادقة متاح:', !!window.unifiedAuth);
        console.log('- وضع العرض التوضيحي:', localStorage.getItem('demo_mode'));
        
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            console.log('- محتوى القائمة الجانبية:', sidebar.innerHTML.length > 0 ? 'موجود' : 'فارغ');
            console.log('- عدد العناصر الفرعية:', sidebar.children.length);
            console.log('- فئات CSS:', sidebar.className);
            
            const navItems = sidebar.querySelectorAll('.sidebar-nav-item');
            console.log('- عدد عناصر التنقل:', navItems.length);
            
            if (sidebar.children.length === 0) {
                console.log('⚠️ القائمة فارغة - سيتم إنشاء محتوى أساسي');
                createBasicSidebar();
            }
        } else {
            console.error('❌ عنصر القائمة الجانبية غير موجود');
        }
    }

    // التهيئة الرئيسية
    async function initializeUsersPageSidebar() {
        console.log('🚀 بدء تهيئة القائمة الجانبية لصفحة المستخدمين...');
        
        // انتظار تحميل DOM
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
        
        // التحقق من وجود العناصر الأساسية
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) {
            console.error('❌ عنصر القائمة الجانبية غير موجود في DOM');
            return;
        }
        
        // انتظار تهيئة نظام المصادقة (مع timeout)
        console.log('⏳ انتظار تهيئة نظام المصادقة...');
        let authReady = false;
        let attempts = 0;
        const maxAuthAttempts = 15;
        
        while (!authReady && attempts < maxAuthAttempts) {
            if (window.unifiedAuth && window.unifiedAuth.isInitialized) {
                authReady = true;
                console.log('✅ نظام المصادقة جاهز');
            } else {
                await new Promise(resolve => setTimeout(resolve, 200));
                attempts++;
            }
        }
        
        if (!authReady) {
            console.log('⚠️ نظام المصادقة غير جاهز، تفعيل وضع العرض التوضيحي');
            localStorage.setItem('demo_mode', 'true');
        }
        
        // ضمان تهيئة القائمة الجانبية
        const sidebarInitialized = await ensureSidebarInitialization();
        
        if (sidebarInitialized) {
            // تحديث القائمة الجانبية مع معلومات المستخدم
            await updateSidebarWithUserInfo();
        } else {
            console.log('⚠️ فشل في تهيئة SidebarManager، إنشاء قائمة أساسية');
            createBasicSidebar();
        }
        
        // التحقق من زر التبديل
        const toggleButton = document.getElementById('sidebarToggle');
        if (toggleButton) {
            // إزالة المستمعين الموجودين لتجنب التكرار
            const newToggleButton = toggleButton.cloneNode(true);
            toggleButton.parentNode.replaceChild(newToggleButton, toggleButton);
            
            newToggleButton.addEventListener('click', function() {
                if (window.sidebarManager && window.sidebarManager.toggleSidebar) {
                    window.sidebarManager.toggleSidebar();
                } else {
                    // استخدام التبديل الأساسي
                    sidebar.classList.toggle('hidden');
                    const overlay = document.getElementById('sidebarOverlay');
                    if (overlay) {
                        overlay.classList.toggle('show');
                    }
                }
                console.log('🔄 تم تبديل القائمة الجانبية');
            });
            console.log('✅ تم ربط زر تبديل القائمة الجانبية');
        }
        
        console.log('✅ اكتملت تهيئة القائمة الجانبية لصفحة المستخدمين');
        
        // تشخيص نهائي
        setTimeout(diagnoseSidebar, 1000);
    }

    // إتاحة دوال التشخيص عالمياً
    window.diagnoseSidebar = diagnoseSidebar;
    window.createBasicSidebar = createBasicSidebar;

    // بدء التهيئة عند تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeUsersPageSidebar);
    } else {
        initializeUsersPageSidebar();
    }

    // محاولات إضافية للتأكد
    setTimeout(initializeUsersPageSidebar, 1000);
    setTimeout(diagnoseSidebar, 3000);

})();
