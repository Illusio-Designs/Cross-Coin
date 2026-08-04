import React from 'react';
import DonutChart from '../common/DonutChart';

const PaymentStatusChart = ({ allOrdersStats }) => {
    // Create chart data from all payment statuses in the Order model
    const paymentStatusData = [];
    
    // Add all payment statuses with their counts (from Order model)
    if (allOrdersStats.paymentStatusPaid > 0) {
        paymentStatusData.push({
            label: `Paid (${allOrdersStats.paymentStatusPaid})`,
            value: allOrdersStats.paymentStatusPaid,
            count: allOrdersStats.paymentStatusPaid,
            color: '#10b981'
        });
    }
    
    if (allOrdersStats.paymentStatusPending > 0) {
        paymentStatusData.push({
            label: `Pending (${allOrdersStats.paymentStatusPending})`,
            value: allOrdersStats.paymentStatusPending,
            count: allOrdersStats.paymentStatusPending,
            color: '#f59e0b'
        });
    }
    
    if (allOrdersStats.paymentStatusFailed > 0) {
        paymentStatusData.push({
            label: `Failed (${allOrdersStats.paymentStatusFailed})`,
            value: allOrdersStats.paymentStatusFailed,
            count: allOrdersStats.paymentStatusFailed,
            color: '#ef4444'
        });
    }
    
    if (allOrdersStats.paymentStatusRefunded > 0) {
        paymentStatusData.push({
            label: `Refunded (${allOrdersStats.paymentStatusRefunded})`,
            value: allOrdersStats.paymentStatusRefunded,
            count: allOrdersStats.paymentStatusRefunded,
            color: '#8b5cf6'
        });
    }
    
    if (allOrdersStats.paymentStatusRefundPending > 0) {
        paymentStatusData.push({
            label: `Refund Pending (${allOrdersStats.paymentStatusRefundPending})`,
            value: allOrdersStats.paymentStatusRefundPending,
            count: allOrdersStats.paymentStatusRefundPending,
            color: '#a78bfa'
        });
    }
    
    if (allOrdersStats.paymentStatusCancelled > 0) {
        paymentStatusData.push({
            label: `Cancelled (${allOrdersStats.paymentStatusCancelled})`,
            value: allOrdersStats.paymentStatusCancelled,
            count: allOrdersStats.paymentStatusCancelled,
            color: '#6b7280'
        });
    }

    // If no data, show empty state
    if (paymentStatusData.length === 0) {
        paymentStatusData.push({
            label: 'No Payment Data',
            value: 1,
            count: 0,
            color: '#e5e7eb'
        });
    }

    // Extract colors from data
    const paymentStatusColors = paymentStatusData.map(item => item.color);

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