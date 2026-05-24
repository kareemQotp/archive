/**
 * نظام التحليلات المتقدم للأنشطة
 * Advanced Activity Analytics System
 */

class ActivityAnalytics {
    constructor() {
        this.charts = {};
        this.data = [];
        this.init();
    }

    init() {
        // Initialize Chart.js if available
        if (typeof Chart !== 'undefined') {
            this.initializeCharts();
        } else {
            // Load Chart.js dynamically
            this.loadChartJS().then(() => {
                this.initializeCharts();
            });
        }
    }

    async loadChartJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async init() {
        try {
            // Load Chart.js if not loaded
            if (typeof Chart === 'undefined') {
                await this.loadChartJS();
            }

            // Setup analytics
            this.setupRealTimeUpdates();
            await this.loadAnalytics();
            
        } catch (error) {
            console.error('Error initializing analytics:', error);
        }
    }

    async loadChartJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    setupRealTimeUpdates() {
        // Update analytics every 30 seconds
        this.realTimeInterval = setInterval(() => {
            this.updateRealTimeData();
        }, 30000);

        // Listen for new activities
        window.addEventListener('activityLogged', (event) => {
            this.handleNewActivity(event.detail);
        });
    }

    async loadAnalytics() {
        try {
            const report = await window.activityLogger.getActivityReport({
                startDate: Date.now() - (7 * 24 * 60 * 60 * 1000), // Last 7 days
                limit: 5000
            });

            if (report) {
                this.renderCharts(report);
                this.updateInsights(report);
            }

        } catch (error) {
            console.error('Error loading analytics:', error);
        }
    }

    renderCharts(report) {
        this.renderCategoryChart(report.categories);
        this.renderTimelineChart(report.timeline);
        this.renderUserActivityChart(report.users);
        this.renderPriorityChart(report.criticalEvents, report.totalActivities);
    }

    renderCategoryChart(categories) {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;

        if (this.chartInstances.category) {
            this.chartInstances.category.destroy();
        }

        const labels = Object.keys(categories).map(cat => this.getCategoryLabel(cat));
        const data = Object.values(categories);

        this.chartInstances.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#3b82f6', '#10b981', '#f59e0b', '#6b7280',
                        '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                family: 'Cairo, sans-serif',
                                size: 12
                            },
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    renderTimelineChart(timeline) {
        const ctx = document.getElementById('timelineChart');
        if (!ctx) return;

        if (this.chartInstances.timeline) {
            this.chartInstances.timeline.destroy();
        }

        const sortedDates = Object.keys(timeline).sort();
    const F = window.FormatUtils || {};
    const labels = sortedDates.map(date => F.formatArabicDate ? F.formatArabicDate(date) : new Date(date).toLocaleDateString('ar-SA'));
    const data = sortedDates.map(date => timeline[date]);

        this.chartInstances.timeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'عدد العمليات',
                    data: data,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            font: {
                                family: 'Cairo, sans-serif'
                            }
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                family: 'Cairo, sans-serif'
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            font: {
                                family: 'Cairo, sans-serif'
                            }
                        }
                    }
                }
            }
        });
    }

    renderUserActivityChart(users) {
        const ctx = document.getElementById('userActivityChart');
        if (!ctx) return;

        if (this.chartInstances.userActivity) {
            this.chartInstances.userActivity.destroy();
        }

        // Get top 10 most active users
        const sortedUsers = Object.entries(users)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);

        const labels = sortedUsers.map(([userId]) => userId.substring(0, 8) + '...');
        const data = sortedUsers.map(([,count]) => count);

        this.chartInstances.userActivity = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'عدد العمليات',
                    data: data,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderColor: '#10b981',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            font: {
                                family: 'Cairo, sans-serif'
                            }
                        }
                    },
                    y: {
                        ticks: {
                            font: {
                                family: 'Cairo, sans-serif'
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            font: {
                                family: 'Cairo, sans-serif'
                            }
                        }
                    }
                }
            }
        });
    }

    renderPriorityChart(criticalEvents, totalActivities) {
        const ctx = document.getElementById('priorityChart');
        if (!ctx) return;

        if (this.chartInstances.priority) {
            this.chartInstances.priority.destroy();
        }

        const criticalCount = criticalEvents.length;
        const normalCount = totalActivities - criticalCount;

        this.chartInstances.priority = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['عادي', 'حرج'],
                datasets: [{
                    data: [normalCount, criticalCount],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                family: 'Cairo, sans-serif'
                            }
                        }
                    }
                }
            }
        });
    }

    updateInsights(report) {
        // Update insights cards
    this.updateInsightCard('total-activities-insight', report.totalActivities, 'إجمالي العمليات');
    this.updateInsightCard('active-users-insight', Object.keys(report.users).length, 'المستخدمون النشطون');
    this.updateInsightCard('security-events-insight', report.securityEvents.length, 'الأحداث الأمنية');
    this.updateInsightCard('critical-events-insight', report.criticalEvents.length, 'الأحداث الحرجة');

        // Update trends
        this.updateTrends(report);

        // Update recommendations
        this.updateRecommendations(report);
    }

    updateInsightCard(elementId, value, label) {
        const element = document.getElementById(elementId);
        const F = window.FormatUtils || {};
        if (element) {
            const val = F.formatArabicNumber ? F.formatArabicNumber(value) : (value?.toLocaleString ? value.toLocaleString('ar-SA') : value);
            element.innerHTML = `
                <div class="insight-value">${val}</div>
                <div class="insight-label">${label}</div>
            `;
        }
    }

    updateTrends(report) {
        const trendsContainer = document.getElementById('trends-container');
        if (!trendsContainer) return;

        const timeline = Object.entries(report.timeline).sort();
        const recent = timeline.slice(-2);
        
        if (recent.length >= 2) {
            const [prevDate, prevCount] = recent[0];
            const [currDate, currCount] = recent[1];
            const change = currCount - prevCount;
            const percentage = prevCount > 0 ? ((change / prevCount) * 100).toFixed(1) : 0;

            const trendClass = change >= 0 ? 'trend-up' : 'trend-down';
            const trendIcon = change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
            const trendText = change >= 0 ? 'زيادة' : 'انخفاض';

            trendsContainer.innerHTML = `
                <div class="trend-item ${trendClass}">
                    <i class="fas ${trendIcon}"></i>
                    <span>${trendText} ${Math.abs(percentage)}% في النشاط اليومي</span>
                </div>
            `;
        }
    }

    updateRecommendations(report) {
        const recommendationsContainer = document.getElementById('recommendations-container');
        if (!recommendationsContainer) return;

        const recommendations = [];

        // Check for security concerns
        if (report.securityEvents.length > 0) {
            recommendations.push({
                type: 'warning',
                text: `تم رصد ${report.securityEvents.length} حدث أمني. يُنصح بمراجعة هذه الأحداث.`,
                action: 'مراجعة الأحداث الأمنية'
            });
        }

        // Check for critical events
        if (report.criticalEvents.length > report.totalActivities * 0.1) {
            recommendations.push({
                type: 'danger',
                text: 'نسبة عالية من الأحداث الحرجة. قد تحتاج إلى تحسين النظام.',
                action: 'تحليل الأحداث الحرجة'
            });
        }

        // Check for inactive users
        const inactiveThreshold = 5;
        const activeUsers = Object.values(report.users).filter(count => count > inactiveThreshold).length;
        const totalUsers = Object.keys(report.users).length;
        
        if (totalUsers > 0 && (activeUsers / totalUsers) < 0.7) {
            recommendations.push({
                type: 'info',
                text: 'بعض المستخدمين غير نشطين. قد تحتاج إلى متابعتهم.',
                action: 'مراجعة نشاط المستخدمين'
            });
        }

        // Render recommendations
        recommendationsContainer.innerHTML = recommendations.map(rec => `
            <div class="recommendation-item recommendation-${rec.type}">
                <div class="recommendation-text">${rec.text}</div>
                <button class="btn btn-sm btn-outline-primary recommendation-action">
                    ${rec.action}
                </button>
            </div>
        `).join('');
    }

    async updateRealTimeData() {
        try {
            const newReport = await window.activityLogger.getActivityReport({
                startDate: this.lastUpdateTime,
                limit: 1000
            });

            if (newReport && newReport.totalActivities > 0) {
                // Update existing charts with new data
                await this.loadAnalytics();
                this.lastUpdateTime = Date.now();
            }

        } catch (error) {
            console.error('Error updating real-time data:', error);
        }
    }

    handleNewActivity(activity) {
        // Update real-time indicators
        this.showActivityNotification(activity);
        
        // Update counters
        this.incrementCounter(activity.category);
        
        // Refresh analytics if significant activity
        if (activity.priority === 'critical' || activity.category === 'security') {
            setTimeout(() => this.loadAnalytics(), 2000);
        }
    }

    showActivityNotification(activity) {
        const notification = document.createElement('div');
        notification.className = 'activity-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-bell"></i>
                <span>نشاط جديد: ${this.getCategoryLabel(activity.category)}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    incrementCounter(category) {
        const categoryElement = document.querySelector(`[data-category="${category}"] .stat-number`);
        if (categoryElement) {
            const currentValue = parseInt(categoryElement.textContent) || 0;
            const F = window.FormatUtils || {};
            const newVal = currentValue + 1;
            categoryElement.textContent = F.formatArabicNumber ? F.formatArabicNumber(newVal) : newVal.toLocaleString('ar-SA');
        }
    }

    getCategoryLabel(category) {
        const labels = {
            'authentication': 'المصادقة',
            'file_management': 'إدارة الملفات',
            'user_management': 'إدارة المستخدمين',
            'system': 'النظام',
            'security': 'الأمان',
            'scanner': 'الماسح الضوئي',
            'navigation': 'التنقل'
        };
        return labels[category] || category;
    }

    // Export functionality
    async exportAnalyticsReport() {
        try {
            const report = await window.activityLogger.getActivityReport({
                startDate: Date.now() - (30 * 24 * 60 * 60 * 1000), // Last 30 days
                limit: 10000
            });

            const analyticsData = {
                generatedAt: new Date().toISOString(),
                period: '30 days',
                summary: {
                    totalActivities: report.totalActivities,
                    categoriesBreakdown: report.categories,
                    activeUsers: Object.keys(report.users).length,
                    securityEvents: report.securityEvents.length,
                    criticalEvents: report.criticalEvents.length
                },
                detailedData: report
            };

            this.downloadAnalyticsReport(analyticsData);

        } catch (error) {
            console.error('Error exporting analytics report:', error);
        }
    }

    downloadAnalyticsReport(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    destroy() {
        // Clear intervals
        if (this.realTimeInterval) {
            clearInterval(this.realTimeInterval);
        }

        // Destroy chart instances
        Object.values(this.chartInstances).forEach(chart => {
            if (chart) chart.destroy();
        });
    }
}

// Export for global use
window.ActivityAnalytics = ActivityAnalytics;
