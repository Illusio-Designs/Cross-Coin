import React, { useState } from 'react';

const DonutChart = ({ 
    data, 
    title, 
    subtitle, 
    totalValue, 
    totalLabel,
    size = 140,
    strokeWidth = 20,
    showLegend = true,
    colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#84cc16']
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [hoveredSegment, setHoveredSegment] = useState(null);
    // Safety check for data
    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <div className="donut-chart-container">
                <div className="donut-chart-header">
                    <h3 className="donut-chart-title">{title}</h3>
                    {subtitle && <p className="donut-chart-subtitle">{subtitle}</p>}
                </div>
                <div className="donut-chart-content">
                    <p style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                        No data available
                    </p>
                </div>
            </div>
        );
    }

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    // Calculate percentages and cumulative values
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    
    if (total === 0) {
        return (
            <div className="donut-chart-container">
                <div className="donut-chart-header">
                    <h3 className="donut-chart-title">{title}</h3>
                    {subtitle && <p className="donut-chart-subtitle">{subtitle}</p>}
                </div>
                <div className="donut-chart-content">
                    <p style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                        No revenue data available
                    </p>
                </div>
            </div>
        );
    }
    
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
            // Use color from data if available, otherwise use default colors
            color: item.color || colors[index % colors.length]
        };
        
        cumulativePercentage += percentage;
        return segment;
    });

    return (
        <>
            <div className="donut-chart-container" onClick={() => setIsExpanded(true)}>
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
                            
                            {/* Data segments with rounded caps for separation */}
                            {segments.map((segment, index) => (
                                <circle
                                    key={index}
                                    cx={center}
                                    cy={center}
                                    r={radius}
                                    fill="none"
                                    stroke={segment.color}
                                    strokeWidth={strokeWidth - 4}
                                    strokeDasharray={segment.strokeDasharray}
                                    strokeDashoffset={segment.strokeDashoffset}
                                    strokeLinecap="round"
                                    className="donut-segment"
                                    onMouseEnter={() => setHoveredSegment(index)}
                                    onMouseLeave={() => setHoveredSegment(null)}
                                    style={{
                                        transform: 'rotate(-90deg)',
                                        transformOrigin: `${center}px ${center}px`,
                                        transition: 'all 0.3s ease',
                                        opacity: hoveredSegment === null || hoveredSegment === index ? 1 : 0.6,
                                        cursor: 'pointer'
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
                                <div 
                                    key={index} 
                                    className="donut-legend-item"
                                    onMouseEnter={() => setHoveredSegment(index)}
                                    onMouseLeave={() => setHoveredSegment(null)}
                                    style={{
                                        opacity: hoveredSegment === null || hoveredSegment === index ? 1 : 0.5,
                                        cursor: 'pointer'
                                    }}
                                >
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
                <div className="donut-chart-expand-hint">Click to expand</div>
            </div>

            {/* Expanded Modal */}
            {isExpanded && (
                <div className="donut-chart-modal-overlay" onClick={() => setIsExpanded(false)}>
                    <div className="donut-chart-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="donut-chart-modal-close" onClick={() => setIsExpanded(false)}>
                            ×
                        </button>
                        <div className="donut-chart-modal-header">
                            <h2 className="donut-chart-modal-title">{title}</h2>
                            {subtitle && <p className="donut-chart-modal-subtitle">{subtitle}</p>}
                        </div>
                        
                        <div className="donut-chart-modal-content">
                            <div className="donut-chart-modal-chart">
                                <svg width={280} height={280} className="donut-chart-svg">
                                    {/* Background circle */}
                                    <circle
                                        cx={140}
                                        cy={140}
                                        r={120}
                                        fill="none"
                                        stroke="#f3f4f6"
                                        strokeWidth={40}
                                    />
                                    
                                    {/* Data segments */}
                                    {segments.map((segment, index) => {
                                        const modalCircumference = 2 * Math.PI * 120;
                                        const percentage = (segment.value / total) * 100;
                                        let cumulativePercent = 0;
                                        for (let i = 0; i < index; i++) {
                                            cumulativePercent += (segments[i].value / total) * 100;
                                        }
                                        const strokeDasharray = `${(percentage / 100) * modalCircumference} ${modalCircumference}`;
                                        const strokeDashoffset = -((cumulativePercent / 100) * modalCircumference);
                                        
                                        return (
                                            <circle
                                                key={index}
                                                cx={140}
                                                cy={140}
                                                r={120}
                                                fill="none"
                                                stroke={segment.color}
                                                strokeWidth={40}
                                                strokeDasharray={strokeDasharray}
                                                strokeDashoffset={strokeDashoffset}
                                                strokeLinecap="round"
                                                className="donut-segment-modal"
                                                onMouseEnter={() => setHoveredSegment(index)}
                                                onMouseLeave={() => setHoveredSegment(null)}
                                                style={{
                                                    transform: 'rotate(-90deg)',
                                                    transformOrigin: '140px 140px',
                                                    transition: 'all 0.3s ease',
                                                    opacity: hoveredSegment === null || hoveredSegment === index ? 1 : 0.5
                                                }}
                                            />
                                        );
                                    })}
                                </svg>
                                
                                {/* Center content */}
                                <div className="donut-chart-modal-center">
                                    <div className="donut-chart-modal-total-value">{totalValue}</div>
                                    <div className="donut-chart-modal-total-label">{totalLabel}</div>
                                </div>
                            </div>
                            
                            {/* Legend */}
                            <div className="donut-chart-modal-legend">
                                {segments.map((segment, index) => (
                                    <div 
                                        key={index} 
                                        className="donut-modal-legend-item"
                                        onMouseEnter={() => setHoveredSegment(index)}
                                        onMouseLeave={() => setHoveredSegment(null)}
                                        style={{
                                            opacity: hoveredSegment === null || hoveredSegment === index ? 1 : 0.5
                                        }}
                                    >
                                        <div 
                                            className="donut-modal-legend-color" 
                                            style={{ backgroundColor: segment.color }}
                                        ></div>
                                        <div className="donut-modal-legend-content">
                                            <span className="donut-modal-legend-label">{segment.label}</span>
                                            <span className="donut-modal-legend-value">
                                                {segment.value.toLocaleString()} ({segment.percentage}%)
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default DonutChart;