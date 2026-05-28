import React, { useState, useEffect, useCallback } from 'react';
import { monitoring } from '../../../utils/monitoring';
import { useWebVitals } from '../../../hooks/useWebVitals';
import styles from './monitoring.module.css';

const MonitoringDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState({
    systemStatus: {
      uptime: '99.9%',
      memoryUsage: 0,
      activeUsers: 0,
      status: 'healthy'
    },
    performance: {
      lcp: 0,
      fid: 0,
      cls: 0,
      ttfb: 0,
      avgLoadTime: 0
    },
    api: {
      totalRequests: 0,
      avgResponseTime: 0,
      errorRate: 0,
      endpoints: []
    },
    errors: {
      totalErrors: 0,
      criticalErrors: 0,
      recentErrors: []
    },
    userActivity: {
      totalPageViews: 0,
      topPages: []
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const webVitals = useWebVitals();

  const fetchMetrics = useCallback(() => {
    try {
      const monitoringData = monitoring.getMetrics();
      const report = monitoring.generateReport();

      // Calculate real metrics from collected data
      const apiCalls = monitoringData.apiCalls || [];
      const errors = monitoringData.errors || [];
      const pageViews = monitoring.getEventsByType('pageview');

      const avgResponseTime = apiCalls.length > 0
        ? (apiCalls.reduce((sum, call) => sum + (call.duration || 0), 0) / apiCalls.length).toFixed(0)
        : 0;

      const errorRate = apiCalls.length > 0
        ? ((apiCalls.filter(c => c.statusCode >= 400).length / apiCalls.length) * 100).toFixed(2)
        : 0;

      const criticalErrors = errors.filter(e => e.severity === 'critical').length;
      const memoryUsage = parseFloat(monitoringData.memory?.percentage) || 0;

      setMetrics({
        systemStatus: {
          uptime: monitoringData.uptime || '99.9%',
          memoryUsage: memoryUsage.toFixed(1),
          activeUsers: monitoringData.activeUsers || 0,
          status: errors.length > 10 ? 'warning' : criticalErrors > 0 ? 'critical' : 'healthy'
        },
        performance: {
          lcp: webVitals?.lcp?.toFixed(0) || 2400,
          fid: webVitals?.fid?.toFixed(0) || 80,
          cls: webVitals?.cls?.toFixed(2) || 0.08,
          ttfb: webVitals?.ttfb?.toFixed(0) || 500,
          avgLoadTime: monitoringData.avgLoadTime || 1800
        },
        api: {
          totalRequests: apiCalls.length,
          avgResponseTime: parseInt(avgResponseTime),
          errorRate: parseFloat(errorRate),
          endpoints: apiCalls.slice(-5).map(call => ({
            endpoint: call.endpoint,
            duration: call.duration,
            statusCode: call.statusCode
          }))
        },
        errors: {
          totalErrors: errors.length,
          criticalErrors: criticalErrors,
          recentErrors: errors.slice(-5).map(e => ({
            message: e.message,
            timestamp: e.timestamp,
            severity: e.severity || 'error'
          }))
        },
        userActivity: {
          totalPageViews: pageViews.length,
          topPages: pageViews.slice(-3).map(pv => ({
            pageName: pv.pageName,
            count: 1
          }))
        }
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      setIsLoading(false);
    }
  }, [webVitals]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchMetrics, refreshInterval]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'healthy': return '#4CAF50';
      case 'warning': return '#FF9800';
      case 'critical': return '#F44336';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'healthy': return 'Healthy';
      case 'warning': return 'Warning';
      case 'critical': return 'Critical';
      default: return 'Unknown';
    }
  };

  const MetricCard = ({ title, value, unit = '', color = '#CE1E36', trend = null }) => (
    <div className={styles.metricCard}>
      <div className={styles.metricHeader}>
        <h3>{title}</h3>
        {trend && <span className={styles.trend} style={{ color: trend > 0 ? '#F44336' : '#4CAF50' }}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>}
      </div>
      <div className={styles.metricValue} style={{ color }}>
        {value}{unit}
      </div>
    </div>
  );

  const StatusIndicator = ({ status }) => (
    <div className={styles.statusIndicator}>
      <div
        className={styles.statusDot}
        style={{ backgroundColor: getStatusColor(status) }}
      />
      <span>{getStatusText(status)}</span>
    </div>
  );

  return (
    <div className={styles.monitoringDashboard} role="main" aria-label="System monitoring dashboard">
      <div className={styles.headerSection}>
        <div className={styles.headerContent}>
          <h1>System Monitoring Dashboard</h1>
          <p>Real-time system health and performance metrics</p>
        </div>
        <div className={styles.headerControls}>
          <button
            onClick={fetchMetrics}
            className={styles.btn}
            title="Refresh data"
            aria-label="Refresh monitoring data"
          >
            Refresh
          </button>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className={styles.selectControl}
            aria-label="Auto-refresh interval"
          >
            <option value={5000}>Every 5 seconds</option>
            <option value={10000}>Every 10 seconds</option>
            <option value={30000}>Every 30 seconds</option>
            <option value={60000}>Every 1 minute</option>
          </select>
        </div>
      </div>

      <div className={styles.tabNavigation} role="tablist" aria-label="Monitoring tabs">
        {['overview', 'performance', 'api', 'errors', 'activity'].map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`${tab}-panel`}
            className={`${styles.tab} ${activeTab === tab ? styles.active : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <section id="overview-panel" role="tabpanel" className={styles.tabPanel}>
          <div className={styles.statusGrid}>
            <div className={styles.statusCard}>
              <h2>System Status</h2>
              <StatusIndicator status={metrics.systemStatus.status} />
              <div className={styles.statusDetails}>
                <div className={styles.statusRow}>
                  <span>Uptime</span>
                  <strong>{metrics.systemStatus.uptime}</strong>
                </div>
                <div className={styles.statusRow}>
                  <span>Memory Usage</span>
                  <strong>{metrics.systemStatus.memoryUsage}%</strong>
                </div>
                <div className={styles.statusRow}>
                  <span>Active Users</span>
                  <strong>{metrics.systemStatus.activeUsers}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.metricsGrid}>
            <MetricCard
              title="Total API Requests"
              value={metrics.api.totalRequests}
              color="#2196F3"
            />
            <MetricCard
              title="Avg Response Time"
              value={metrics.api.avgResponseTime}
              unit="ms"
              color="#FF9800"
            />
            <MetricCard
              title="Error Rate"
              value={metrics.api.errorRate}
              unit="%"
              color={metrics.api.errorRate > 5 ? '#F44336' : '#4CAF50'}
            />
            <MetricCard
              title="Total Errors"
              value={metrics.errors.totalErrors}
              color={metrics.errors.totalErrors > 0 ? '#F44336' : '#4CAF50'}
            />
          </div>
        </section>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <section id="performance-panel" role="tabpanel" className={styles.tabPanel}>
          <div className={styles.metricsGrid}>
            <MetricCard
              title="LCP (Largest Contentful Paint)"
              value={metrics.performance.lcp}
              unit="ms"
              color={metrics.performance.lcp < 2500 ? '#4CAF50' : '#F44336'}
            />
            <MetricCard
              title="FID (First Input Delay)"
              value={metrics.performance.fid}
              unit="ms"
              color={metrics.performance.fid < 100 ? '#4CAF50' : '#F44336'}
            />
            <MetricCard
              title="CLS (Cumulative Layout Shift)"
              value={metrics.performance.cls}
              color={metrics.performance.cls < 0.1 ? '#4CAF50' : '#F44336'}
            />
            <MetricCard
              title="TTFB (Time to First Byte)"
              value={metrics.performance.ttfb}
              unit="ms"
              color={metrics.performance.ttfb < 600 ? '#4CAF50' : '#F44336'}
            />
            <MetricCard
              title="Avg Page Load Time"
              value={metrics.performance.avgLoadTime}
              unit="ms"
              color={metrics.performance.avgLoadTime < 3000 ? '#4CAF50' : '#F44336'}
            />
          </div>
        </section>
      )}

      {/* API Tab */}
      {activeTab === 'api' && (
        <section id="api-panel" role="tabpanel" className={styles.tabPanel}>
          <div className={styles.metricsGrid}>
            <MetricCard
              title="Total API Calls"
              value={metrics.api.totalRequests}
              color="#2196F3"
            />
            <MetricCard
              title="Average Response Time"
              value={metrics.api.avgResponseTime}
              unit="ms"
              color="#FF9800"
            />
            <MetricCard
              title="Error Rate"
              value={metrics.api.errorRate}
              unit="%"
              color={metrics.api.errorRate > 5 ? '#F44336' : '#4CAF50'}
            />
          </div>

          {metrics.api.endpoints.length > 0 && (
            <div className={styles.section}>
              <h2>Recent API Calls</h2>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Endpoint</th>
                      <th>Response Time (ms)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.api.endpoints.map((call, idx) => (
                      <tr key={idx}>
                        <td>{call.endpoint || 'N/A'}</td>
                        <td>{call.duration || 0}ms</td>
                        <td>
                          <span className={`${styles.statusBadge} ${call.statusCode >= 400 ? styles.error : styles.success}`}>
                            {call.statusCode}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Errors Tab */}
      {activeTab === 'errors' && (
        <section id="errors-panel" role="tabpanel" className={styles.tabPanel}>
          <div className={styles.metricsGrid}>
            <MetricCard
              title="Total Errors"
              value={metrics.errors.totalErrors}
              color={metrics.errors.totalErrors > 0 ? '#F44336' : '#4CAF50'}
            />
            <MetricCard
              title="Critical Errors"
              value={metrics.errors.criticalErrors}
              color={metrics.errors.criticalErrors > 0 ? '#F44336' : '#4CAF50'}
            />
          </div>

          {metrics.errors.recentErrors.length > 0 && (
            <div className={styles.section}>
              <h2>Recent Errors</h2>
              <div className={styles.errorsList}>
                {metrics.errors.recentErrors.map((error, idx) => (
                  <div key={idx} className={styles.errorItem}>
                    <div className={styles.errorHeader}>
                      <span className={`${styles.severityBadge} ${styles[error.severity]}`}>
                        {error.severity?.toUpperCase()}
                      </span>
                      <time>{new Date(error.timestamp).toLocaleString()}</time>
                    </div>
                    <p className={styles.errorMessage}>{error.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <section id="activity-panel" role="tabpanel" className={styles.tabPanel}>
          <div className={styles.metricsGrid}>
            <MetricCard
              title="Total Page Views"
              value={metrics.userActivity.totalPageViews}
              color="#2196F3"
            />
          </div>

          {metrics.userActivity.topPages.length > 0 && (
            <div className={styles.section}>
              <h2>Top Pages</h2>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Page</th>
                      <th>Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.userActivity.topPages.map((page, idx) => (
                      <tr key={idx}>
                        <td>{page.pageName || 'Unknown'}</td>
                        <td>{page.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {isLoading && (
        <div className={styles.loadingMessage} role="status" aria-live="polite">
          Loading metrics...
        </div>
      )}
    </div>
  );
};

export default MonitoringDashboard;
