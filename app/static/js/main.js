import { Auth, ServiceWorkerManager, NetworkManager } from './modules/core.js';
import { DocumentManager, FilterManager, UIManager } from './modules/document.js';
import { eventBus, EVENTS } from './modules/events.js';
import { toast, ScrollHelper } from './modules/ui.js';

class App {
    constructor() {
        // Initialize core services
        this.auth = new Auth();
        this.sw = new ServiceWorkerManager();
        this.network = new NetworkManager();

        // Load configuration
        this.config = window.APP_CONFIG || {};
        
        // Initialize managers based on current page
        this.initializeManagers();
        
        // Set up event listeners
        this.setupEventListeners();
    }

    initializeManagers() {
        // Always initialize UI manager
        this.ui = new UIManager();
        
        // Add scroll to top button
        ScrollHelper.createScrollTopButton();
        
        // Initialize document features if on documents page
        if (document.querySelector('.document-grid')) {
            this.documentManager = new DocumentManager();
            this.filterManager = new FilterManager();
        }
    }

    setupEventListeners() {
        // Handle service worker updates
        eventBus.subscribe(EVENTS.SW_UPDATED, () => {
            toast.show({
                type: 'info',
                title: 'تحديث متوفر',
                message: 'يتوفر تحديث جديد للتطبيق. قم بتحديث الصفحة للحصول على أحدث الميزات.',
                duration: 10000
            });
        });

        // Handle network status changes
        eventBus.subscribe(EVENTS.NETWORK_CHANGE, ({ isOnline }) => {
            toast.show({
                type: isOnline ? 'success' : 'warning',
                title: 'حالة الاتصال',
                message: isOnline ? 'تم استعادة الاتصال بالإنترنت' : 'أنت غير متصل بالإنترنت',
                duration: 3000
            });
        });

        // Initialize all tooltips
        document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
            new bootstrap.Tooltip(el);
        });

        // Handle print button clicks
        document.querySelectorAll('.btn-print').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                window.print();
            });
        });
    }

    async start() {
        try {
            // Register service worker
            await this.sw.register();
            
            // Check authentication status
            await this.auth.checkAuth();
            
            // Notify when app is ready
            eventBus.publish(EVENTS.UI_LOADED);
        } catch (error) {
            console.error('Failed to start app:', error);
            eventBus.publish(EVENTS.UI_LOADED);
        }
    }
}

// Start application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.start();
});