/**
 * نظام إدارة البيانات المحسن
 * Enhanced Data Management System
 */

class DataManager {
    constructor() {
        this.cache = new Map();
        this.observers = new Map();
        this.syncQueue = [];
        this.isOnline = navigator.onLine;
        this.init();
    }

    init() {
        this.setupNetworkListeners();
        this.startSyncWorker();
        this.loadCachedData();
    }

    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processSyncQueue();
            notify.success('اتصال الإنترنت', 'تم استعادة الاتصال بالإنترنت');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            notify.warning('انقطاع الاتصال', 'سيتم حفظ التغييرات محلياً حتى عودة الاتصال');
        });
    }

    startSyncWorker() {
        setInterval(() => {
            if (this.isOnline && this.syncQueue.length > 0) {
                this.processSyncQueue();
            }
        }, 5000);
    }

    loadCachedData() {
        try {
            const cachedData = AppUtils.getFromStorage('data_cache', {});
            Object.entries(cachedData).forEach(([key, value]) => {
                if (this.isValidCache(value)) {
                    this.cache.set(key, value);
                }
            });
        } catch (error) {
            console.error('خطأ في تحميل البيانات المخزنة:', error);
        }
    }

    isValidCache(cacheEntry) {
        if (!cacheEntry || !cacheEntry.timestamp) return false;
        const age = Date.now() - cacheEntry.timestamp;
        const maxAge = APP_CONFIG?.cache?.maxAge || (24 * 60 * 60 * 1000);
        return age < maxAge;
    }

    // جلب البيانات مع التخزين المؤقت
    async fetch(collection, query = {}, options = {}) {
        const cacheKey = this.generateCacheKey(collection, query);
        const cached = this.cache.get(cacheKey);

        // إرجاع البيانات المخزنة إذا كانت صالحة
        if (cached && this.isValidCache(cached) && !options.forceRefresh) {
            this.notifyObservers(cacheKey, cached.data);
            return cached.data;
        }

        try {
            if (!this.isOnline) {
                if (cached) {
                    notify.warning('وضع عدم الاتصال', 'عرض البيانات المحفوظة محلياً');
                    return cached.data;
                }
                throw new Error('لا يوجد اتصال بالإنترنت ولا توجد بيانات محفوظة');
            }

            const data = await this.fetchFromFirestore(collection, query);
            
            // حفظ في التخزين المؤقت
            const cacheEntry = {
                data,
                timestamp: Date.now(),
                collection,
                query
            };
            
            this.cache.set(cacheKey, cacheEntry);
            this.saveCacheToStorage();
            this.notifyObservers(cacheKey, data);
            
            return data;
        } catch (error) {
            console.error('خطأ في جلب البيانات:', error);
            
            // محاولة إرجاع البيانات المخزنة كبديل
            if (cached) {
                notify.warning('خطأ في الشبكة', 'عرض البيانات المحفوظة محلياً');
                return cached.data;
            }
            
            throw error;
        }
    }

    async fetchFromFirestore(collection, query) {
        let ref = firebase.firestore().collection(collection);

        // تطبيق الاستعلامات
        if (query.where) {
            query.where.forEach(([field, operator, value]) => {
                ref = ref.where(field, operator, value);
            });
        }

        if (query.orderBy) {
            query.orderBy.forEach(([field, direction = 'asc']) => {
                ref = ref.orderBy(field, direction);
            });
        }

        if (query.limit) {
            ref = ref.limit(query.limit);
        }

        const snapshot = await ref.get();
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    // حفظ البيانات مع المزامنة
    async save(collection, data, options = {}) {
        const operation = {
            type: 'save',
            collection,
            data: { ...data },
            timestamp: Date.now(),
            id: data.id || this.generateId()
        };

        if (this.isOnline) {
            try {
                const result = await this.saveToFirestore(operation);
                this.invalidateCache(collection);
                this.notifyObservers(`${collection}:saved`, result);
                
                notify.success('تم الحفظ', 'تم حفظ البيانات بنجاح');
                return result;
            } catch (error) {
                console.error('خطأ في حفظ البيانات:', error);
                this.addToSyncQueue(operation);
                notify.error('خطأ في الحفظ', 'سيتم المحاولة مرة أخرى عند عودة الاتصال');
                throw error;
            }
        } else {
            this.addToSyncQueue(operation);
            notify.info('حفظ محلي', 'سيتم رفع البيانات عند عودة الاتصال');
            return { id: operation.id, ...data };
        }
    }

    async saveToFirestore(operation) {
        const { collection, data, id } = operation;
        const ref = firebase.firestore().collection(collection);

        if (id && data.id) {
            await ref.doc(id).set(data, { merge: true });
            return { id, ...data };
        } else {
            const docRef = await ref.add(data);
            return { id: docRef.id, ...data };
        }
    }

    // حذف البيانات
    async delete(collection, id) {
        const operation = {
            type: 'delete',
            collection,
            id,
            timestamp: Date.now()
        };

        if (this.isOnline) {
            try {
                await firebase.firestore().collection(collection).doc(id).delete();
                this.invalidateCache(collection);
                this.notifyObservers(`${collection}:deleted`, { id });
                
                notify.success('تم الحذف', 'تم حذف العنصر بنجاح');
                return true;
            } catch (error) {
                console.error('خطأ في حذف البيانات:', error);
                this.addToSyncQueue(operation);
                notify.error('خطأ في الحذف', 'سيتم المحاولة مرة أخرى عند عودة الاتصال');
                throw error;
            }
        } else {
            this.addToSyncQueue(operation);
            notify.info('حذف محلي', 'سيتم تطبيق التغيير عند عودة الاتصال');
            return true;
        }
    }

    // إضافة للقائمة انتظار المزامنة
    addToSyncQueue(operation) {
        this.syncQueue.push(operation);
        AppUtils.saveToStorage('sync_queue', this.syncQueue);
    }

    // معالجة قائمة انتظار المزامنة
    async processSyncQueue() {
        const queue = [...this.syncQueue];
        this.syncQueue = [];

        for (const operation of queue) {
            try {
                if (operation.type === 'save') {
                    await this.saveToFirestore(operation);
                } else if (operation.type === 'delete') {
                    await firebase.firestore()
                        .collection(operation.collection)
                        .doc(operation.id)
                        .delete();
                }
            } catch (error) {
                console.error('خطأ في مزامنة العملية:', operation, error);
                this.syncQueue.push(operation); // إعادة إضافة للمحاولة مرة أخرى
            }
        }

        if (this.syncQueue.length === 0) {
            AppUtils.removeFromStorage('sync_queue');
            notify.success('تمت المزامنة', 'تم رفع جميع التغييرات المحلية');
        } else {
            AppUtils.saveToStorage('sync_queue', this.syncQueue);
        }
    }

    // مراقبة التغييرات
    subscribe(key, callback) {
        if (!this.observers.has(key)) {
            this.observers.set(key, new Set());
        }
        this.observers.get(key).add(callback);

        // إرجاع دالة إلغاء الاشتراك
        return () => {
            const observers = this.observers.get(key);
            if (observers) {
                observers.delete(callback);
                if (observers.size === 0) {
                    this.observers.delete(key);
                }
            }
        };
    }

    notifyObservers(key, data) {
        const observers = this.observers.get(key);
        if (observers) {
            observers.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('خطأ في إشعار المراقب:', error);
                }
            });
        }
    }

    // إبطال التخزين المؤقت
    invalidateCache(collection) {
        const keysToDelete = [];
        this.cache.forEach((value, key) => {
            if (key.startsWith(collection)) {
                keysToDelete.push(key);
            }
        });
        
        keysToDelete.forEach(key => this.cache.delete(key));
        this.saveCacheToStorage();
    }

    // مفاتيح التخزين المؤقت
    generateCacheKey(collection, query) {
        const queryStr = JSON.stringify(query);
        return `${collection}:${btoa(queryStr)}`;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // حفظ التخزين المؤقت
    saveCacheToStorage() {
        try {
            const cacheObj = {};
            this.cache.forEach((value, key) => {
                cacheObj[key] = value;
            });
            AppUtils.saveToStorage('data_cache', cacheObj);
        } catch (error) {
            console.error('خطأ في حفظ التخزين المؤقت:', error);
        }
    }

    // مسح التخزين المؤقت
    clearCache() {
        this.cache.clear();
        AppUtils.removeFromStorage('data_cache');
        notify.info('تم المسح', 'تم مسح البيانات المخزنة مؤقتاً');
    }

    // إحصائيات التخزين المؤقت
    getCacheStats() {
        const stats = {
            size: this.cache.size,
            syncQueueSize: this.syncQueue.length,
            isOnline: this.isOnline,
            collections: {}
        };

        this.cache.forEach((value, key) => {
            const collection = key.split(':')[0];
            if (!stats.collections[collection]) {
                stats.collections[collection] = 0;
            }
            stats.collections[collection]++;
        });

        return stats;
    }
}

// إنشاء مثيل عام
const dataManager = new DataManager();

// تصدير للاستخدام العام
if (typeof window !== 'undefined') {
    window.DataManager = DataManager;
    window.dataManager = dataManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataManager;
}
