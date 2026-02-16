# UTM Tracking Implementation Guide

## Overview
This document outlines the implementation of UTM parameter tracking for the Crosscoin application. The system will capture incoming UTM parameters from users, store them in the database, and associate them with user sessions and conversions.

## What are UTM Parameters?

UTM (Urchin Tracking Module) parameters are tags added to URLs to track the effectiveness of marketing campaigns. They help identify where traffic is coming from.

### Standard UTM Parameters:
- `utm_source`: Identifies the source (e.g., google, facebook, newsletter)
- `utm_medium`: Identifies the medium (e.g., cpc, email, social)
- `utm_campaign`: Identifies the campaign name (e.g., spring_sale, product_launch)
- `utm_term`: Identifies paid search keywords (optional)
- `utm_content`: Differentiates similar content or links (optional)

### Example URL:
```
https://crosscoin.com/?utm_source=facebook&utm_medium=social&utm_campaign=spring_sale&utm_content=ad_variant_a
```

---

## System Architecture

### Frontend (Crosscoin React App)
1. **UTM Capture Service**: Extracts UTM parameters from URL on page load
2. **Local Storage**: Stores UTM data in browser for session persistence
3. **API Integration**: Sends UTM data to backend when user performs actions

### Backend (Node.js/Express)
1. **UTM Model**: Database schema for storing UTM data
2. **UTM Controller**: Handles UTM data storage and retrieval
3. **UTM Routes**: API endpoints for UTM operations
4. **Association Logic**: Links UTM data with users, orders, and registrations

---

## Database Schema

### UTM Tracking Table
```sql
CREATE TABLE utm_tracking (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,
  guest_user_id INT NULL,
  session_id VARCHAR(255),
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_term VARCHAR(255) NULL,
  utm_content VARCHAR(255) NULL,
  landing_page VARCHAR(500),
  referrer VARCHAR(500),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (guest_user_id) REFERENCES guest_users(id)
);
```

### User Association
- Link UTM data to `users` table via `user_id`
- Link UTM data to `guest_users` table via `guest_user_id`
- Track conversions by adding `utm_tracking_id` to `orders` table

---

## Frontend Implementation

### 1. UTM Capture Utility (`src/utils/utmTracker.js`)

```javascript
// Capture UTM parameters from URL
export const captureUTMParameters = () => {
  const urlParams = new URLSearchParams(window.location.search);
  
  const utmData = {
    utm_source: urlParams.get('utm_source'),
    utm_medium: urlParams.get('utm_medium'),
    utm_campaign: urlParams.get('utm_campaign'),
    utm_term: urlParams.get('utm_term'),
    utm_content: urlParams.get('utm_content'),
    landing_page: window.location.href,
    referrer: document.referrer,
    timestamp: new Date().toISOString()
  };

  // Only store if at least one UTM parameter exists
  if (Object.values(utmData).some(val => val !== null)) {
    localStorage.setItem('utm_data', JSON.stringify(utmData));
    return utmData;
  }
  
  return null;
};

// Retrieve stored UTM data
export const getStoredUTMData = () => {
  const stored = localStorage.getItem('utm_data');
  return stored ? JSON.parse(stored) : null;
};

// Clear UTM data (after conversion)
export const clearUTMData = () => {
  localStorage.removeItem('utm_data');
};

// Send UTM data to backend
export const sendUTMToBackend = async (utmData) => {
  try {
    const response = await fetch('/api/utm/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(utmData),
    });
    return await response.json();
  } catch (error) {
    console.error('Error sending UTM data:', error);
    return null;
  }
};
```

### 2. App-Level Integration (`src/App.jsx`)

```javascript
import { useEffect } from 'react';
import { captureUTMParameters, sendUTMToBackend } from './utils/utmTracker';

function App() {
  useEffect(() => {
    // Capture UTM parameters on app load
    const utmData = captureUTMParameters();
    
    if (utmData) {
      // Send to backend immediately
      sendUTMToBackend(utmData);
    }
  }, []);

  return (
    // Your app components
  );
}
```

### 3. User Registration Integration

```javascript
// When user registers, attach UTM data
import { getStoredUTMData, clearUTMData } from './utils/utmTracker';

const handleRegistration = async (userData) => {
  const utmData = getStoredUTMData();
  
  const registrationData = {
    ...userData,
    utm_data: utmData
  };

  const response = await fetch('/api/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registrationData)
  });

  if (response.ok) {
    // Clear UTM data after successful conversion
    clearUTMData();
  }
};
```

### 4. Order/Checkout Integration

```javascript
// When user completes order, attach UTM data
import { getStoredUTMData } from './utils/utmTracker';

const handleCheckout = async (orderData) => {
  const utmData = getStoredUTMData();
  
  const checkoutData = {
    ...orderData,
    utm_data: utmData
  };

  const response = await fetch('/api/orders/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(checkoutData)
  });

  return response;
};
```

---

## Backend Implementation

### 1. UTM Model (`Backend/model/utmModel.js`)

```javascript
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const UTMTracking = sequelize.define('UTMTracking', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  guest_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'guest_users',
      key: 'id'
    }
  },
  session_id: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  utm_source: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  utm_medium: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  utm_campaign: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  utm_term: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  utm_content: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  landing_page: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  referrer: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'utm_tracking',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = UTMTracking;
```

### 2. UTM Controller (`Backend/controller/utmController.js`)

```javascript
const UTMTracking = require('../model/utmModel');
const { v4: uuidv4 } = require('uuid');

// Track UTM parameters
exports.trackUTM = async (req, res) => {
  try {
    const {
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      landing_page,
      referrer
    } = req.body;

    // Get session ID from cookie or create new one
    let sessionId = req.cookies.session_id;
    if (!sessionId) {
      sessionId = uuidv4();
      res.cookie('session_id', sessionId, {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true
      });
    }

    // Get user info
    const userId = req.user ? req.user.id : null;
    const guestUserId = req.guestUser ? req.guestUser.id : null;

    // Get IP and user agent
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const utmRecord = await UTMTracking.create({
      user_id: userId,
      guest_user_id: guestUserId,
      session_id: sessionId,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      landing_page,
      referrer,
      ip_address: ipAddress,
      user_agent: userAgent
    });

    res.status(201).json({
      success: true,
      message: 'UTM data tracked successfully',
      data: utmRecord
    });
  } catch (error) {
    console.error('Error tracking UTM:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking UTM data',
      error: error.message
    });
  }
};

// Get UTM data by session
exports.getUTMBySession = async (req, res) => {
  try {
    const sessionId = req.cookies.session_id;
    
    if (!sessionId) {
      return res.status(404).json({
        success: false,
        message: 'No session found'
      });
    }

    const utmData = await UTMTracking.findAll({
      where: { session_id: sessionId },
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: utmData
    });
  } catch (error) {
    console.error('Error fetching UTM data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching UTM data',
      error: error.message
    });
  }
};

// Get UTM analytics
exports.getUTMAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const whereClause = {};
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const analytics = await UTMTracking.findAll({
      where: whereClause,
      attributes: [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['utm_source', 'utm_medium', 'utm_campaign']
    });

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
};
```

### 3. UTM Routes (`Backend/routes/utmRoutes.js`)

```javascript
const express = require('express');
const router = express.Router();
const utmController = require('../controller/utmController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Public route - track UTM
router.post('/track', utmController.trackUTM);

// Get UTM by session
router.get('/session', utmController.getUTMBySession);

// Admin route - get analytics
router.get('/analytics', authenticateToken, utmController.getUTMAnalytics);

module.exports = router;
```

### 4. Register Routes in Main App (`Backend/index.js`)

```javascript
const utmRoutes = require('./routes/utmRoutes');

// Add this with other route registrations
app.use('/api/utm', utmRoutes);
```

---

## Order Association

### Update Order Model to Include UTM Reference

```javascript
// In Backend/model/orderModel.js
utm_tracking_id: {
  type: DataTypes.INTEGER,
  allowNull: true,
  references: {
    model: 'utm_tracking',
    key: 'id'
  }
}
```

### Update Order Controller

```javascript
// In Backend/controller/orderController.js
exports.createOrder = async (req, res) => {
  try {
    const { utm_data, ...orderData } = req.body;
    
    let utmTrackingId = null;
    
    // If UTM data exists, find or create UTM record
    if (utm_data) {
      const sessionId = req.cookies.session_id;
      const utmRecord = await UTMTracking.findOne({
        where: { session_id: sessionId },
        order: [['created_at', 'DESC']]
      });
      
      if (utmRecord) {
        utmTrackingId = utmRecord.id;
      }
    }

    const order = await Order.create({
      ...orderData,
      utm_tracking_id: utmTrackingId
    });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
```

---

## Analytics & Reporting

### Dashboard Queries

```javascript
// Get conversion rate by UTM source
SELECT 
  u.utm_source,
  u.utm_campaign,
  COUNT(DISTINCT u.session_id) as total_visits,
  COUNT(DISTINCT o.id) as total_orders,
  (COUNT(DISTINCT o.id) * 100.0 / COUNT(DISTINCT u.session_id)) as conversion_rate,
  SUM(o.total_amount) as total_revenue
FROM utm_tracking u
LEFT JOIN orders o ON u.id = o.utm_tracking_id
WHERE u.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY u.utm_source, u.utm_campaign
ORDER BY total_revenue DESC;
```

### Top Performing Campaigns

```javascript
// Get best performing campaigns
SELECT 
  utm_campaign,
  utm_source,
  utm_medium,
  COUNT(*) as clicks,
  COUNT(DISTINCT user_id) as unique_users,
  SUM(CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END) as conversions
FROM utm_tracking
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY utm_campaign, utm_source, utm_medium
ORDER BY conversions DESC
LIMIT 10;
```

---

## Testing

### Frontend Testing
1. Test URL with UTM parameters: `http://localhost:3000/?utm_source=test&utm_medium=email&utm_campaign=launch`
2. Check browser localStorage for stored UTM data
3. Verify API call to `/api/utm/track` in Network tab
4. Test registration with UTM data
5. Test order creation with UTM data

### Backend Testing
1. Test POST `/api/utm/track` endpoint
2. Test GET `/api/utm/session` endpoint
3. Test GET `/api/utm/analytics` endpoint
4. Verify database records in `utm_tracking` table
5. Verify order association with UTM data

---

## Privacy & Compliance

### GDPR Considerations
- Store only necessary tracking data
- Provide user option to opt-out of tracking
- Include UTM data in data export requests
- Delete UTM data when user requests account deletion

### Implementation
```javascript
// Add to privacy policy
"We collect marketing attribution data (UTM parameters) to understand 
how users find our website. This data is used solely for improving 
our marketing efforts and is not shared with third parties."
```

---

## Deployment Checklist

### Database
- [ ] Create `utm_tracking` table
- [ ] Add `utm_tracking_id` column to `orders` table
- [ ] Add indexes on `session_id`, `user_id`, `created_at`

### Backend
- [ ] Create UTM model
- [ ] Create UTM controller
- [ ] Create UTM routes
- [ ] Register routes in main app
- [ ] Update order controller to handle UTM data
- [ ] Test all endpoints

### Frontend
- [ ] Create UTM tracker utility
- [ ] Integrate in App.jsx
- [ ] Update registration flow
- [ ] Update checkout flow
- [ ] Test with sample UTM URLs

### Analytics
- [ ] Create dashboard queries
- [ ] Add UTM analytics to admin dashboard
- [ ] Set up automated reports

---

## Future Enhancements

1. **Multi-touch Attribution**: Track multiple UTM touchpoints per user
2. **Custom Parameters**: Support custom tracking parameters beyond standard UTM
3. **Real-time Dashboard**: Live UTM tracking dashboard
4. **A/B Testing Integration**: Link UTM campaigns with A/B tests
5. **Email Integration**: Auto-generate UTM links for email campaigns
6. **Social Media Integration**: Track social media campaign performance

---

## Support & Maintenance

### Monitoring
- Monitor UTM tracking API response times
- Set up alerts for failed UTM captures
- Regular database cleanup of old UTM records (>1 year)

### Documentation
- Keep this document updated with changes
- Document any custom UTM parameters added
- Maintain changelog of UTM tracking updates

---

## Contact & Questions

For questions or issues with UTM tracking implementation, contact the development team.

**Last Updated**: February 2026
**Version**: 1.0
