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
            color: '#0a0a0a'
        });
    }
    
    if (allOrdersStats.paymentStatusPending > 0) {
        paymentStatusData.push({
            label: `Pending (${allOrdersStats.paymentStatusPending})`,
            value: allOrdersStats.paymentStatusPending,
            count: allOrdersStats.paymentStatusPending,
            color: '#6b6b73'
        });
    }
    
    if (allOrdersStats.paymentStatusFailed > 0) {
        paymentStatusData.push({
            label: `Failed (${allOrdersStats.paymentStatusFailed})`,
            value: allOrdersStats.paymentStatusFailed,
            count: allOrdersStats.paymentStatusFailed,
            color: '#3f3f46'
        });
    }
    
    if (allOrdersStats.paymentStatusRefunded > 0) {
        paymentStatusData.push({
            label: `Refunded (${allOrdersStats.paymentStatusRefunded})`,
            value: allOrdersStats.paymentStatusRefunded,
            count: allOrdersStats.paymentStatusRefunded,
            color: '#9a9aa2'
        });
    }
    
    if (allOrdersStats.paymentStatusRefundPending > 0) {
        paymentStatusData.push({
            label: `Refund Pending (${allOrdersStats.paymentStatusRefundPending})`,
            value: allOrdersStats.paymentStatusRefundPending,
            count: allOrdersStats.paymentStatusRefundPending,
            color: '#c4c4cc'
        });
    }
    
    if (allOrdersStats.paymentStatusCancelled > 0) {
        paymentStatusData.push({
            label: `Cancelled (${allOrdersStats.paymentStatusCancelled})`,
            value: allOrdersStats.paymentStatusCancelled,
            count: allOrdersStats.paymentStatusCancelled,
            color: '#e0e0e3'
        });
    }

    // If no data, show empty state
    if (paymentStatusData.length === 0) {
        paymentStatusData.push({
            label: 'No Payment Data',
            value: 1,
            count: 0,
            color: '#e0e0e3'
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