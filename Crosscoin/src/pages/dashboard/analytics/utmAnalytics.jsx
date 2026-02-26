import { useState, useEffect } from 'react';
import Pagination from '../../../components/common/Pagination';
import '../../../styles/dashboard/utmAnalytics.css';

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
        console.error('Analytics API Error:', errorText);
        throw new Error('Failed to fetch UTM analytics');
      }

      const analyticsData = await analyticsResponse.json();
      console.log('Analytics Data:', analyticsData);
      
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
        console.log('Tracking Data:', trackingResult);
        trackingData = trackingResult.data || [];
      } else {
        const errorText = await trackingResponse.text();
        console.error('Tracking API Error:', errorText);
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
      console.error('Error fetching UTM data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processUTMData = (analyticsData, trackingData) => {
    // Group by campaign
    const campaignMap = new Map();

    trackingData.forEach(item => {
      const key = `${item.utm_source || 'direct'}_${item.utm_campaign || 'none'}`;
      
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

  const handleDateChange = (e) => {
    setDateRange({
      ...dateRange,
      [e.target.name]: e.target.value
    });
    // Don't fetch data automatically - wait for Apply Filter button
  };

  // Remove the useEffect that resets page on date change
  // User must click Apply Filter to load data

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

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="orders-header-container">
          <h1 className="seo-title" style={{ margin: 0 }}>UTM Analytics</h1>
        </div>
        <div className="loading-container">
          <div className="loader"></div>
          <p>Loading UTM data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Header Section */}
      <div className="orders-header-container">
        {/* Top Row: Title */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          gap: '20px',
          flexWrap: 'wrap'
        }}>
          <h1 className="seo-title" style={{ margin: 0 }}>UTM Analytics</h1>
        </div>

        {/* Date Range Filter */}
        <form 
          className="date-filter"
          onSubmit={(e) => {
            e.preventDefault();
            fetchUTMData();
          }}
        >
          <div className="date-input-group">
            <label>Start Date:</label>
            <input
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
            />
          </div>
          <div className="date-input-group">
            <label>End Date:</label>
            <input
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
            />
          </div>
          <button 
            className="apply-filter-btn"
            type="submit"
          >
            Apply Filter
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="error-container" style={{ 
            padding: '12px', 
            background: '#fee2e2', 
            color: '#dc2626', 
            borderRadius: '8px',
            marginTop: '12px'
          }}>
            <p style={{ margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Stats Cards - Always show */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon visits">📊</div>
            <div className="stat-content">
              <h3>Total Visits</h3>
              <p className="stat-value">{stats.totalVisits}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orders">🛒</div>
            <div className="stat-content">
              <h3>Total Orders</h3>
              <p className="stat-value">{stats.totalOrders}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon conversion">📈</div>
            <div className="stat-content">
              <h3>Conversion Rate</h3>
              <p className="stat-value">{stats.conversionRate}%</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon revenue">💰</div>
            <div className="stat-content">
              <h3>Total Revenue</h3>
              <p className="stat-value">₹{stats.totalRevenue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Performance Table */}
      <div className="utm-table-container">
        <h2>Campaign Performance</h2>
        {utmData.length === 0 ? (
          <div className="no-data">
            <p>No UTM data available{dateRange.startDate && dateRange.endDate ? ' for the selected date range' : ''}.</p>
            <p className="hint">Try adjusting the date range or check if UTM tracking is working correctly.</p>
          </div>
        ) : (
          <>
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
                    <td>
                      <span className="utm-badge source">{row.utm_source}</span>
                    </td>
                    <td>
                      <span className="utm-badge medium">{row.utm_medium}</span>
                    </td>
                    <td>
                      <span className="utm-badge campaign">{row.utm_campaign}</span>
                    </td>
                    <td>{row.visits}</td>
                    <td>{row.orders}</td>
                    <td>
                      <span className={`conversion-badge ${parseFloat(row.conversionRate) > 5 ? 'high' : parseFloat(row.conversionRate) > 2 ? 'medium' : 'low'}`}>
                        {row.conversionRate}%
                      </span>
                    </td>
                    <td className="revenue">₹{row.revenue.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
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
      </div>
    </div>
  );
};

export default UTMAnalytics;
