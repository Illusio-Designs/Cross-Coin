import { useState, useEffect } from 'react';
import { FiInfo } from 'react-icons/fi';
import '@/styles/dashboard/brandIndicator.css';

/**
 * Brand Indicator Component
 * Shows which brand the admin is currently managing
 * Displays at the top of admin pages
 */
export default function BrandIndicator() {
    const [brandInfo, setBrandInfo] = useState({
        name: 'CrossCoin',
        slug: 'crosscoin',
        color: '#4CAF50'
    });

    // In a real implementation, you might fetch this from an API or context
    // For now, it's hardcoded to CrossCoin since the header is set in the API client

    return (
        <div className="brand-indicator" style={{ borderLeftColor: brandInfo.color }}>
            <div className="brand-indicator-icon">
                <FiInfo size={20} />
            </div>
            <div className="brand-indicator-content">
                <strong>Managing Brand:</strong> {brandInfo.name}
                <span className="brand-indicator-badge">{brandInfo.slug}</span>
            </div>
            <div className="brand-indicator-note">
                All products, categories, and orders shown are specific to this brand.
            </div>
        </div>
    );
}
