// إصلاح سريع لمشكلة عدم ظهور المستخدمين
// Quick fix for users not displaying issue

console.log('🔧 تحميل إصلاح المستخدمين...');

// دالة إصلاح لجلب المستخدمين مباشرة من Firestore
async function debugLoadUsers() {
    console.log('🔍 بدء تشخيص جلب المستخدمين...');
    
    // التحقق من المتطلبات الأساسية
    if (!window.db) {
        console.error('❌ Firestore غير متاح');
        return { success: false, error: 'Firestore not available' };
    }
    
    if (!window.auth) {
        console.error('❌ Firebase Auth غير متاح');
        return { success: false, error: 'Firebase Auth not available' };
    }
    
    if (!window.auth.currentUser) {
        console.warn('⚠️ لا يوجد مستخدم مسجل دخول');
        return { success: false, error: 'No authenticated user' };
    }
    
    try {
        console.log('📊 محاولة جلب المستخدمين من Firestore...');
        
        // محاولة 1: استعلام بسيط بدون ordering
        let usersQuery = window.db.collection('users').limit(20);
        console.log('🔍 استعلام بسيط بدون ترتيب...');
        
        let snapshot = await usersQuery.get();
        console.log(`✅ نجح الاستعلام البسيط - عدد النتائج: ${snapshot.size}`);
        
        if (snapshot.size === 0) {
            // محاولة 2: التحقق من وجود أي مستندات في المجموعة
            console.log('🔍 فحص وجود أي مستندات...');
            const anyDoc = await window.db.collection('users').limit(1).get();
            
            if (anyDoc.size === 0) {
                console.warn('⚠️ مجموعة المستخدمين فارغة تماماً');
                return { success: true, users: [], message: 'Users collection is empty' };
            }
        }
        
        // معالجة البيانات
        const users = [];
        snapshot.forEach(doc => {
            const userData = doc.data();
            users.push({
                id: doc.id,
                ...userData,
                // تأكد من وجود الحقول الأساسية
                email: userData.email || 'غير محدد',
                displayName: userData.displayName || userData.fullName || 'غير محدد',
                role: userData.role || 'viewer',
                department: userData.department || 'غير محدد',
                createdAt: userData.createdAt || 'غير محدد'
            });
        });
        
        console.log(`✅ تم جلب ${users.length} مستخدم بنجاح`);
        users.forEach((user, index) => {
            console.log(`👤 ${index + 1}. ${user.email} - ${user.role} - ${user.department}`);
        });
        
        return { success: true, users, count: users.length };
        
    } catch (error) {
        console.error('❌ خطأ في جلب المستخدمين:', error);
        console.error('🔍 رمز الخطأ:', error.code);
        console.error('🔍 رسالة الخطأ:', error.message);
        
        return { success: false, error: error.message, code: error.code };
    }
}

// دالة لعرض المستخدمين في صفحة إدارة المستخدمين
function forceDisplayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) {
        console.error('❌ جدول المستخدمين غير موجود');
        return;
    }
    
    // إخفاء spinner وإظهار الجدول
    const loadingSpinner = document.getElementById('loadingSpinner');
    const usersTable = document.getElementById('usersTable');
    
    if (loadingSpinner) loadingSpinner.style.display = 'none';
    if (usersTable) usersTable.classList.remove('d-none');
    
    tbody.innerHTML = '';
    
    if (!users || users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="text-muted">
                        <i class="fas fa-users fa-3x mb-3"></i>
                        <p class="mb-0">لا توجد مستخدمين لعرضها</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    users.forEach(user => {
        const row = document.createElement('tr');
        
        // تحديد لون الدور
        const roleColorMap = {
            'admin': 'bg-danger',
            'system_admin': 'bg-danger',
            'archive_officer': 'bg-primary',
            'archive-officer': 'bg-primary',
            'user': 'bg-success',
            'viewer': 'bg-secondary'
        };
        
        const roleColor = roleColorMap[user.role] || 'bg-secondary';
        
        // تنسيق التاريخ
        let createdAtFormatted = 'غير محدد';
        if (user.createdAt && user.createdAt.toDate) {
            createdAtFormatted = user.createdAt.toDate().toLocaleDateString('ar-SA');
        } else if (user.createdAt && typeof user.createdAt === 'string') {
            createdAtFormatted = new Date(user.createdAt).toLocaleDateString('ar-SA');
        }
        
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <div class="avatar-initial bg-primary text-white rounded-circle me-3">
                        ${(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div class="fw-medium">${user.displayName || 'غير محدد'}</div>
                        <small class="text-muted">${user.email || 'غير محدد'}</small>
                    </div>
                </div>
            </td>
            <td><span class="badge ${roleColor}">${user.role || 'غير محدد'}</span></td>
            <td>${user.department || 'غير محدد'}</td>
            <td>${createdAtFormatted}</td>
            <td><span class="badge bg-success">نشط</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-edit" onclick="openEditUser('${user.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-approve" onclick="openRoleModal('${user.id}')">
                        <i class="fas fa-user-cog"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    console.log(`✅ تم عرض ${users.length} مستخدم في الجدول`);
}

// دالة لإصلاح المشكلة تلقائياً عند التحميل
async function autoFixUsersDisplay() {
    console.log('🔧 بدء الإصلاح التلقائي لعرض المستخدمين...');
    // إذا كانت الصفحة قد قامت بالفعل بتحميل المستخدمين (بشكل حقيقي أو عبر بديل Auth)، فلا تتدخل
    try {
        const tbody = document.getElementById('usersTableBody');
        const preloaded = (Array.isArray(window.allUsers) && window.allUsers.length > 0);
        const hasRows = !!tbody && tbody.children && tbody.children.length > 0;
        if (preloaded || hasRows) {
            console.log('✅ تم العثور على مستخدمين محمّلين/معروضين بالفعل، سيتم تخطي الإصلاح التلقائي.');
            return true;
        }
    } catch (_) { /* ignore */ }
    
    // انتظار تهيئة Firebase
    let maxWait = 30; // 3 seconds
    while ((!window.db || !window.auth) && maxWait > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
        maxWait--;
    }
    
    if (!window.db || !window.auth) {
        console.error('❌ Firebase غير جاهز بعد الانتظار');
        return false;
    }
    
    // جلب المستخدمين
    const result = await debugLoadUsers();
    
    if (result.success) {
        // تحديث المتغيرات العامة
        if (typeof window.allUsers !== 'undefined') {
            window.allUsers = result.users;
            console.log('✅ تم تحديث window.allUsers');
        }
        
        // عرض المستخدمين
        forceDisplayUsers(result.users);
        
        // تحديث الإحصائيات
        if (typeof updateStatistics === 'function') {
            updateStatistics(result.users);
        }
        
        return true;
    } else {
        console.error('❌ فشل في جلب المستخدمين:', result.error);
        return false;
    }
}

// تصدير الدوال للاستخدام العام
window.debugLoadUsers = debugLoadUsers;
window.forceDisplayUsers = forceDisplayUsers;
window.autoFixUsersDisplay = autoFixUsersDisplay;

// تشغيل الإصلاح التلقائي عند تحميل الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(autoFixUsersDisplay, 2000);
    });
} else {
    setTimeout(autoFixUsersDisplay, 2000);
}

console.log('✅ إصلاح المستخدمين محمل ومتاح');