/**
 * حماية من حلقات إعادة التوجيه اللانهائية
 * Redirect Loop Protection System
 */

class RedirectProtection {
    constructor() {
        this.redirectHistory = [];
        this.maxRedirectAttempts = 5;
        this.redirectTimeWindow = 10000; // 10 seconds
        this.isProtectionActive = true;
    }

    /**
     * فحص ما إذا كان إعادة التوجيه آمنة
     */
    isRedirectSafe(targetUrl) {
        const currentTime = Date.now();
        const currentPage = window.location.href;
        
        // تنظيف السجل القديم
        this.redirectHistory = this.redirectHistory.filter(
            entry => currentTime - entry.timestamp < this.redirectTimeWindow
        );

        // إضافة المحاولة الحالية
        this.redirectHistory.push({
            from: currentPage,
            to: targetUrl,
            timestamp: currentTime
        });

        // فحص الحلقات المحتملة
        const recentRedirects = this.redirectHistory.filter(
            entry => entry.to === targetUrl || entry.from === targetUrl
        );

        if (recentRedirects.length >= this.maxRedirectAttempts) {
            console.error('🚫 تم اكتشاف حلقة إعادة توجيه محتملة:', {
                target: targetUrl,
                attempts: recentRedirects.length,
                history: this.redirectHistory.slice(-5)
            });
            return false;
        }

        return true;
    }

    /**
     * إعادة التوجيه الآمنة
     */
    safeRedirect(targetUrl, reason = 'غير محدد') {
        try {
            // منع الحلقات ذات المسار الواحد
            if (window.location.href === targetUrl) {
                console.warn('🔄 منع إعادة التوجيه لنفس الصفحة:', targetUrl);
                return false;
            }

            // منع إعادة التوجيه لصفحات تسجيل الدخول من صفحات التسجيل نفسها
            const currentPage = window.location.pathname.split('/').pop() || '';
            const targetPage = targetUrl.split('/').pop() || '';
            
            if ((currentPage === 'login.html' && targetPage === 'login.html') ||
                (currentPage === 'register.html' && targetPage === 'register.html')) {
                console.warn('🔄 منع إعادة التوجيه الدائري بين صفحات التوثيق');
                return false;
            }

            // فحص الحماية
            if (!this.isRedirectSafe(targetUrl)) {
                this.handleRedirectLoop(targetUrl);
                return false;
            }

            console.log(`🚀 إعادة توجيه آمنة إلى: ${targetUrl} (السبب: ${reason})`);
            
            // تأخير بسيط لضمان اكتمال العمليات الحالية
            setTimeout(() => {
                window.location.href = targetUrl;
            }, 100);
            
            return true;
        } catch (error) {
            console.error('❌ خطأ في إعادة التوجيه الآمنة:', error);
            return false;
        }
    }

    /**
     * معالجة حلقة إعادة التوجيه
     */
    handleRedirectLoop(targetUrl) {
        console.error('🚫 تم اكتشاف حلقة إعادة توجيه - إيقاف التوجيه التلقائي');
        
        // إظهار رسالة للمستخدم
        this.showLoopWarning(targetUrl);
        
        // مسح سجل إعادة التوجيه
        this.clearHistory();
        
        // إيقاف الحماية مؤقتاً لمنع المشاكل الإضافية
        this.isProtectionActive = false;
        setTimeout(() => {
            this.isProtectionActive = true;
        }, 30000); // 30 ثانية
    }

    /**
     * إظهار تحذير للمستخدم
     */
    showLoopWarning(targetUrl) {
        const warning = document.createElement('div');
        warning.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #ff6b6b, #ffa500);
            color: white;
            padding: 2rem;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 400px;
            text-align: center;
            font-family: 'Cairo', sans-serif;
        `;
        
        warning.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
            <h3 style="margin-bottom: 1rem;">تحذير: مشكلة في التنقل</h3>
            <p style="margin-bottom: 1.5rem;">تم اكتشاف مشكلة في عملية إعادة التوجيه. يرجى المحاولة يدوياً.</p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button onclick="window.location.href='dashboard.html'" 
                        style="background: white; color: #333; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    لوحة التحكم
                </button>
                <button onclick="window.location.href='index.html'" 
                        style="background: rgba(255,255,255,0.2); color: white; border: 1px solid white; padding: 10px 20px; border-radius: 8px; cursor: pointer;">
                    الصفحة الرئيسية
                </button>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; color: white; border: 1px solid white; padding: 10px 20px; border-radius: 8px; cursor: pointer;">
                    إغلاق
                </button>
            </div>
        `;
        
        document.body.appendChild(warning);
        
        // إزالة التحذير تلقائياً بعد 10 ثواني
        setTimeout(() => {
            if (warning.parentElement) {
                warning.remove();
            }
        }, 10000);
    }

    /**
     * مسح سجل إعادة التوجيه
     */
    clearHistory() {
        this.redirectHistory = [];
        console.log('🧹 تم مسح سجل إعادة التوجيه');
    }

    /**
     * الحصول على إحصائيات إعادة التوجيه
     */
    getRedirectStats() {
        return {
            totalRedirects: this.redirectHistory.length,
            recentRedirects: this.redirectHistory.slice(-10),
            protectionActive: this.isProtectionActive
        };
    }
}

// إنشاء مثيل عام من نظام الحماية
window.redirectProtection = new RedirectProtection();

// إعادة تعريف window.redirectToDashboard لتضمين الحماية
const originalRedirectToDashboard = window.redirectToDashboard;
window.redirectToDashboard = async function(userData) {
    try {
        if (!userData) {
            console.warn('⚠️ لا توجد بيانات مستخدم للتوجيه');
            return window.redirectProtection.safeRedirect('dashboard.html', 'لا توجد بيانات مستخدم');
        }

        const targetPage = window.roleBasedRouter?.getDashboardRoute(userData) || 'dashboard.html';
        
        if (!window.roleBasedRouter?.isValidRoute(targetPage)) {
            console.error('❌ مسار غير صحيح:', targetPage);
            return window.redirectProtection.safeRedirect('dashboard.html', 'مسار غير صحيح');
        }

        // تسجيل محاولة التوجيه
        window.roleBasedRouter?.logRedirection(
            window.location.pathname.split('/').pop(),
            targetPage,
            userData
        );

        return window.redirectProtection.safeRedirect(targetPage, `توجيه بناءً على الدور: ${userData.role}`);
        
    } catch (error) {
        console.error('❌ خطأ في التوجيه المحمي:', error);
        return window.redirectProtection.safeRedirect('dashboard.html', 'خطأ في التوجيه');
    }
};

console.log('✅ نظام حماية إعادة التوجيه جاهز');