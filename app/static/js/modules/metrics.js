/**
 * Collection of metric types for monitoring
 */
export const METRIC_TYPES = {
    COUNTER: 'counter',
    GAUGE: 'gauge',
    HISTOGRAM: 'histogram',
    SUMMARY: 'summary'
};

/**
 * System-wide metrics
 */
export const METRICS = {
    // Document metrics
    DOCUMENT_UPLOADS: 'document_uploads_total',
    DOCUMENT_PROCESSING_TIME: 'document_processing_time_seconds',
    DOCUMENT_SIZE: 'document_size_bytes',
    DOCUMENT_ERRORS: 'document_errors_total',
    
    // Scanner metrics
    SCANNER_DETECTIONS: 'scanner_detections_total',
    SCANNER_PROCESSING_TIME: 'scanner_processing_time_seconds',
    SCANNER_ERRORS: 'scanner_errors_total',
    
    // API metrics
    API_REQUESTS: 'api_requests_total',
    API_RESPONSE_TIME: 'api_response_time_seconds',
    API_ERRORS: 'api_errors_total',
    
    // Performance metrics 
    JS_MEMORY_USED: 'js_memory_used_bytes',
    DOM_NODES: 'dom_nodes_total',
    EVENT_LOOP_LAG: 'event_loop_lag_seconds',
    
    // User metrics
    ACTIVE_USERS: 'active_users',
    USER_ACTIONS: 'user_actions_total'
};

/**
 * Metrics collection and reporting system
 */
class MetricsCollector {
    constructor() {
        this.metrics = new Map();
        this.initialize();
    }

    /**
     * Initialize metrics collector
     */
    initialize() {
        // Initialize counters
        this.createMetric(METRICS.DOCUMENT_UPLOADS, METRIC_TYPES.COUNTER);
        this.createMetric(METRICS.DOCUMENT_ERRORS, METRIC_TYPES.COUNTER);
        this.createMetric(METRICS.SCANNER_DETECTIONS, METRIC_TYPES.COUNTER);
        this.createMetric(METRICS.SCANNER_ERRORS, METRIC_TYPES.COUNTER);
        this.createMetric(METRICS.API_REQUESTS, METRIC_TYPES.COUNTER);
        this.createMetric(METRICS.API_ERRORS, METRIC_TYPES.COUNTER);
        this.createMetric(METRICS.USER_ACTIONS, METRIC_TYPES.COUNTER);

        // Initialize gauges
        this.createMetric(METRICS.ACTIVE_USERS, METRIC_TYPES.GAUGE);
        this.createMetric(METRICS.JS_MEMORY_USED, METRIC_TYPES.GAUGE);
        this.createMetric(METRICS.DOM_NODES, METRIC_TYPES.GAUGE);

        // Initialize histograms
        this.createMetric(METRICS.DOCUMENT_PROCESSING_TIME, METRIC_TYPES.HISTOGRAM);
        this.createMetric(METRICS.SCANNER_PROCESSING_TIME, METRIC_TYPES.HISTOGRAM);
        this.createMetric(METRICS.API_RESPONSE_TIME, METRIC_TYPES.HISTOGRAM);
        this.createMetric(METRICS.EVENT_LOOP_LAG, METRIC_TYPES.HISTOGRAM);
        
        // Start periodic collection
        this.startPeriodicCollection();
    }

    /**
     * Create a new metric
     */
    createMetric(name, type, options = {}) {
        this.metrics.set(name, {
            type,
            value: type === METRIC_TYPES.COUNTER ? 0 : null,
            timestamp: Date.now(),
            ...options
        });
    }

    /**
     * Increment a counter metric
     */
    increment(name, value = 1, labels = {}) {
        const metric = this.metrics.get(name);
        if (metric?.type === METRIC_TYPES.COUNTER) {
            metric.value += value;
            metric.timestamp = Date.now();
            this.reportMetric(name, metric.value, labels);
        }
    }

    /**
     * Set a gauge metric value
     */
    setGauge(name, value, labels = {}) {
        const metric = this.metrics.get(name);
        if (metric?.type === METRIC_TYPES.GAUGE) {
            metric.value = value;
            metric.timestamp = Date.now();
            this.reportMetric(name, value, labels);
        }
    }

    /**
     * Record a histogram value
     */
    recordHistogram(name, value, labels = {}) {
        const metric = this.metrics.get(name);
        if (metric?.type === METRIC_TYPES.HISTOGRAM) {
            if (!Array.isArray(metric.value)) {
                metric.value = [];
            }
            metric.value.push(value);
            metric.timestamp = Date.now();
            this.reportMetric(name, value, labels);
        }
    }

    /**
     * Start periodic metrics collection
     */
    startPeriodicCollection() {
        setInterval(() => {
            // Collect memory usage
            if (window.performance?.memory) {
                this.setGauge(METRICS.JS_MEMORY_USED, 
                    window.performance.memory.usedJSHeapSize);
            }

            // Count DOM nodes
            this.setGauge(METRICS.DOM_NODES, 
                document.getElementsByTagName('*').length);

            // Measure event loop lag
            const start = Date.now();
            setTimeout(() => {
                const lag = (Date.now() - start) - 0;
                this.recordHistogram(METRICS.EVENT_LOOP_LAG, lag / 1000);
            }, 0);

        }, 60000); // Collect every minute
    }

    /**
     * Report metric to server
     */
    async reportMetric(name, value, labels = {}) {
        try {
            await fetch('/api/metrics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    value,
                    labels,
                    timestamp: Date.now()
                })
            });
        } catch (error) {
            console.error('Failed to report metric:', error);
        }
    }

    /**
     * Get current metrics snapshot
     */
    getMetrics() {
        const snapshot = {};
        for (const [name, metric] of this.metrics) {
            snapshot[name] = {
                type: metric.type,
                value: metric.value,
                timestamp: metric.timestamp
            };
        }
        return snapshot;
    }

    /**
     * Reset all metrics
     */
    resetMetrics() {
        for (const [name, metric] of this.metrics) {
            if (metric.type === METRIC_TYPES.COUNTER) {
                metric.value = 0;
            } else if (metric.type === METRIC_TYPES.HISTOGRAM) {
                metric.value = [];
            } else {
                metric.value = null;
            }
            metric.timestamp = Date.now();
        }
    }
}

// Export singleton instance
export const metrics = new MetricsCollector();
