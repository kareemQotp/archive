import { eventBus } from './events.js';

// Logging middleware
export function createLoggingMiddleware(options = {}) {
    const { enabled = true, excludeEvents = [] } = options;
    
    return async (event, data) => {
        if (enabled && !excludeEvents.includes(event)) {
            console.log(`[Event] ${event}:`, data);
        }
        return data;
    };
}

// Error handling middleware
export function createErrorHandlingMiddleware() {
    return async (event, data) => {
        try {
            return data;
        } catch (error) {
            console.error(`Error in event ${event}:`, error);
            throw error;
        }
    };
}

// Analytics middleware
export function createAnalyticsMiddleware(options = {}) {
    const { trackableEvents = [] } = options;
    
    return async (event, data) => {
        if (trackableEvents.includes(event)) {
            try {
                await fetch('/api/analytics/event', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        event,
                        data,
                        timestamp: new Date().toISOString()
                    })
                });
            } catch (error) {
                console.error('Analytics tracking failed:', error);
            }
        }
        return data;
    };
}

// Performance monitoring middleware
export function createPerformanceMiddleware() {
    return async (event, data) => {
        const start = performance.now();
        
        try {
            return data;
        } finally {
            const duration = performance.now() - start;
            if (duration > 100) { // Log slow events (> 100ms)
                console.warn(`Slow event handler detected for ${event}: ${duration.toFixed(2)}ms`);
            }
        }
    };
}

// Debounce middleware
export function createDebounceMiddleware(options = {}) {
    const { delay = 300, events = [] } = options;
    const timeouts = new Map();
    
    return async (event, data) => {
        if (events.includes(event)) {
            return new Promise((resolve) => {
                if (timeouts.has(event)) {
                    clearTimeout(timeouts.get(event));
                }
                
                timeouts.set(event, setTimeout(() => {
                    timeouts.delete(event);
                    resolve(data);
                }, delay));
            });
        }
        return data;
    };
}

// Validation middleware
export function createValidationMiddleware(schemas = {}) {
    return async (event, data) => {
        const schema = schemas[event];
        if (schema && typeof schema.validate === 'function') {
            const { error, value } = schema.validate(data);
            if (error) {
                throw new Error(`Validation error for ${event}: ${error.message}`);
            }
            return value;
        }
        return data;
    };
}

// State tracking middleware
export function createStateTrackingMiddleware() {
    const state = new Map();
    
    return async (event, data) => {
        const previousState = state.get(event);
        state.set(event, data);
        
        return {
            ...data,
            _previousState: previousState
        };
    };
}

// Authentication middleware
export function createAuthMiddleware(options = {}) {
    const { protectedEvents = [], redirectUrl = '/auth/login' } = options;
    
    return async (event, data) => {
        if (protectedEvents.includes(event)) {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                sessionStorage.setItem('redirectUrl', window.location.href);
                window.location.href = redirectUrl;
                throw new Error('Authentication required');
            }
        }
        return data;
    };
}

// Caching middleware
export function createCachingMiddleware(options = {}) {
    const { ttl = 5 * 60 * 1000, events = [] } = options; // Default 5 minutes
    const cache = new Map();
    
    const getCacheKey = (event, data) => {
        return `${event}:${JSON.stringify(data)}`;
    };
    
    return async (event, data) => {
        if (events.includes(event)) {
            const key = getCacheKey(event, data);
            const cached = cache.get(key);
            
            if (cached && Date.now() - cached.timestamp < ttl) {
                return cached.data;
            }
            
            cache.set(key, {
                data,
                timestamp: Date.now()
            });
        }
        return data;
    };
}

// Rate limiting middleware
export function createRateLimitMiddleware(options = {}) {
    const { limit = 100, window = 60 * 1000, events = [] } = options; // Default: 100 requests per minute
    const requests = new Map();
    
    const clearOldRequests = (key) => {
        const now = Date.now();
        const times = requests.get(key) || [];
        const validTimes = times.filter(time => now - time < window);
        requests.set(key, validTimes);
        return validTimes;
    };
    
    return async (event, data) => {
        if (events.includes(event)) {
            const times = clearOldRequests(event);
            
            if (times.length >= limit) {
                throw new Error(`Rate limit exceeded for event ${event}`);
            }
            
            times.push(Date.now());
            requests.set(event, times);
        }
        return data;
    };
}

// Retry middleware
export function createRetryMiddleware(options = {}) {
    const { maxRetries = 3, delay = 1000, events = [] } = options;
    
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    return async (event, data) => {
        if (!events.includes(event)) {
            return data;
        }
        
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return data;
            } catch (error) {
                lastError = error;
                if (attempt < maxRetries) {
                    await wait(delay * attempt); // Exponential backoff
                }
            }
        }
        
        throw lastError;
    };
}

// Queue middleware for handling sequential events
export function createQueueMiddleware(options = {}) {
    const { events = [] } = options;
    const queues = new Map();
    
    const getQueue = (event) => {
        if (!queues.has(event)) {
            queues.set(event, Promise.resolve());
        }
        return queues.get(event);
    };
    
    return async (event, data) => {
        if (!events.includes(event)) {
            return data;
        }
        
        const queue = getQueue(event);
        const result = queue.then(() => data);
        queues.set(event, result);
        
        return result;
    };
}

// Metrics middleware
export function createMetricsMiddleware() {
    return async (event, data) => {
        // Track API metrics
        if (event.startsWith('api:')) {
            if (event === 'api:request') {
                metrics.increment(METRICS.API_REQUESTS);
            } else if (event === 'api:error') {
                metrics.increment(METRICS.API_ERRORS);
            } else if (event === 'api:response') {
                metrics.recordHistogram(
                    METRICS.API_RESPONSE_TIME,
                    data.duration
                );
            }
        }
        
        // Track document metrics
        if (event.startsWith('document:')) {
            if (event === 'document:upload:completed') {
                metrics.increment(METRICS.DOCUMENT_UPLOADS);
                metrics.recordHistogram(
                    METRICS.DOCUMENT_SIZE,
                    data.size
                );
            } else if (event === 'document:error') {
                metrics.increment(METRICS.DOCUMENT_ERRORS);
            }
        }
        
        // Track scanner metrics
        if (event.startsWith('scanner:')) {
            if (event === 'scanner:detected') {
                metrics.increment(METRICS.SCANNER_DETECTIONS);
            } else if (event === 'scanner:error') {
                metrics.increment(METRICS.SCANNER_ERRORS);
            }
        }
        
        // Track user actions
        if (event.startsWith('ui:') || event.startsWith('user:')) {
            metrics.increment(METRICS.USER_ACTIONS);
        }
        
        return data;
    };
}

// Update registerDefaultMiddlewares to include metrics middleware
export function registerDefaultMiddlewares() {
    // Add logging middleware
    eventBus.use(createLoggingMiddleware({
        excludeEvents: ['ui:loading', 'ui:loaded'] // Exclude noisy events
    }));
    
    // Add error handling middleware
    eventBus.use(createErrorHandlingMiddleware());
    
    // Add performance monitoring
    eventBus.use(createPerformanceMiddleware());
    
    // Add analytics for specific events
    eventBus.use(createAnalyticsMiddleware({
        trackableEvents: [
            'document:upload:completed',
            'document:deleted',
            'scanner:detected',
            'auth:login',
            'auth:logout'
        ]
    }));
    
    // Add authentication middleware
    eventBus.use(createAuthMiddleware({
        protectedEvents: [
            'document:upload',
            'document:delete',
            'scanner:start'
        ]
    }));
    
    // Add caching for specific events
    eventBus.use(createCachingMiddleware({
        events: ['document:list', 'document:get'],
        ttl: 5 * 60 * 1000 // 5 minutes
    }));
    
    // Add rate limiting for sensitive operations
    eventBus.use(createRateLimitMiddleware({
        events: ['auth:login', 'document:upload'],
        limit: 5,
        window: 60 * 1000 // 1 minute
    }));
    
    // Add retry for network operations
    eventBus.use(createRetryMiddleware({
        events: ['document:upload', 'scanner:detect'],
        maxRetries: 3
    }));
    
    // Add queue for sequential operations
    eventBus.use(createQueueMiddleware({
        events: ['document:upload', 'document:process']
    }));
    
    // Add debounce for specific events
    eventBus.use(createDebounceMiddleware({
        events: ['document:upload:progress'],
        delay: 100
    }));
    
    // Add metrics collection
    eventBus.use(createMetricsMiddleware());
}

// Update middlewares export
export const middlewares = {
    createLoggingMiddleware,
    createErrorHandlingMiddleware,
    createAnalyticsMiddleware,
    createPerformanceMiddleware,
    createDebounceMiddleware,
    createValidationMiddleware,
    createStateTrackingMiddleware,
    createAuthMiddleware,
    createCachingMiddleware,
    createRateLimitMiddleware,
    createRetryMiddleware,
    createQueueMiddleware,
    createMetricsMiddleware
};
