import React from 'react';
import DonutChart from '../common/DonutChart';

const PaymentChart = ({ allOrdersStats }) => {
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Create chart data from existing stats
    const paymentData = [];
    
    if (allOrdersStats.cod > 0) {
        paymentData.push({
            label: `COD Orders (${allOrdersStats.cod})`,
            value: allOrdersStats.cod,
            count: allOrdersStats.cod
        });
    }
    
    if (allOrdersStats.prepaid > 0) {
        paymentData.push({
            label: `Prepaid Orders (${allOrdersStats.prepaid})`,
            value: allOrdersStats.prepaid,
            count: allOrdersStats.prepaid
        });
    }

    // If no data, show empty state
    if (paymentData.length === 0) {
        paymentData.push({
            label: 'No Orders Yet',
            value: 1,
            count: 0
        });
    }

    const paymentColors = ['#0a0a0a', '#3f3f46', '#6b6b73', '#9a9aa2', '#c4c4cc'];

    return (
        <DonutChart
            data={paymentData}
            title="Payment Analytics"
            subtitle="Orders by Payment Method"
            totalValue={formatCurrency(allOrdersStats.totalRevenue || 0)}
            totalLabel="Total Revenue"
            colors={paymentColors}
            showLegend={true}
        />
    );
};

export default PaymentChart;