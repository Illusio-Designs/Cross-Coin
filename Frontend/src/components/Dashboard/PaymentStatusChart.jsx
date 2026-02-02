import React from 'react';
import DonutChart from '../common/DonutChart';

const PaymentStatusChart = ({ allOrdersStats }) => {
    // Create chart data from existing stats
    const paymentStatusData = [];
    
    if (allOrdersStats.paid > 0) {
        paymentStatusData.push({
            label: `Paid Orders (${allOrdersStats.paid})`,
            value: allOrdersStats.paid,
            count: allOrdersStats.paid
        });
    }
    
    if (allOrdersStats.pending > 0) {
        paymentStatusData.push({
            label: `Pending Orders (${allOrdersStats.pending})`,
            value: allOrdersStats.pending,
            count: allOrdersStats.pending
        });
    }

    // If no data, show empty state
    if (paymentStatusData.length === 0) {
        paymentStatusData.push({
            label: 'No Payment Data',
            value: 1,
            count: 0
        });
    }

    const paymentStatusColors = ['#10b981', '#f59e0b', '#ef4444'];

    return (
        <DonutChart
            data={paymentStatusData}
            title="Payment Status"
            subtitle="Orders by Payment Status"
            totalValue={(allOrdersStats.total || 0).toLocaleString()}
            totalLabel="Total Orders"
            colors={paymentStatusColors}
            showLegend={true}
        />
    );
};

export default PaymentStatusChart;