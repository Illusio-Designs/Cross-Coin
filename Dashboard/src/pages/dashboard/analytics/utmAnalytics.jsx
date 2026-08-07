import { useState, useEffect } from 'react';
import { Pagination, DateRangePicker } from '../../../components/ui';
import { PageHeader, Panel, StatTile, StatGrid, EmptyState } from '../../../components/Dashboard/primitives';

const UTMAnalytics = () => {
  const [utmData, setUtmData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [stats, setStats] = useState({
    totalVisits: 0,
    totalOrders: 0,
    conversionRate: 0,
    totalRevenue: 0
  });

  // Load all data on mount
  useEffect(() => {
    fetchUTMData();
  }, []);

  const fetchUTMData = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
      
      // Build URL with optional date filters
      let analyticsUrl = `${apiUrl}/api/utm/analytics`;
      let trackingUrl = `${apiUrl}/api/utm/all`;
      
      // Only add date filters if both dates are selected
      if (dateRange.startDate && dateRange.endDate) {
        // Validate start date is before end date
        if (new Date(dateRange.startDate) > new Date(dateRange.endDate)) {
          setError('Start date must be before end date');
          setLoading(false);
          return;
        }
        analyticsUrl += `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
        trackingUrl += `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      }
      
      // Fetch UTM analytics
      const analyticsResponse = await fetch(analyticsUrl, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!analyticsResponse.ok) {
        const errorText = await analyticsResponse.text();
        throw new Error('Failed to fetch UTM analytics');
      }

      const analyticsData = await analyticsResponse.json();
      // Fetch all UTM tracking data with order information
      const trackingResponse = await fetch(trackingUrl, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      let trackingData = [];
      if (trackingResponse.ok) {
        const trackingResult = await trackingResponse.json();
        trackingData = trackingResult.data || [];
      } else {
        const errorText = await trackingResponse.text();
        }

      // Process data
      const processedData = processUTMData(analyticsData.data || [], trackingData);
      setUtmData(processedData);
      
      // Calculate stats
      calculateStats(trackingData);
      
      // Reset to page 1 when new data is loaded
      setCurrentPage(1);
      
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processUTMData = (analyticsData, trackingData) => {
    // Group by campaign
    const campaignMap = new Map();

    trackingData.forEach(item => {
      // Include utm_medium in the key — grouping on source+campaign only
      // collapsed rows that differ by medium and showed whichever medium
      // arrived first, corrupting the Medium column and "Orders by Medium".
      const key = `${item.utm_source || 'direct'}_${item.utm_medium || 'none'}_${item.utm_campaign || 'none'}`;
      
      if (!campaignMap.has(key)) {
        campaignMap.set(key, {
          utm_source: item.utm_source || 'direct',
          utm_medium: item.utm_medium || 'none',
          utm_campaign: item.utm_campaign || 'none',
          visits: 0,
          orders: 0,
          revenue: 0
        });
      }

      const campaign = campaignMap.get(key);
      campaign.visits += 1;
      
      if (item.Orders && item.Orders.length > 0) {
        campaign.orders += item.Orders.length;
        campaign.revenue += item.Orders.reduce((sum, order) => sum + parseFloat(order.final_amount || 0), 0);
      }
    });

    return Array.from(campaignMap.values()).map(campaign => ({
      ...campaign,
      conversionRate: campaign.visits > 0 ? ((campaign.orders / campaign.visits) * 100).toFixed(2) : 0
    }));
  };

  const calculateStats = (trackingData) => {
    const totalVisits = trackingData.length;
    let totalOrders = 0;
    let totalRevenue = 0;

    trackingData.forEach(item => {
      if (item.Orders && item.Orders.length > 0) {
        totalOrders += item.Orders.length;
        totalRevenue += item.Orders.reduce((sum, order) => sum + parseFloat(order.final_amount || 0), 0);
      }
    });

    const conversionRate = totalVisits > 0 ? ((totalOrders / totalVisits) * 100).toFixed(2) : 0;

    setStats({
      totalVisits,
      totalOrders,
      conversionRate,
      totalRevenue: totalRevenue.toFixed(2)
    });
  };

  // Date changes are handled by DateRangePicker component
  // User must click Apply to load data

  // Calculate pagination
  const totalPages = Math.ceil(utmData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = utmData.slice(startIndex, endIndex);

  // Add serial numbers
  const currentItemsWithSN = currentItems.map((item, idx) => ({
    ...item,
    serial_number: startIndex + idx + 1
  }));

  // ── Monochrome breakdown aggregates (Revenue by Source / Orders by Medium) ──
  const aggBy = (field, val) => {
    const m = {};
    utmData.forEach(r => { const k = r[field] || '—'; m[k] = (m[k] || 0) + (Number(r[val]) || 0); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };
  const revBySource = aggBy('utm_source', 'revenue');
  const ordByMedium = aggBy('utm_medium', 'orders');
  const revTotal = revBySource.reduce((s, [, v]) => s + v, 0) || 1;
  const ordTotal = ordByMedium.reduce((s, [, v]) => s + v, 0) || 1;
  const maxConv = Math.max(1, ...utmData.map(r => parseFloat(r.conversionRate) || 0));
  const shortMoney = (n) => n >= 1e5 ? `₹${(n / 1e5).toFixed(2)}L` : n >= 1e3 ? `₹${(n / 1e3).toFixed(1)}K` : `₹${Math.round(n)}`;
  const utmChip = { fontFamily: 'var(--ds-font-mono)', fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: 'var(--ds-color-surface-soft)', color: 'var(--ds-color-text-muted)', border: '1px solid var(--ds-color-border)' };
  const panelH = { margin: '0 0 14px', fontSize: 14, fontWeight: 650, color: 'var(--ds-color-text)', letterSpacing: '-0.01em' };
  // grayscale via opacity so it flips correctly in dark mode
  const BarList = ({ rows, total, fmt }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
      {rows.map(([k, v], i) => {
        const pct = (v / total) * 100;
        return (
          <div key={k}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--ds-color-text)', fontWeight: 600 }}>{k}</span>
              <span style={{ color: 'var(--ds-color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>{fmt(v)} · {pct.toFixed(1)}%</span>
            </div>
            <div style={{ height: 8, background: 'var(--ds-color-border-soft)', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 5, background: 'var(--ds-color-text)', opacity: Math.max(0.28, 1 - i * 0.16) }} />
            </div>
          </div>
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="orders-header-container">
          <h1 className="seo-title" style={{ margin: 0 }}>UTM Analytics</h1>
        </div>
        <div className="loading-container">
          <div className="loader"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <PageHeader
        title="UTM Analytics"
        subtitle="Campaign attribution + conversion tracking"
      />

      <Panel style={{ marginBottom: 12 }}>
        <DateRangePicker
          label="Date Range"
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onStartChange={(val) => setDateRange(prev => ({ ...prev, startDate: val }))}
          onEndChange={(val) => setDateRange(prev => ({ ...prev, endDate: val }))}
          onApply={fetchUTMData}
        />
        {error && (
          <div role="alert" style={{ padding: 12, background: 'var(--ds-color-danger-bg)', color: 'var(--ds-color-danger)', borderRadius: 8, marginTop: 12 }}>
            <p style={{ margin: 0 }}>{error}</p>
          </div>
        )}
      </Panel>

      <StatGrid>
        <StatTile label="Total Visits" value={stats.totalVisits} />
        <StatTile label="Total Orders" value={stats.totalOrders} />
        <StatTile label="Conversion Rate" value={`${stats.conversionRate}%`} />
        <StatTile label="Total Revenue" value={`₹${stats.totalRevenue}`} />
      </StatGrid>

      {utmData.length > 0 && (
        <div className="dc-two-col" style={{ marginBottom: 12 }}>
          <Panel>
            <h2 style={panelH}>Revenue by Source</h2>
            <BarList rows={revBySource} total={revTotal} fmt={shortMoney} />
          </Panel>
          <Panel>
            <h2 style={panelH}>Orders by Medium</h2>
            <BarList rows={ordByMedium} total={ordTotal} fmt={(v) => String(v)} />
          </Panel>
        </div>
      )}

      <Panel>
        <h2 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: 'var(--ds-color-text)' }}>Campaign Performance</h2>
        {utmData.length === 0 ? (
          <EmptyState
            title="No UTM data"
            message={`No campaign data available${dateRange.startDate && dateRange.endDate ? ' for the selected date range' : ''}. Try adjusting the dates or verify UTM tracking is firing on the storefront.`}
          />
        ) : (
          <>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table className="utm-table">
              <thead>
                <tr>
                  <th>S/N</th>
                  <th>Source</th>
                  <th>Medium</th>
                  <th>Campaign</th>
                  <th>Visits</th>
                  <th>Orders</th>
                  <th>Conversion Rate</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {currentItemsWithSN.map((row) => (
                  <tr key={row.serial_number}>
                    <td>{row.serial_number}</td>
                    <td><span style={{ ...utmChip, color: 'var(--ds-color-text)' }}>{row.utm_source}</span></td>
                    <td><span style={utmChip}>{row.utm_medium}</span></td>
                    <td style={{ color: 'var(--ds-color-text)', fontWeight: 600 }}>{row.utm_campaign}</td>
                    <td>{row.visits}</td>
                    <td>{row.orders}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: 'var(--ds-color-text)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {row.conversionRate}%
                        <span style={{ width: 44, height: 6, background: 'var(--ds-color-border-soft)', borderRadius: 4, overflow: 'hidden' }}>
                          <span style={{ display: 'block', height: '100%', width: `${Math.min(100, (parseFloat(row.conversionRate) / maxConv) * 100)}%`, background: 'var(--ds-color-text)', borderRadius: 4 }} />
                        </span>
                      </span>
                    </td>
                    <td className="revenue">₹{row.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="seo-pagination-container">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  );
};

export default UTMAnalytics;



