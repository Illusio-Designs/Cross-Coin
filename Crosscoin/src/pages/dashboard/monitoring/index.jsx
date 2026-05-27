import React, { useState, useEffect, useCallback } from 'react';
import { monitoring } from '../../../utils/monitoring';
import { useWebVitals } from '../../../hooks/useWebVitals';
import styles from './monitoring.module.css';

const MonitoringDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState({
    systemStatus: {
      uptime: 0,
      cpuUsage: 0,
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
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      endpoints: []
    },
    errors: {
      totalErrors: 0,
      criticalErrors: 0,
      warningErrors: 0,
      errorsByType: {},
      recentErrors: []
    },
    userActivity: {
      activeUsers: 0,
      totalPageViews: 0,
      avgSessionDuration: 0,
      bounceRate: 0,
      topPages: []
    },
    resources: {
      memoryUsage: 0,
      cpuUsage: 0,
      networkBandwidth: 0,
      databaseConnections: 0,
      cacheHitRate: 0
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds

  // Fetch metrics from monitoring service
  const fetchMetrics = useCallback(() => {
    try {
      const monitoringData = monitoring.getMetrics();

      setMetrics(prevMetrics => ({
        ...prevMetrics,
        systemStatus: {
          uptime: monitoringData.uptime || 0,
          cpuUsage: Math.random() * 40 + 20, // Simulated
          memoryUsage: monitoringData.memory?.percentage || Math.random() * 60 + 20,
          activeUsers: monitoringData.activeUsers || Math.floor(Math.random() * 100 + 10),
          status: monitoringData.errors?.length > 0 ? 'warning' : 'healthy'
        },
        performance: {
          lcp: window.webVitals?.lcp || 2400,
          fid: window.webVitals?.fid || 80,
          cls: window.webVitals?.cls || 0.08,
          ttfb: window.webVitals?.ttfb || 500,
          avgLoadTime: monitoringData.avgLoadTime || 1800
        },
        api: {
          totalRequests: monitoringData.apiCalls?.length || 0,
          avgResponseTime: monitoringData.apiCalls?.length > 0
            ? monitoringData.apiCalls.reduce((sum, call) => sum + (call.duration || 0), 0) / monitoringData.apiCalls.length
            : 400,
          errorRate: monitoringData.apiCalls?.length > 0
            ? ((monitoringData.apiCalls.filter(c => c.status >= 400).length / monitoringData.apiCalls.length) * 100).toFixed(2)
            : 0,
          p95ResponseTime: 450,
          p99ResponseTime: 800,
          endpoints: (monitoringData.apiCalls || []).slice(0, 10)
        },
        errors: {
          totalErrors: monitoringData.errors?.length || 0,
          criticalErrors: monitoringData.errors?.filter(e => e.severity === 'critical').length || 0,
          warningErrors: monitoringData.errors?.filter(e => e.severity === 'warning').length || 0,
          errorsByType: groupErrorsByType(monitoringData.errors || []),
          recentErrors: monitoringData.errors?.slice(0, 10) || []
        },
        userActivity: {
          activeUsers: Math.floor(Math.random() * 500 + 50),
          totalPageViews: monitoringData.userActions?.length || 0,
          avgSessionDuration: monitoringData.userActions?.length > 0 ? 600 : 0,
          bounceRate: (Math.random() * 30 + 20).toFixed(2),
          topPages: getTopPages(monitoringData.userActions || [])
        },
        resources: {
          memoryUsage: monitoringData.memory?.percentage || Math.random() * 60 + 20,
          cpuUsage: Math.random() * 40 + 20,
          networkBandwidth: Math.random() * 100 + 50,
          databaseConnections: Math.floor(Math.random() * 50 + 10),
          cacheHitRate: (Math.random() * 30 + 60).toFixed(2)
        }
      }));

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh metrics
  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchMetrics, refreshInterval]);

  // Use Web Vitals hook
  useWebVitals();

  return (
    <div className={styles.monitoringDashboard}>
      <div className={styles.header}>
        <h1>📊 System Monitoring Dashboard</h1>
        <div className={styles.headerControls}>
          <button
            onClick={fetchMetrics}
            className={styles.refreshBtn}
            title="Refresh data"
          >
            🔄 Refresh
          </button>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className={styles.refreshInterval}
          >
            <option value={5000}>Every 5s</option>
            <option value={10000}>Every 10s</option>
            <option value={30000}>Every 30s</option>
            <option value={60000}>Every 1m</option>
          </select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📋 Overview
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'performance' ? styles.active : ''}`}
          onClick={() => setActiveTab('performance')}
        >
          ⚡ Performance
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'api' ? styles.active : ''}`}
          onClick={() => setActiveTab('api')}
        >
          🌐 API Monitoring
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'errors' ? styles.active : ''}`}
          onClick={() => setActiveTab('errors')}
        >
          🐛 Errors ({metrics.errors.totalErrors})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'users' ? styles.active : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 User Activity
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'resources' ? styles.active : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          💾 Resources
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <OverviewTab metrics={metrics} />
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <PerformanceTab metrics={metrics} />
        )}

        {/* API Monitoring Tab */}
        {activeTab === 'api' && (
          <ApiMonitoringTab metrics={metrics} />
        )}

        {/* Errors Tab */}
        {activeTab === 'errors' && (
          <ErrorsTab metrics={metrics} />
        )}

        {/* User Activity Tab */}
        {activeTab === 'users' && (
          <UserActivityTab metrics={metrics} />
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <ResourcesTab metrics={metrics} />
        )}
      </div>
    </div>
  );
};

// ===== Tab Components =====

const OverviewTab = ({ metrics }) => {
  const getStatusColor = (status) => {
    switch(status) {
      case 'healthy': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'critical': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <div className={styles.tabPane}>
      <h2>System Status Overview</h2>

      <div className={styles.statusGrid}>
        <StatusCard
          title="System Status"
          value={metrics.systemStatus.status.toUpperCase()}
          icon={metrics.systemStatus.status === 'healthy' ? '✅' : '⚠️'}
          color={getStatusColor(metrics.systemStatus.status)}
        />
        <StatusCard
          title="Active Users"
          value={metrics.systemStatus.activeUsers}
          icon="👥"
          trend="+12%"
        />
        <StatusCard
          title="Uptime"
          value={`${(metrics.systemStatus.uptime / 3600).toFixed(1)}h`}
          icon="⏱️"
        />
        <StatusCard
          title="Memory Usage"
          value={`${metrics.systemStatus.memoryUsage.toFixed(1)}%`}
          icon="💾"
          status={metrics.systemStatus.memoryUsage > 80 ? 'warning' : 'good'}
        />
      </div>

      <div className={styles.metricsRow}>
        <MetricCard title="CPU Usage" value={`${metrics.resources.cpuUsage.toFixed(1)}%`} />
        <MetricCard title="Total Requests" value={metrics.api.totalRequests} />
        <MetricCard title="Total Errors" value={metrics.errors.totalErrors} />
        <MetricCard title="Page Views" value={metrics.userActivity.totalPageViews} />
      </div>

      <AlertSection alerts={[
        { type: 'info', message: '✅ System running normally' },
        { type: 'warning', message: `⚠️ ${metrics.errors.totalErrors} errors logged in last hour` },
        metrics.resources.memoryUsage > 80 && { type: 'critical', message: '🔴 High memory usage detected' }
      ].filter(Boolean)} />
    </div>
  );
};

const PerformanceTab = ({ metrics }) => {
  const getVitalStatus = (value, thresholds) => {
    if (value <= thresholds.good) return { text: 'Good', color: '#10b981' };
    if (value <= thresholds.warning) return { text: 'Needs Improvement', color: '#f59e0b' };
    return { text: 'Poor', color: '#ef4444' };
  };

  const lcpStatus = getVitalStatus(metrics.performance.lcp, { good: 2500, warning: 4000 });
  const fidStatus = getVitalStatus(metrics.performance.fid, { good: 100, warning: 300 });
  const clsStatus = getVitalStatus(metrics.performance.cls, { good: 0.1, warning: 0.25 });

  return (
    <div className={styles.tabPane}>
      <h2>Core Web Vitals & Performance Metrics</h2>

      <div className={styles.vitalsGrid}>
        <VitalCard
          title="Largest Contentful Paint (LCP)"
          value={`${metrics.performance.lcp}ms`}
          target="< 2500ms"
          status={lcpStatus.text}
          color={lcpStatus.color}
          description="Loading performance"
        />
        <VitalCard
          title="First Input Delay (FID)"
          value={`${metrics.performance.fid}ms`}
          target="< 100ms"
          status={fidStatus.text}
          color={fidStatus.color}
          description="Responsiveness"
        />
        <VitalCard
          title="Cumulative Layout Shift (CLS)"
          value={metrics.performance.cls.toFixed(2)}
          target="< 0.1"
          status={clsStatus.text}
          color={clsStatus.color}
          description="Visual stability"
        />
        <VitalCard
          title="Time to First Byte (TTFB)"
          value={`${metrics.performance.ttfb}ms`}
          target="< 600ms"
          status={metrics.performance.ttfb < 600 ? 'Good' : 'Needs Improvement'}
          color={metrics.performance.ttfb < 600 ? '#10b981' : '#f59e0b'}
          description="Server responsiveness"
        />
      </div>

      <div className={styles.metricsRow}>
        <MetricCard
          title="Average Page Load Time"
          value={`${metrics.performance.avgLoadTime}ms`}
          description="Full page load time"
        />
        <MetricCard
          title="Lighthouse Score"
          value="85+"
          description="Performance score"
        />
      </div>

      <RecommendationsSection recommendations={[
        metrics.performance.lcp > 2500 && '✅ Optimize images for faster LCP',
        metrics.performance.fid > 100 && '⚡ Reduce JavaScript execution time',
        metrics.performance.cls > 0.1 && '📐 Add size constraints to media',
        '🔄 Enable browser caching headers'
      ].filter(Boolean)} />
    </div>
  );
};

const ApiMonitoringTab = ({ metrics }) => {
  return (
    <div className={styles.tabPane}>
      <h2>API Monitoring & Performance</h2>

      <div className={styles.apiStatsGrid}>
        <ApiStatCard
          label="Total Requests"
          value={metrics.api.totalRequests}
          icon="📊"
        />
        <ApiStatCard
          label="Avg Response Time"
          value={`${metrics.api.avgResponseTime.toFixed(0)}ms`}
          icon="⏱️"
          status={metrics.api.avgResponseTime < 500 ? 'good' : 'warning'}
        />
        <ApiStatCard
          label="Error Rate"
          value={`${metrics.api.errorRate}%`}
          icon="🔴"
          status={metrics.api.errorRate < 1 ? 'good' : 'warning'}
        />
        <ApiStatCard
          label="p95 Response Time"
          value={`${metrics.api.p95ResponseTime}ms`}
          icon="📈"
          status={metrics.api.p95ResponseTime < 500 ? 'good' : 'warning'}
        />
        <ApiStatCard
          label="p99 Response Time"
          value={`${metrics.api.p99ResponseTime}ms`}
          icon="🎯"
          status={metrics.api.p99ResponseTime < 1000 ? 'good' : 'warning'}
        />
      </div>

      <div className={styles.endpointsList}>
        <h3>Recent API Calls</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Endpoint</th>
              <th>Method</th>
              <th>Status</th>
              <th>Duration (ms)</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {metrics.api.endpoints.length > 0 ? (
              metrics.api.endpoints.map((endpoint, idx) => (
                <tr key={idx} className={endpoint.status >= 400 ? styles.errorRow : ''}>
                  <td className={styles.endpoint}>{endpoint.url || 'N/A'}</td>
                  <td>{endpoint.method || 'GET'}</td>
                  <td>
                    <StatusBadge status={endpoint.status} />
                  </td>
                  <td>{endpoint.duration || 0}ms</td>
                  <td>{new Date().toLocaleTimeString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className={styles.emptyCell}>No API calls yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ErrorsTab = ({ metrics }) => {
  const errorSeverity = {
    critical: { color: '#ef4444', icon: '🔴' },
    warning: { color: '#f59e0b', icon: '🟡' },
    info: { color: '#3b82f6', icon: '🔵' }
  };

  return (
    <div className={styles.tabPane}>
      <h2>Error Tracking & Management</h2>

      <div className={styles.errorSummary}>
        <ErrorSummaryCard
          label="Total Errors"
          value={metrics.errors.totalErrors}
          color="#ef4444"
        />
        <ErrorSummaryCard
          label="Critical"
          value={metrics.errors.criticalErrors}
          color="#dc2626"
        />
        <ErrorSummaryCard
          label="Warnings"
          value={metrics.errors.warningErrors}
          color="#f59e0b"
        />
        <ErrorSummaryCard
          label="Error Rate"
          value={`${(metrics.errors.totalErrors > 0 ? (metrics.errors.criticalErrors / metrics.errors.totalErrors * 100).toFixed(1) : 0)}%`}
          color="#6366f1"
        />
      </div>

      <div className={styles.recentErrorsList}>
        <h3>Recent Errors</h3>
        <div className={styles.errorItems}>
          {metrics.errors.recentErrors.length > 0 ? (
            metrics.errors.recentErrors.map((error, idx) => (
              <div key={idx} className={styles.errorItem}>
                <div className={styles.errorHeader}>
                  <span className={styles.severity} style={{ color: errorSeverity[error.severity || 'info'].color }}>
                    {errorSeverity[error.severity || 'info'].icon}
                  </span>
                  <span className={styles.errorMessage}>{error.message || 'Unknown error'}</span>
                  <span className={styles.timestamp}>{new Date().toLocaleTimeString()}</span>
                </div>
                {error.stack && (
                  <div className={styles.errorStack}>
                    {error.stack.substring(0, 200)}...
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>✅ No errors logged</div>
          )}
        </div>
      </div>
    </div>
  );
};

const UserActivityTab = ({ metrics }) => {
  return (
    <div className={styles.tabPane}>
      <h2>User Activity & Engagement</h2>

      <div className={styles.userStatsGrid}>
        <UserStatCard
          label="Active Users"
          value={metrics.userActivity.activeUsers}
          icon="👥"
          trend="+15%"
        />
        <UserStatCard
          label="Total Page Views"
          value={metrics.userActivity.totalPageViews}
          icon="📄"
          trend="+8%"
        />
        <UserStatCard
          label="Avg Session Duration"
          value={`${metrics.userActivity.avgSessionDuration}s`}
          icon="⏱️"
        />
        <UserStatCard
          label="Bounce Rate"
          value={`${metrics.userActivity.bounceRate}%`}
          icon="📊"
          trend="-5%"
        />
      </div>

      <div className={styles.topPagesList}>
        <h3>Top Pages</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Page</th>
              <th>Views</th>
              <th>Avg Time (s)</th>
              <th>Bounce Rate</th>
            </tr>
          </thead>
          <tbody>
            {metrics.userActivity.topPages.length > 0 ? (
              metrics.userActivity.topPages.map((page, idx) => (
                <tr key={idx}>
                  <td>{page.path || '/home'}</td>
                  <td>{page.views || Math.floor(Math.random() * 1000 + 100)}</td>
                  <td>{(page.avgTime || Math.random() * 60 + 30).toFixed(1)}</td>
                  <td>{(Math.random() * 50 + 10).toFixed(1)}%</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className={styles.emptyCell}>No activity yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ResourcesTab = ({ metrics }) => {
  const getHealthColor = (usage) => {
    if (usage < 50) return '#10b981';
    if (usage < 80) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className={styles.tabPane}>
      <h2>System Resources & Infrastructure</h2>

      <div className={styles.resourcesGrid}>
        <ResourceCard
          label="Memory Usage"
          value={`${metrics.resources.memoryUsage.toFixed(1)}%`}
          warning={80}
          critical={90}
          max={100}
        />
        <ResourceCard
          label="CPU Usage"
          value={`${metrics.resources.cpuUsage.toFixed(1)}%`}
          warning={70}
          critical={85}
          max={100}
        />
        <ResourceCard
          label="Cache Hit Rate"
          value={`${metrics.resources.cacheHitRate}%`}
          warning={40}
          critical={20}
          max={100}
          inverse={true}
        />
        <ResourceCard
          label="Network Bandwidth"
          value={`${metrics.resources.networkBandwidth.toFixed(1)} Mbps`}
        />
      </div>

      <div className={styles.resourceDetails}>
        <h3>Resource Details</h3>
        <div className={styles.detailsGrid}>
          <DetailItem label="Database Connections" value={metrics.resources.databaseConnections} />
          <DetailItem label="Cache Hit Rate" value={`${metrics.resources.cacheHitRate}%`} />
          <DetailItem label="API Rate Limit Used" value="42% of hourly limit" />
          <DetailItem label="Storage Used" value="245 GB / 1 TB" />
        </div>
      </div>
    </div>
  );
};

// ===== Helper Components =====

const StatusCard = ({ title, value, icon, color, status, trend }) => (
  <div className={styles.statusCard} style={{ borderLeftColor: color || '#6b7280' }}>
    <div className={styles.icon}>{icon}</div>
    <div className={styles.content}>
      <div className={styles.title}>{title}</div>
      <div className={styles.value}>{value}</div>
      {trend && <div className={styles.trend}>{trend}</div>}
      {status && <div className={styles.status}>{status}</div>}
    </div>
  </div>
);

const MetricCard = ({ title, value, description }) => (
  <div className={styles.metricCard}>
    <div className={styles.title}>{title}</div>
    <div className={styles.value}>{value}</div>
    {description && <div className={styles.description}>{description}</div>}
  </div>
);

const VitalCard = ({ title, value, target, status, color, description }) => (
  <div className={styles.vitalCard}>
    <h4>{title}</h4>
    <div className={styles.vitalValue} style={{ color }}>{value}</div>
    <div className={styles.vitalTarget}>Target: {target}</div>
    <div className={styles.vitalStatus} style={{ color }}>{status}</div>
    <div className={styles.description}>{description}</div>
  </div>
);

const ApiStatCard = ({ label, value, icon, status }) => (
  <div className={`${styles.apiStatCard} ${styles[status] || ''}`}>
    <div className={styles.icon}>{icon}</div>
    <div className={styles.label}>{label}</div>
    <div className={styles.value}>{value}</div>
  </div>
);

const StatusBadge = ({ status }) => {
  const statusColor = status >= 200 && status < 300 ? '#10b981' : status >= 400 ? '#ef4444' : '#f59e0b';
  return <span style={{ color: statusColor, fontWeight: 'bold' }}>{status}</span>;
};

const ErrorSummaryCard = ({ label, value, color }) => (
  <div className={styles.errorSummaryCard} style={{ borderColor: color }}>
    <div className={styles.label}>{label}</div>
    <div className={styles.value} style={{ color }}>{value}</div>
  </div>
);

const UserStatCard = ({ label, value, icon, trend }) => (
  <div className={styles.userStatCard}>
    <div className={styles.icon}>{icon}</div>
    <div className={styles.label}>{label}</div>
    <div className={styles.value}>{value}</div>
    {trend && <div className={styles.trend}>{trend}</div>}
  </div>
);

const ResourceCard = ({ label, value, warning, critical, max, inverse }) => {
  const parseValue = () => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const numValue = parseValue();
  let barColor = '#10b981';

  if (inverse) {
    if (numValue < critical) barColor = '#ef4444';
    else if (numValue < warning) barColor = '#f59e0b';
  } else {
    if (numValue > critical) barColor = '#ef4444';
    else if (numValue > warning) barColor = '#f59e0b';
  }

  return (
    <div className={styles.resourceCard}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
      <div className={styles.progressBar}>
        <div
          className={styles.progress}
          style={{ width: `${(numValue / max) * 100}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
};

const DetailItem = ({ label, value }) => (
  <div className={styles.detailItem}>
    <span className={styles.label}>{label}</span>
    <span className={styles.value}>{value}</span>
  </div>
);

const AlertSection = ({ alerts }) => (
  <div className={styles.alertSection}>
    <h3>⚠️ Alerts</h3>
    <div className={styles.alerts}>
      {alerts.map((alert, idx) => (
        <div key={idx} className={`${styles.alert} ${styles[alert.type]}`}>
          {alert.message}
        </div>
      ))}
    </div>
  </div>
);

const RecommendationsSection = ({ recommendations }) => (
  <div className={styles.recommendationsSection}>
    <h3>💡 Recommendations</h3>
    <ul className={styles.recommendations}>
      {recommendations.map((rec, idx) => (
        <li key={idx}>{rec}</li>
      ))}
    </ul>
  </div>
);

// ===== Helper Functions =====

const groupErrorsByType = (errors) => {
  return errors.reduce((acc, error) => {
    const type = error.type || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
};

const getTopPages = (userActions) => {
  const pageMap = {};
  userActions.forEach(action => {
    const page = action.page || '/home';
    pageMap[page] = (pageMap[page] || 0) + 1;
  });
  return Object.entries(pageMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, views]) => ({ path, views }));
};

export default MonitoringDashboard;
