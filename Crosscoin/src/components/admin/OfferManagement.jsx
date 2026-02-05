import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import offerService from '../../services/offerService';
import './OfferManagement.css';

const OfferManagement = () => {
  const [offers, setOffers] = useState({
    quantityOffers: [],
    valueOffers: [],
    freeShipping: {}
  });
  const [activeTab, setActiveTab] = useState('quantity');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = () => {
    const config = offerService.getOfferConfig();
    setOffers(config);
  };

  const handleToggleOffer = (offerId, type) => {
    const config = offerService.getOfferConfig();
    
    if (type === 'quantity') {
      const offerIndex = config.quantityOffers.findIndex(o => o.id === offerId);
      if (offerIndex !== -1) {
        config.quantityOffers[offerIndex].isActive = !config.quantityOffers[offerIndex].isActive;
      }
    } else if (type === 'value') {
      const offerIndex = config.valueOffers.findIndex(o => o.id === offerId);
      if (offerIndex !== -1) {
        config.valueOffers[offerIndex].isActive = !config.valueOffers[offerIndex].isActive;
      }
    }

    offerService.updateOfferConfig(config);
    loadOffers();
  };

  const handleDeleteOffer = (offerId, type) => {
    if (!confirm('Are you sure you want to delete this offer?')) return;

    const config = offerService.getOfferConfig();
    
    if (type === 'quantity') {
      config.quantityOffers = config.quantityOffers.filter(o => o.id !== offerId);
    } else if (type === 'value') {
      config.valueOffers = config.valueOffers.filter(o => o.id !== offerId);
    }

    offerService.updateOfferConfig(config);
    loadOffers();
  };

  const QuantityOffersTab = () => (
    <div className="offers-tab">
      <div className="tab-header">
        <h3>Quantity-Based Offers</h3>
        <button 
          className="add-offer-btn"
          onClick={() => setShowAddModal(true)}
        >
          <FiPlus /> Add Offer
        </button>
      </div>

      <div className="offers-list">
        {offers.quantityOffers.map(offer => (
          <div key={offer.id} className={`offer-card ${!offer.isActive ? 'inactive' : ''}`}>
            <div className="offer-info">
              <div className="offer-title">{offer.title}</div>
              <div className="offer-details">
                <span>Min Quantity: {offer.minQuantity}</span>
                <span>
                  Discount: {offer.discountType === 'percentage' 
                    ? `${offer.discountValue}%` 
                    : `₹${offer.discountValue}`
                  }
                </span>
                {offer.maxDiscount && (
                  <span>Max Discount: ₹{offer.maxDiscount}</span>
                )}
              </div>
              <div className="offer-description">{offer.description}</div>
            </div>
            
            <div className="offer-actions">
              <button
                className={`toggle-btn ${offer.isActive ? 'active' : ''}`}
                onClick={() => handleToggleOffer(offer.id, 'quantity')}
              >
                {offer.isActive ? <FiToggleRight /> : <FiToggleLeft />}
              </button>
              <button
                className="edit-btn"
                onClick={() => setEditingOffer(offer)}
              >
                <FiEdit />
              </button>
              <button
                className="delete-btn"
                onClick={() => handleDeleteOffer(offer.id, 'quantity')}
              >
                <FiTrash2 />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const ValueOffersTab = () => (
    <div className="offers-tab">
      <div className="tab-header">
        <h3>Value-Based Offers</h3>
        <button 
          className="add-offer-btn"
          onClick={() => setShowAddModal(true)}
        >
          <FiPlus /> Add Offer
        </button>
      </div>

      <div className="offers-list">
        {offers.valueOffers.map(offer => (
          <div key={offer.id} className={`offer-card ${!offer.isActive ? 'inactive' : ''}`}>
            <div className="offer-info">
              <div className="offer-title">{offer.title}</div>
              <div className="offer-details">
                <span>Min Value: ₹{offer.minValue}</span>
                <span>
                  Discount: {offer.discountType === 'percentage' 
                    ? `${offer.discountValue}%` 
                    : `₹${offer.discountValue}`
                  }
                </span>
                {offer.maxDiscount && (
                  <span>Max Discount: ₹{offer.maxDiscount}</span>
                )}
              </div>
              <div className="offer-description">{offer.description}</div>
            </div>
            
            <div className="offer-actions">
              <button
                className={`toggle-btn ${offer.isActive ? 'active' : ''}`}
                onClick={() => handleToggleOffer(offer.id, 'value')}
              >
                {offer.isActive ? <FiToggleRight /> : <FiToggleLeft />}
              </button>
              <button
                className="edit-btn"
                onClick={() => setEditingOffer(offer)}
              >
                <FiEdit />
              </button>
              <button
                className="delete-btn"
                onClick={() => handleDeleteOffer(offer.id, 'value')}
              >
                <FiTrash2 />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const FreeShippingTab = () => (
    <div className="offers-tab">
      <div className="tab-header">
        <h3>Free Shipping Settings</h3>
      </div>

      <div className="free-shipping-settings">
        <div className="setting-group">
          <label>
            <input
              type="checkbox"
              checked={offers.freeShipping.enabled}
              onChange={(e) => {
                const config = offerService.getOfferConfig();
                config.freeShipping.enabled = e.target.checked;
                offerService.updateOfferConfig(config);
                loadOffers();
              }}
            />
            Enable Free Shipping
          </label>
        </div>

        <div className="setting-group">
          <label>Free Shipping Threshold (₹)</label>
          <input
            type="number"
            value={offers.freeShipping.threshold || 999}
            onChange={(e) => {
              const config = offerService.getOfferConfig();
              config.freeShipping.threshold = parseInt(e.target.value);
              offerService.updateOfferConfig(config);
              loadOffers();
            }}
          />
        </div>

        <div className="setting-group">
          <label>Display Message</label>
          <input
            type="text"
            value={offers.freeShipping.description || ''}
            onChange={(e) => {
              const config = offerService.getOfferConfig();
              config.freeShipping.description = e.target.value;
              offerService.updateOfferConfig(config);
              loadOffers();
            }}
            placeholder="Add ₹{remaining} more for free shipping"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="offer-management">
      <div className="offer-management-header">
        <h2>Offer Management</h2>
        <p>Manage quantity-based offers, value-based offers, and free shipping settings</p>
      </div>

      <div className="offer-tabs">
        <button 
          className={`tab-btn ${activeTab === 'quantity' ? 'active' : ''}`}
          onClick={() => setActiveTab('quantity')}
        >
          Quantity Offers
        </button>
        <button 
          className={`tab-btn ${activeTab === 'value' ? 'active' : ''}`}
          onClick={() => setActiveTab('value')}
        >
          Value Offers
        </button>
        <button 
          className={`tab-btn ${activeTab === 'shipping' ? 'active' : ''}`}
          onClick={() => setActiveTab('shipping')}
        >
          Free Shipping
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'quantity' && <QuantityOffersTab />}
        {activeTab === 'value' && <ValueOffersTab />}
        {activeTab === 'shipping' && <FreeShippingTab />}
      </div>
    </div>
  );
};

export default OfferManagement;