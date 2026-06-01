(function () {
    const defaults = {
        AUTH_READY_TIMEOUT_MS: 5000,
        PROFILE_READY_TIMEOUT_MS: 5000,
        POLL_INTERVAL_MS: 100,
        REDIRECT_DELAY_MS: 500,
        TOKEN_CHECK_INTERVAL_MS: 30 * 60 * 1000,
        TOKEN_RETRY_DELAY_MS: 5 * 60 * 1000,
        TOKEN_MAX_RETRIES: 3,
        IDLE_TIMEOUT_MS: 60 * 60 * 1000
    };

    if (!window.sessionConstants) {
        window.sessionConstants = Object.freeze(defaults);
    }
})();
