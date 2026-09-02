/**
 * File Management Dashboard JavaScript
 * نظام إدارة تتبع الملفات
 */

// Pre-initialization check
function waitForFirebaseAndAuth() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 50;
        
        const checkAll = () => {
            attempts++;
            console.log('🔍 Pre-check ' + attempts + '/' + maxAttempts + ' - Firebase: ' + !!window.firebase + ', Auth: ' + !!window.auth + ', UnifiedAuth: ' + !!window.unifiedAuth);
            
            if (window.firebase && window.auth && window.unifiedAuth) {
                console.log('✅ All Firebase components ready');
                resolve();
            } else if (attempts >= maxAttempts) {
                console.warn('⚠️ Timeout waiting for Firebase components, proceeding anyway');
                resolve();
            } else {
                setTimeout(checkAll, 200);
            }
        };
        
        // Also listen for events
        window.addEventListener('firebaseReady', () => {
            console.log('📡 Firebase ready event received');
            setTimeout(checkAll, 100);
        });
        
        window.addEventListener('firebaseAuthReady', () => {
            console.log('📡 Firebase auth ready event received');
            setTimeout(checkAll, 100);
        });
        
        checkAll();
    });
}

// Initialize variables
let permissionController;
let currentUser = null;
let sidebarManager = null;
let authSystem = null;

// Unified notification helper (success|error|info)
function dashNotify(message, type='info') {
    if (window.UX && window.UX.toast) {
        try { window.UX.toast(message, type); return; } catch(e){}
    }
    if (window.notify) {
        try { window.notify(message, type); return; } catch(e){}
    }
    try { alert(message); } catch(e){}
}

// Department names
const departmentNames = {
    archive: 'الأرشيف',
    legal: 'الشؤون القانونية',
    governance: 'الحوكمة والامتثال',
    collection: 'إدارة التحصيل',
    securitization: 'إدارة التوريق',
    hr: 'الموارد البشرية',
    finance: 'المالية',
    it: 'تقنية المعلومات'
};

function normalizeRole(role) {
    if (window.AuthConstants && typeof window.AuthConstants.normalizeRole === 'function') {
        return window.AuthConstants.normalizeRole(role);
    }
    if (!role) return 'viewer';
    const normalized = String(role).trim().toLowerCase().replace(/\s+/g, '_');
    const aliases = {
        admin: 'admin',
        system_admin: 'super_admin',
        super_admin: 'super_admin',
        dept_admin: 'department_admin',
        manager: 'department_admin',
        'department-admin': 'department_admin',
        department_admin: 'department_admin',
        department_head: 'supervisor',
        supervisor: 'supervisor',
        archive_officer: 'archive_officer',
        'archive-officer': 'archive_officer',
        employee: 'employee',
        user: 'viewer',
        viewer: 'viewer',
        'file-manager': 'employee',
        file_manager: 'employee'
    };
    return aliases[normalized] || normalized;
}

function isAdminRole(role) {
    const normalized = normalizeRole(role);
    return normalized === 'super_admin' || normalized === 'admin';
}

function normalizeDepartment(department) {
    if (!department) return '';
    const normalized = String(department).trim().toLowerCase();
    const aliases = {
        'إدارة الملفات': 'file-management',
        'الملفات': 'file-management',
        'ملفات': 'file-management',
        'file_management': 'file-management'
    };
    return aliases[department] || aliases[normalized] || normalized;
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async function() {
    // تعطيل نظام التوجيه الذكي التلقائي في هذه الصفحة
    window.__DISABLE_AUTO_ROUTING__ = true;
    
    console.log('📋 File Management Dashboard - بدء التهيئة');
    
    // Wait for all Firebase components first
    await waitForFirebaseAndAuth();
    
    // Wait for page access control to complete
    if (window.pageAccessControl) {
        console.log('⏳ انتظار التحقق من صلاحيات الصفحة...');
        // Give page access control time to verify permissions
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Initialize systems step by step
    if (window.unifiedAuth) {
        authSystem = unifiedAuth;
        console.log('✅ Auth system ready');
        
        if (window.UIPermissionController) {
            permissionController = new UIPermissionController(unifiedAuth);
            console.log('✅ Permission controller ready');
        }
        
        sidebarManager = window.sidebarManager || null;
        if (window.unifiedUI && typeof window.unifiedUI.updateSidebar === 'function') {
            await window.unifiedUI.updateSidebar();
            sidebarManager = window.sidebarManager || sidebarManager;
            console.log('✅ Unified sidebar ready');
        }
        
        // Set up auth listener
        unifiedAuth.onAuthStateChanged(handleAuthStateChange);
    } else {
        console.warn('⚠️ Using fallback auth');
        if (window.firebase && firebase.auth) {
            firebase.auth().onAuthStateChanged(handleAuthStateChange);
        }
    }
});

async function handleAuthStateChange(user) {
    console.log('📋 Auth state changed:', user ? user.email : 'No user');
    
    if (!user) {
        console.log('❌ No user - checking again in 3 seconds');
        
        setTimeout(() => {
            const checkUser = authSystem ? authSystem.getCurrentUser() : 
                            (window.firebase && firebase.auth ? firebase.auth().currentUser : null);
            
            if (!checkUser) {
                if (window.__ALLOW_GUEST_ACCESS__) {
                    console.log('🧪 Smoke mode active - skipping auth redirect');
                    return;
                }
                console.log('❌ Still no user - redirecting');
                window.location.href = 'login.html?message=unauthorized';
            } else {
                console.log('✅ User found after check');
                handleAuthStateChange(checkUser);
            }
        }, 3000);
        return;
    }

    currentUser = user;
    console.log('✅ User authenticated:', user.email);

    // Check if user has access to File Management dashboard
    const userDepartment = normalizeDepartment(authSystem?.userProfile?.department || authSystem?.userProfile?.departmentId);
    const userRole = normalizeRole(authSystem?.userProfile?.role);
    const isSystemAdmin = isAdminRole(userRole);
    const isFileManager = ['file-management', 'archive'].includes(userDepartment) && ['department_admin', 'supervisor', 'archive_officer', 'employee'].includes(userRole);
    
    console.log('🔍 فحص صلاحيات الوصول لإدارة الملفات:', {
        userDepartment,
        userRole,
        isSystemAdmin,
        isFileManager,
        userEmail: user.email,
        fullProfile: authSystem?.userProfile
    });
    
    // Allow access for:
    // 1. File management department users
    // 2. File managers (by role)
    // 3. System admins
    // 4. System operators
    const hasAccess = userDepartment === 'file-management' ||
                    userDepartment === 'archive' ||
                    isFileManager ||
                    isSystemAdmin;
    
    if (!hasAccess) {
        console.log('❌ المستخدم لا يملك صلاحية الوصول لإدارة الملفات، التوجيه للوحة العامة');
        console.log('تفاصيل المستخدم:', {
            department: userDepartment,
            role: userRole,
            email: user.email
        });
        alert('ليس لديك صلاحية للوصول إلى لوحة تحكم إدارة الملفات. سيتم توجيهك للوحة التحكم العامة.');
        window.location.href = 'dashboard.html?message=wrong-department';
        return;
    }
    
    console.log('✅ تم منح الوصول لإدارة الملفات');

    // Load user profile
    try {
        const userProfile = authSystem ? authSystem.profile : null;
        if (userProfile) {
            const userBadge = getUserRoleBadge(userProfile.role, userProfile.department);
            updateUserInfoDisplay(user, userBadge);
        } else {
            updateUserInfoDisplay(user, '<span class="badge bg-secondary me-2">مستخدم</span>');
        }
    } catch (error) {
        console.error('خطأ في تحميل الملف الشخصي:', error);
        updateUserInfoDisplay(user, '<span class="badge bg-secondary me-2">مستخدم</span>');
    }

    // Update UI
    if (permissionController) {
        permissionController.updateUI();
    }
    
    if (window.unifiedUI && typeof window.unifiedUI.updateSidebar === 'function') {
        await window.unifiedUI.updateSidebar();
    } else if (sidebarManager) {
        const userRole = unifiedAuth ? unifiedAuth.getCurrentUserRole() : 'user';
        sidebarManager.updateSidebarNav(true, userRole);
    }

    // Load data
    await loadDashboardData();
}

function getUserRoleBadge(role, department) {
    const normalizedRole = normalizeRole(role);
    if (normalizedRole === 'super_admin') {
        return '<span class="badge bg-danger me-2">مدير النظام</span>';
    } else if (normalizedRole === 'department_admin') {
        return '<span class="badge bg-warning me-2">مدير إداري</span>';
    } else if (department) {
        const deptNames = {
            'archive': 'الأرشيف',
            'legal': 'الشؤون القانونية', 
            'governance': 'الحوكمة والامتثال',
            'collection': 'إدارة التحصيل',
            'securitization': 'إدارة التوريق',
            'hr': 'الموارد البشرية',
            'finance': 'المالية',
            'it': 'تقنية المعلومات'
        };
        const deptName = deptNames[department] || department;
        const badgeClass = department === 'archive' ? 'bg-primary' : 
                         department === 'legal' ? 'bg-success' :
                         department === 'governance' ? 'bg-info' :
                         department === 'collection' ? 'bg-warning' : 'bg-secondary';
        return `<span class="badge ${badgeClass} me-2">${deptName}</span>`;
    }
    return '<span class="badge bg-secondary me-2">مستخدم</span>';
}

function updateUserInfoDisplay(user, badge) {
    const userInfoElement = document.getElementById('userInfo');
    if (userInfoElement) {
        userInfoElement.innerHTML = `
            <div class="user-details">
                <div class="user-name">${user.displayName || user.email}</div>
                <div class="user-email">${user.email}</div>
                ${badge}
            </div>
        `;
    }
}

async function loadDashboardData() {
    console.log('📊 Loading file management dashboard data...');
    
    // Check if we have a valid auth system and user
    if (!authSystem || !currentUser) {
        console.warn('⚠️ Auth system or user not ready, skipping data load');
        return;
    }
    
    try {
        if (window.UX && window.UX.showLoading) window.UX.showLoading('dashboard-data');
        await Promise.all([
            loadStatistics(),
            loadPendingFiles(),
            loadRecentActivity()
        ]);
        console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
        console.error('خطأ في تحميل بيانات لوحة الإدارة:', error);
        if (authSystem && authSystem.logError) {
            authSystem.logError('dashboard-load-error', error);
        }
    } finally {
        if (window.UX && window.UX.hideLoading) window.UX.hideLoading('dashboard-data');
    }
}

async function loadStatistics() {
    console.log('📈 Loading file tracking statistics...');
    
    // Check if Firebase is available
    if (!window.db) {
        console.warn('⚠️ Database not available, using demo data');
        // Set demo statistics
        document.getElementById('totalFilesTracked').textContent = '25';
        document.getElementById('pendingTransfers').textContent = '5';
        document.getElementById('completedToday').textContent = '8';
        document.getElementById('urgentFiles').textContent = '2';
        console.log('✅ Demo statistics loaded');
        return;
    }
    
    try {
        // Check if user has access to view statistics
        const userProfile = authSystem ? authSystem.profile : null;
        const canViewAllStats = userProfile && isAdminRole(userProfile.role);
        
        let query = window.db.collection('file_movements')
            .orderBy('timestamp', 'desc')
            .limit(500);

        // If not admin, filter by user's department
        if (!canViewAllStats && userProfile && userProfile.department) {
            console.log('🔒 Filtering statistics by department:', userProfile.department);
            query = window.db.collection('file_movements')
                .where('fromDepartment', '==', userProfile.department)
                .orderBy('timestamp', 'desc')
                .limit(200);
        }

        const movementsSnapshot = await query.get();

        const movements = [];
        movementsSnapshot.forEach(doc => {
            movements.push(doc.data());
        });

        console.log(`📊 Loaded ${movements.length} file movements for statistics`);

        // Calculate statistics
        const totalFiles = new Set(movements.map(m => m.fileNumber)).size;
        const pendingTransfers = movements.filter(m => m.status === 'in_transit').length;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const completedToday = movements.filter(m => 
            m.status === 'received' && 
            m.timestamp && 
            m.timestamp.toDate() >= today
        ).length;

        // Calculate urgent files (files pending for more than 7 days)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const urgentFiles = movements.filter(m => 
            m.status === 'in_transit' && 
            m.timestamp && 
            m.timestamp.toDate() < weekAgo
        ).length;

        // Update UI
        document.getElementById('totalFilesTracked').textContent = totalFiles;
        document.getElementById('pendingTransfers').textContent = pendingTransfers;
        document.getElementById('completedToday').textContent = completedToday;
        document.getElementById('urgentFiles').textContent = urgentFiles;

        console.log('✅ Statistics updated successfully');

    } catch (error) {
        console.error('خطأ في تحميل الإحصائيات:', error);
        // Set default values on error
        ['totalFilesTracked', 'pendingTransfers', 'completedToday', 'urgentFiles'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '0';
        });
    }
}

async function loadPendingFiles() {
    console.log('⏳ Loading pending files...');
    const container = document.getElementById('pendingFilesList');
    
    // Check if Firebase is available
    if (!window.db) {
        console.warn('⚠️ Database not available, using demo data');
        // Set demo pending files
        const F = window.FormatUtils || {};
        const fmt = d => F.formatArabicDate ? F.formatArabicDate(d) : d.toLocaleDateString('ar-SA');
        container.innerHTML = `
            <div class="file-item">
                <div class="file-info flex-grow-1">
                    <h6>ملف رقم 2024/001</h6>
                    <small>من الأرشيف إلى الشؤون القانونية</small>
                    <br><small class="text-muted">تاريخ النقل: ${fmt(new Date())}</small>
                </div>
                <div class="file-status status-pending">معلق</div>
            </div>
            <div class="file-item">
                <div class="file-info flex-grow-1">
                    <h6>ملف رقم 2024/002</h6>
                    <small>من الحوكمة والامتثال إلى المالية</small>
                    <br><small class="text-muted">تاريخ النقل: ${fmt(new Date(Date.now() - 24*60*60*1000))}</small>
                </div>
                <div class="file-status status-urgent">عاجل</div>
            </div>
            <div class="file-item">
                <div class="file-info flex-grow-1">
                    <h6>ملف رقم 2024/003</h6>
                    <small>من إدارة التحصيل إلى الأرشيف</small>
                    <br><small class="text-muted">تاريخ النقل: ${fmt(new Date(Date.now() - 2*24*60*60*1000))}</small>
                </div>
                <div class="file-status status-pending">معلق</div>
            </div>
        `;
        console.log('✅ Demo pending files loaded');
        return;
    }
    
    try {
        // Check user permissions
        const userProfile = authSystem ? authSystem.profile : null;
        const canViewAll = userProfile && isAdminRole(userProfile.role);
        
        let query = window.db.collection('file_movements')
            .where('status', '==', 'in_transit')
            .orderBy('timestamp', 'desc')
            .limit(10);

        // If not admin, filter by user's department
        if (!canViewAll && userProfile && userProfile.department) {
            console.log('🔒 Filtering pending files by department:', userProfile.department);
            query = window.db.collection('file_movements')
                .where('status', '==', 'in_transit')
                .where('fromDepartment', '==', userProfile.department)
                .orderBy('timestamp', 'desc')
                .limit(10);
        }

        const pendingSnapshot = await query.get();

        if (pendingSnapshot.empty) {
            container.innerHTML = `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-check-circle fa-2x mb-2"></i>
                    <p>لا توجد ملفات معلقة حالياً</p>
                </div>
            `;
            console.log('ℹ️ No pending files found');
            return;
        }

        const pendingFiles = [];
        pendingSnapshot.forEach(doc => {
            pendingFiles.push({ id: doc.id, ...doc.data() });
        });

        console.log(`📋 Found ${pendingFiles.length} pending files`);

        const F = window.FormatUtils || {};
        const esc = s => { if (s===undefined||s===null) return ''; if (F.escapeHtml) return F.escapeHtml(String(s)); return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); };
        const fmtDate = d => F.formatArabicDate ? F.formatArabicDate(d) : d.toLocaleDateString('ar-SA');
        container.innerHTML = pendingFiles.map(file => {
            const isUrgent = file.timestamp && 
                (Date.now() - file.timestamp.toDate().getTime()) > (7 * 24 * 60 * 60 * 1000);
            
            const timeAgo = file.timestamp ? fmtDate(new Date(file.timestamp.toDate())) : 'غير محدد';
            
            return `
                <div class="file-item">
                    <div class="file-info flex-grow-1">
                        <h6>${esc(file.fileName || `ملف رقم ${file.fileNumber}`)}</h6>
                        <small>من ${esc(departmentNames[file.fromDepartment] || file.fromDepartment)} إلى ${esc(departmentNames[file.toDepartment] || file.toDepartment)}</small>
                        <br><small class="text-muted">تاريخ النقل: ${timeAgo}</small>
                    </div>
                    <div class="file-status ${isUrgent ? 'status-urgent' : 'status-pending'}">
                        ${isUrgent ? 'عاجل' : 'معلق'}
                    </div>
                </div>
            `;
        }).join('');

        console.log('✅ Pending files loaded successfully');

    } catch (error) {
        console.error('خطأ في تحميل الملفات المعلقة:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                خطأ في تحميل البيانات
            </div>
        `;
    }
}

async function loadRecentActivity() {
    console.log('🕒 Loading recent activity...');
    const container = document.getElementById('recentActivity');
    
    // Check if Firebase is available
    if (!window.db) {
        console.warn('⚠️ Database not available, using demo data');
        // Set demo recent activity
        const F = window.FormatUtils || {};
        const fmtDT = d => F.formatArabicDateTime ? F.formatArabicDateTime(d) : d.toLocaleString('ar-SA');
        container.innerHTML = `
            <div class="d-flex align-items-center mb-3 pb-2 border-bottom">
                <div class="me-3">
                    <i class="fas fa-share text-primary"></i>
                </div>
                <div class="flex-grow-1">
                    <div class="fw-bold mb-1">
                        نقل ملف 2024/001
                        <span class="badge bg-warning ms-2">معلق</span>
                    </div>
                    <small class="text-muted d-block">
                        من الأرشيف إلى الشؤون القانونية
                    </small>
                    <small class="text-muted">admin123@aman.eg - ${fmtDT(new Date())}</small>
                </div>
            </div>
            <div class="d-flex align-items-center mb-3 pb-2 border-bottom">
                <div class="me-3">
                    <i class="fas fa-inbox text-primary"></i>
                </div>
                <div class="flex-grow-1">
                    <div class="fw-bold mb-1">
                        استلام ملف 2024/050
                        <span class="badge bg-success ms-2">مكتمل</span>
                    </div>
                    <small class="text-muted d-block">
                        من المالية إلى الأرشيف
                    </small>
                    <small class="text-muted">admin123@aman.eg - ${fmtDT(new Date(Date.now() - 60*60*1000))}</small>
                </div>
            </div>
        `;
        console.log('✅ Demo recent activity loaded');
        return;
    }
    
    try {
        // Check user permissions
        const userProfile = authSystem ? authSystem.profile : null;
        const canViewAll = userProfile && isAdminRole(userProfile.role);
        
        let query = window.db.collection('file_movements')
            .orderBy('timestamp', 'desc')
            .limit(5);

        // If not admin, show activities related to user's department
        if (!canViewAll && userProfile && userProfile.department) {
            console.log('🔒 Filtering activities by department:', userProfile.department);
            // For recent activity, show both sent from and received to their department
            query = window.db.collection('file_movements')
                .where('fromDepartment', '==', userProfile.department)
                .orderBy('timestamp', 'desc')
                .limit(3);
        }

        const recentSnapshot = await query.get();

        if (recentSnapshot.empty) {
            container.innerHTML = `
                <div class="text-center py-3 text-muted">
                    <i class="fas fa-info-circle me-2"></i>
                    <span>لا توجد نشاطات حديثة</span>
                </div>
            `;
            console.log('ℹ️ No recent activities found');
            return;
        }

        const activities = [];
        recentSnapshot.forEach(doc => {
            activities.push(doc.data());
        });

        console.log(`📊 Found ${activities.length} recent activities`);

        const F = window.FormatUtils || {};
        const esc = s => { if (s===undefined||s===null) return ''; if (F.escapeHtml) return F.escapeHtml(String(s)); return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); };
        const fmtDT = d => F.formatArabicDateTime ? F.formatArabicDateTime(d) : d.toLocaleString('ar-SA');
        container.innerHTML = activities.map(activity => {
            const actionIcon = activity.action === 'transfer' ? 'share' : 
                             activity.action === 'receive' ? 'inbox' : 'exchange-alt';
            const actionText = activity.action === 'transfer' ? 'نقل' : 
                             activity.action === 'receive' ? 'استلام' : 'تحديث';
            const statusBadge = activity.status === 'in_transit' ? 
                '<span class="badge bg-warning ms-2">معلق</span>' : 
                activity.status === 'received' ? 
                '<span class="badge bg-success ms-2">مكتمل</span>' : '';
            
            return `
                <div class="d-flex align-items-center mb-3 pb-2 border-bottom">
                    <div class="me-3">
                        <i class="fas fa-${actionIcon} text-primary"></i>
                    </div>
                    <div class="flex-grow-1">
                        <div class="fw-bold mb-1">${actionText} ملف ${esc(activity.fileNumber || activity.fileName)} ${statusBadge}</div>
                        <small class="text-muted d-block">
                            من ${esc(departmentNames[activity.fromDepartment] || activity.fromDepartment)} 
                            إلى ${esc(departmentNames[activity.toDepartment] || activity.toDepartment)}
                        </small>
                        <small class="text-muted">
                            ${esc(activity.userDisplayName || activity.userEmail)} - 
                            ${activity.timestamp ? fmtDT(new Date(activity.timestamp.toDate())) : 'وقت غير محدد'}
                        </small>
                    </div>
                </div>
            `;
        }).join('');

        console.log('✅ Recent activity loaded successfully');

    } catch (error) {
        console.error('خطأ في تحميل النشاط الأخير:', error);
        container.innerHTML = `
            <div class="alert alert-warning">
                <i class="fas fa-exclamation-triangle me-2"></i>
                خطأ في تحميل النشاط الأخير
            </div>
        `;
    }
}

function refreshData() {
    console.log('🔄 Refreshing file management dashboard data...');
    loadDashboardData();
}

function openBulkTransferModal() {
    console.log('📦 Opening bulk transfer modal');
    const modal = new bootstrap.Modal(document.getElementById('bulkTransferModal'));
    modal.show();
}

async function processBulkTransfer() {
    console.log('📦 Processing bulk transfer...');
    
    const fileNumbers = document.getElementById('bulkFileNumbers').value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    
    const fromDept = document.getElementById('bulkFromDept').value;
    const toDept = document.getElementById('bulkToDept').value;
    const notes = document.getElementById('bulkNotes').value.trim();

    // Validation
    if (fileNumbers.length === 0) { dashNotify('يرجى إدخال أرقام الملفات','error'); return; }
    if (!fromDept || !toDept) { dashNotify('يرجى اختيار الأقسام','error'); return; }
    if (fromDept === toDept) { dashNotify('لا يمكن نقل الملفات لنفس القسم','error'); return; }

    // Check permissions
    try {
        const userProfile = authSystem ? authSystem.profile : null;
        const canTransfer = userProfile && (
            isAdminRole(userProfile.role) ||
            normalizeDepartment(userProfile.department) === fromDept
        );

    if (!canTransfer) { dashNotify('ليس لديك صلاحية لنقل الملفات من هذا القسم','error'); return; }

        console.log(`📦 Starting bulk transfer of ${fileNumbers.length} files from ${fromDept} to ${toDept}`);

        const batch = window.db.batch();
        let successCount = 0;

        for (const fileNumber of fileNumbers) {
            const movementRef = window.db.collection('file_movements').doc();
            batch.set(movementRef, {
                fileNumber: fileNumber,
                fileName: `ملف ${fileNumber}`,
                fromDepartment: fromDept,
                toDepartment: toDept,
                action: 'transfer',
                status: 'in_transit',
                notes: notes + ` (نقل مجمع)`,
                userId: currentUser.uid,
                userEmail: currentUser.email,
                userDisplayName: currentUser.displayName || currentUser.email,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            successCount++;
        }

    if (window.UX && window.UX.showLoading) window.UX.showLoading('bulk-transfer');
    await batch.commit();

        console.log(`✅ Bulk transfer completed successfully: ${successCount} files`);

        // Close modal and refresh
        bootstrap.Modal.getInstance(document.getElementById('bulkTransferModal')).hide();
        document.getElementById('bulkTransferForm').reset();
        loadDashboardData();
        
        dashNotify(`تم نقل ${successCount} ملف بنجاح`,'success');

    } catch (error) {
        console.error('خطأ في النقل المجمع:', error);
        dashNotify('حدث خطأ في النقل المجمع: ' + (error.message || 'خطأ غير معروف'),'error');
    } finally {
        if (window.UX && window.UX.hideLoading) window.UX.hideLoading('bulk-transfer');
    }
}

// Global functions
window.refreshData = refreshData;
window.openBulkTransferModal = openBulkTransferModal;
window.processBulkTransfer = processBulkTransfer;
