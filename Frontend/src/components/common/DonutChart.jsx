import React from 'react';
import '../../styles/common/DonutChart.css';

const DonutChart = ({ 
    data, 
    title, 
    subtitle, 
    totalValue, 
    totalLabel,
    size = 180,
    strokeWidth = 25,
    showLegend = true,
    colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#84cc16']
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    // Calculate percentages and cumulative values
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativePercentage = 0;

    const segments = data.map((item, index) => {
        const percentage = (item.value / total) * 100;
        const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
        const strokeDashoffset = -((cumulativePercentage / 100) * circumference);
        
        const segment = {
            ...item,
            percentage: percentage.toFixed(1),
            strokeDasharray,
            strokeDashoffset,
            color: colors[index % colors.length]
        };
        
        cumulativePercentage += percentage;
        return segment;
    });

    return (
        <div className="donut-chart-container">
            <div className="donut-chart-header">
                <h3 className="donut-chart-title">{title}</h3>
                {subtitle && <p className="donut-chart-subtitle">{subtitle}</p>}
            </div>
            
            <div className="donut-chart-content">
                <div className="donut-chart-wrapper">
                    <svg width={size} height={size} className="donut-chart-svg">
                        {/* Background circle */}
                        <circle
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="none"
                            stroke="#f3f4f6"
                            strokeWidth={strokeWidth}
                        />
                        
                        {/* Data segments */}
                        {segments.map((segment, index) => (
                            <circle
                                key={index}
                                cx={center}
                                cy={center}
                                r={radius}
                                fill="none"
                                stroke={segment.color}
                                strokeWidth={strokeWidth}
                                strokeDasharray={segment.strokeDasharray}
                                strokeDashoffset={segment.strokeDashoffset}
                                strokeLinecap="round"
                                className="donut-segment"
                                style={{
                                    transform: 'rotate(-90deg)',
                                    transformOrigin: `${center}px ${center}px`,
                                    transition: 'all 0.3s ease'
                                }}
                            />
                        ))}
                    </svg>
                    
                    {/* Center content */}
                    <div className="donut-chart-center">
                        <div className="donut-chart-total-value">{totalValue}</div>
                        <div className="donut-chart-total-label">{totalLabel}</div>
                    </div>
                </div>
                
                {/* Legend */}
                {showLegend && (
                    <div className="donut-chart-legend">
                        {segments.map((segment, index) => (
                            <div key={index} className="donut-legend-item">
                                <div 
                                    className="donut-legend-color" 
                                    style={{ backgroundColor: segment.color }}
                                ></div>
                                <div className="donut-legend-content">
                                    <span className="donut-legend-label">{segment.label}</span>
                                    <span className="donut-legend-value">
                                        {segment.value.toLocaleString()} ({segment.percentage}%)
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DonutChart;