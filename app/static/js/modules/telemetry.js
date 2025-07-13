import { metrics, METRICS } from './metrics.js';
import { eventBus, EVENTS } from './events.js';

/**
 * Telemetry collection and reporting system
 */
class TelemetrySystem {
    constructor() {
        this.sessionId = Math.random().toString(36).substring(7);
        this.startTime = Date.now();
        this.interactions = [];
        this.performanceMarks = new Map();
        this.initialize();
    }

    /**
     * Initialize telemetry system
     */
    initialize() {
        // Track page views
        this.trackPageView();
        window.addEventListener('popstate', () => this.trackPageView());
        
        // Track user interactions
        this.setupInteractionTracking();
        
        // Track performance metrics
        this.setupPerformanceTracking();
        
        // Track errors
        this.setupErrorTracking();
        
        // Track session information
        this.trackSessionInfo();
        
        // Setup periodic reporting
        this.setupPeriodicReporting();
    }

    /**
     * Track page view
     */
    trackPageView() {
        this.recordTelemetry('page_view', {
            url: window.location.href,
            referrer: document.referrer,
            title: document.title
        });
    }

    /**
     * Setup user interaction tracking
     */
    setupInteractionTracking() {
        // Track clicks
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-track]');
            if (target) {
                this.trackInteraction('click', {
                    element: target.dataset.track,
                    text: target.textContent?.trim(),
                    path: this.getElementPath(target)
                });
            }
        });

        // Track form submissions
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (form.dataset.track) {
                this.trackInteraction('form_submit', {
                    form: form.dataset.track,
                    fields: this.getFormFields(form)
                });
            }
        });

        // Track document interactions
        eventBus.subscribe(EVENTS.DOCUMENT_VIEW, (data) => {
            this.trackInteraction('document_view', {
                documentId: data.id,
                documentType: data.type
            });
        });

        // Track scanner interactions
        eventBus.subscribe(EVENTS.SCANNER_CAPTURE, (data) => {
            this.trackInteraction('scanner_capture', {
                result: data.success ? 'success' : 'failure',
                duration: data.duration
            });
        });
    }

    /**
     * Setup performance tracking
     */
    setupPerformanceTracking() {
        // Track page load performance
        window.addEventListener('load', () => {
            if (window.performance) {
                const timing = window.performance.timing;
                const navigationStart = timing.navigationStart;

                this.recordTelemetry('page_load_performance', {
                    dns: timing.domainLookupEnd - timing.domainLookupStart,
                    tcp: timing.connectEnd - timing.connectStart,
                    request: timing.responseStart - timing.requestStart,
                    response: timing.responseEnd - timing.responseStart,
                    dom: timing.domComplete - timing.domLoading,
                    load: timing.loadEventEnd - navigationStart
                });
            }
        });

        // Track resource timing
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
                    this.recordTelemetry('api_performance', {
                        url: entry.name,
                        duration: entry.duration,
                        size: entry.transferSize
                    });
                }
            });
        });

        observer.observe({ entryTypes: ['resource'] });
    }

    /**
     * Setup error tracking
     */
    setupErrorTracking() {
        window.addEventListener('error', (event) => {
            this.recordTelemetry('error', {
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.recordTelemetry('unhandled_promise', {
                message: event.reason?.message,
                stack: event.reason?.stack
            });
        });
    }

    /**
     * Track session information
     */
    trackSessionInfo() {
        this.recordTelemetry('session_start', {
            userAgent: navigator.userAgent,
            language: navigator.language,
            screenSize: `${window.screen.width}x${window.screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            timestamp: this.startTime
        });

        // Track session end
        window.addEventListener('beforeunload', () => {
            this.recordTelemetry('session_end', {
                duration: Date.now() - this.startTime,
                interactions: this.interactions.length
            });
        });
    }

    /**
     * Track user interaction
     */
    trackInteraction(type, data = {}) {
        const interaction = {
            type,
            timestamp: Date.now(),
            data
        };

        this.interactions.push(interaction);
        this.recordTelemetry('interaction', interaction);
    }

    /**
     * Get element path for tracking
     */
    getElementPath(element) {
        const path = [];
        while (element && element !== document.body) {
            let selector = element.tagName.toLowerCase();
            if (element.id) {
                selector += `#${element.id}`;
            } else if (element.className) {
                selector += `.${element.className.split(' ').join('.')}`;
            }
            path.unshift(selector);
            element = element.parentElement;
        }
        return path.join(' > ');
    }

    /**
     * Get form fields for tracking (excluding sensitive data)
     */
    getFormFields(form) {
        const fields = {};
        const elements = form.elements;
        
        for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            if (element.name && !element.name.toLowerCase().includes('password')) {
                fields[element.name] = element.type === 'checkbox' ? 
                    element.checked : element.value.length;
            }
        }
        
        return fields;
    }

    /**
     * Record performance mark
     */
    mark(name) {
        this.performanceMarks.set(name, performance.now());
    }

    /**
     * Measure time between marks
     */
    measure(start, end) {
        const startTime = this.performanceMarks.get(start);
        const endTime = this.performanceMarks.get(end);
        
        if (startTime && endTime) {
            const duration = endTime - startTime;
            this.recordTelemetry('performance_measure', {
                start,
                end,
                duration
            });
            return duration;
        }
        
        return null;
    }

    /**
     * Record telemetry data
     */
    recordTelemetry(type, data) {
        const telemetry = {
            sessionId: this.sessionId,
            type,
            timestamp: Date.now(),
            data
        };

        // Queue for sending
        this.queueTelemetry(telemetry);
    }

    /**
     * Queue telemetry for sending
     */
    queueTelemetry(telemetry) {
        // Store in IndexedDB or localStorage for reliability
        const queue = JSON.parse(localStorage.getItem('telemetry_queue') || '[]');
        queue.push(telemetry);
        localStorage.setItem('telemetry_queue', JSON.stringify(queue));
    }

    /**
     * Setup periodic reporting
     */
    setupPeriodicReporting() {
        setInterval(() => {
            this.sendQueuedTelemetry();
        }, 60000); // Send every minute
    }

    /**
     * Send queued telemetry data
     */
    async sendQueuedTelemetry() {
        const queue = JSON.parse(localStorage.getItem('telemetry_queue') || '[]');
        if (queue.length === 0) return;

        try {
            await fetch('/api/telemetry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(queue)
            });

            // Clear sent items
            localStorage.setItem('telemetry_queue', '[]');
        } catch (error) {
            console.error('Failed to send telemetry:', error);
        }
    }
}

// Export singleton instance
export const telemetry = new TelemetrySystem();
