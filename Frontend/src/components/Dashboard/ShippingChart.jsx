import React, { useState, useEffect } from 'react';
import DonutChart from '../common/DonutChart';

const ShippingChart = ({ orders = [], allOrdersStats }) => {
    const [shippingData, setShippingData] = useState([]);

    useEffect(() => {
        if (!orders || orders.length === 0) {
            // Show sample data when no orders
            setShippingData([
                { label: 'No Orders Yet', value: 1, status: 'pending' }
            ]);
            return;
        }

        // Calculate shipping statistics from orders
        const stats = {};

        orders.forEach(order => {
            const status = order.status?.toLowerCase();
            if (status) {
                if (!stats[status]) {
                    // Handle all statuses dynamically
                    stats[status] = { 
                        count: 0, 
                        label: status.split(' ').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')
                    };
                }
                stats[status].count++;
            }
        });

        // Create chart data - only include statuses with orders
        const chartData = Object.entries(stats)
            .filter(([_, data]) => data.count > 0)
            .map(([status, data]) => ({
                label: `${data.label} (${data.count})`,
                value: data.count,
                status: status
            }))
            .sort((a, b) => b.value - a.value); // Sort by count descending

        // If no data, show empty state
        if (chartData.length === 0) {
            chartData.push({
                label: 'No Shipping Data',
                value: 1,
                status: 'pending'
            });
        }

        setShippingData(chartData);
    }, [orders]);

    // Define colors for different shipping statuses
    const getStatusColor = (status) => {
        const colorMap = {
            'pending': '#f59e0b',
            'processing': '#6366f1',
            'booked': '#3b82f6',
            'pickup initiated': '#8b5cf6',
            'manifested': '#06b6d4',
            'in transit': '#f97316',
            'shipped': '#ce1e36',
            'out for delivery': '#ef4444',
            'delivered': '#10b981',
            'undelivered': '#dc2626',
            'rto': '#f59e0b',
            'cancelled': '#ef4444',
            'order cancelled': '#ef4444',
            'exception': '#dc2626'
        };
        return colorMap[status] || '#6b7280';
    };

    const shippingColors = shippingData.map(item => getStatusColor(item.status));

    return (
        <DonutChart
            data={shippingData}
            title="Shipping Analytics"
            subtitle="Orders by Delivery Status"
            totalValue={(allOrdersStats?.total || orders.length).toLocaleString()}
            totalLabel="Total Orders"
            colors={shippingColors}
            showLegend={true}
        />
    );
};

export default ShippingChart;