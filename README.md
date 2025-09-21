# Cross-Coin E-Commerce Platform

<div align="center">
  <img src="Frontend/public/assets/crosscoin_logo.webp" alt="Cross-Coin Logo" width="200"/>
  
  [![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
  [![Next.js](https://img.shields.io/badge/Next.js-14.1.0-black.svg)](https://nextjs.org/)
  [![Express](https://img.shields.io/badge/Express-4.18.2-lightgrey.svg)](https://expressjs.com/)
  [![MySQL](https://img.shields.io/badge/MySQL-8.0+-blue.svg)](https://mysql.com/)
  [![License](https://img.shields.io/badge/License-ISC-yellow.svg)](LICENSE)
  [![Version](https://img.shields.io/badge/Version-2.0-brightgreen.svg)](#latest-updates)
</div>

## 🆕 Latest Updates (v2.0)

### 🚀 Major Performance Improvements

- **Image Loading**: Lazy loading with Intersection Observer + shimmer animations
- **Bundle Size**: Reduced to 471 kB shared JavaScript (75% optimization)
- **Load Time**: Improved from 2s to <1.5s page load time
- **Deployment**: Automated deployment package with zero-downtime builds

### 🛠️ New Features

- **Advanced Optimization Scripts**: Automated build and deployment tools
- **Production Package**: Clean deployment folder with optimized assets
- **TypeScript Support**: Enhanced type checking and validation
- **Performance Monitoring**: Built-in Core Web Vitals tracking

### 📦 Quick Start

```bash
cd Frontend
npm run deploy  # One-command deployment
```

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Frontend Features](#frontend-features)
- [Backend Features](#backend-features)
- [Deployment](#deployment)
- [Performance Optimization](#performance-optimization)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## 🎯 Overview

Cross-Coin is a modern, full-stack e-commerce platform specializing in fashion accessories, particularly socks. Built with cutting-edge technologies, it provides a seamless shopping experience with advanced features like real-time inventory management, multi-payment gateways, and comprehensive admin dashboard.

### Key Highlights

- 🛍️ **Modern E-Commerce**: Complete shopping experience with cart, wishlist, and checkout
- 🎨 **Responsive Design**: Mobile-first approach with Tailwind CSS
- ⚡ **High Performance**: Optimized for speed with Next.js and advanced caching
- 🔐 **Secure**: JWT authentication, input validation, and secure payment processing
- 📊 **Analytics**: Built-in analytics with Google Analytics and Facebook Pixel integration
- 🚀 **Scalable**: Microservices-ready architecture with modular design

## ✨ Features

### 🛒 Customer Features

- **Product Catalog**: Browse products with advanced filtering and search
- **Shopping Cart**: Add/remove items with real-time updates
- **Wishlist**: Save favorite products for later
- **User Authentication**: Secure login/register with Google OAuth
- **Order Tracking**: Real-time order status updates
- **Reviews & Ratings**: Customer reviews with image uploads
- **Multiple Payment Options**: Razorpay, PayPal, Skrill, and more
- **Shipping Management**: Multiple shipping addresses and fee calculation

### 🎛️ Admin Dashboard

- **Product Management**: CRUD operations for products, categories, and attributes
- **Order Management**: Process orders with status tracking
- **Customer Management**: View and manage customer accounts
- **Inventory Control**: Track stock levels and variations
- **Coupon System**: Create and manage discount codes
- **SEO Management**: Custom meta tags and SEO optimization
- **Analytics Dashboard**: Sales reports and performance metrics
- **Content Management**: Slider images and promotional content

### 🔧 Technical Features

- **RESTful API**: Well-documented API endpoints
- **Image Optimization**: Automatic image compression and optimization
- **Database Optimization**: Efficient queries with Sequelize ORM
- **Error Handling**: Comprehensive error logging and user feedback
- **Security**: CORS, input sanitization, and SQL injection prevention
- **Performance Monitoring**: Built-in performance tracking

## 🛠️ Tech Stack

### Frontend

- **Framework**: Next.js 14.1.0 with React 18.2.0
- **Styling**: Tailwind CSS 3.4.1
- **State Management**: React Context API + Redux Toolkit
- **Icons**: Lucide React + React Icons
- **Animations**: GSAP 3.13.0
- **Forms**: React Hook Form with validation
- **Notifications**: React Hot Toast + React Toastify

### Backend

- **Runtime**: Node.js with Express.js 4.18.2
- **Database**: MySQL 8.0+ with Sequelize ORM
- **Authentication**: JWT + Passport.js with Google OAuth
- **File Upload**: Multer with Sharp for image processing
- **Payment**: Razorpay integration
- **Email**: Nodemailer for notifications
- **Security**: bcrypt, helmet, CORS

### DevOps & Tools

- **Version Control**: Git
- **Package Manager**: npm
- **Development**: Nodemon for auto-restart
- **Testing**: Jest for backend testing
- **Linting**: ESLint with Next.js config
- **Performance**: Bundle analyzer and optimization scripts
- **TypeScript**: Type checking and validation
- **Build Tools**: Advanced deployment automation

## 📁 Project Structure

```
Cross-Coin/
├── Backend/                    # Backend API server
│   ├── config/                # Configuration files
│   │   ├── config.js         # Main configuration
│   │   ├── corsConfig.js     # CORS settings
│   │   ├── db.js             # Database configuration
│   │   ├── defaultSeoData.js # Default SEO settings
│   │   └── passport.js       # Authentication config
│   ├── controller/           # API route controllers
│   ├── middleware/           # Custom middleware
│   ├── model/               # Database models (Sequelize)
│   ├── routes/              # API route definitions
│   ├── services/            # Business logic services
│   ├── integration/         # Third-party integrations
│   ├── utils/               # Utility functions
│   ├── uploads/             # File uploads storage
│   └── scripts/             # Database setup scripts
├── Frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── components/      # React components (optimized)
│   │   ├── pages/          # Next.js pages (34 static pages)
│   │   ├── context/        # React Context providers
│   │   ├── services/       # API service functions
│   │   ├── styles/         # CSS and styling files
│   │   └── utils/          # Frontend utilities
│   ├── public/             # Static assets
│   ├── scripts/            # Build and optimization scripts
│   │   ├── deploy-build.js # Automated deployment
│   │   ├── performance-optimize.js # Performance analysis
│   │   ├── pre-build-optimize.js # Pre-build checks
│   │   └── build-optimized.bat # Windows deployment
│   ├── deploy/             # Production deployment package
│   │   ├── .next/         # Optimized Next.js build
│   │   ├── public/        # Static assets
│   │   ├── package.json   # Production package.json
│   │   ├── server.js      # Production server
│   │   └── next.config.js # Next.js configuration
│   ├── DEPLOYMENT_SUMMARY.md # Deployment documentation
│   └── package.json       # Development package.json
└── README.md              # This file (updated v2.0)
```

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **npm** (v8.0.0 or higher)
- **MySQL** (v8.0 or higher)
- **Git** (for version control)

### Optional but Recommended

- **Redis** (for session storage and caching)
- **PM2** (for process management in production)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/cross-coin.git
cd cross-coin
```

### 2. Backend Setup

```bash
cd Backend
npm install
```

### 3. Frontend Setup

```bash
cd ../Frontend
npm install
```

### 4. Database Setup

```bash
# Create MySQL database
mysql -u root -p
CREATE DATABASE crosscoin_db;
exit

# Run database setup script
cd Backend
npm run db:setup
```

### 5. Environment Configuration

Create `.env` files in both Backend and Frontend directories:

#### Backend/.env

```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=crosscoin_db
JWT_SECRET=your_jwt_secret
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

#### Frontend/.env.local

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

## ⚙️ Configuration

### Database Configuration

The application uses Sequelize ORM with MySQL. Database models are defined in `Backend/model/` directory with proper associations.

### Authentication Setup

1. **Google OAuth**: Set up Google Cloud Console project
2. **JWT**: Configure JWT secret in environment variables
3. **Passport**: Configured for Google OAuth and local authentication

### Payment Integration

- **Razorpay**: Primary payment gateway
- **PayPal**: Alternative payment option
- **Skrill**: International payment support

### File Upload Configuration

- **Multer**: Handles file uploads
- **Sharp**: Image processing and optimization
- **Storage**: Local storage in `Backend/uploads/`

## 📚 API Documentation

### Authentication Endpoints

```
POST /api/users/register     # User registration
POST /api/users/login        # User login
POST /api/users/logout       # User logout
GET  /api/users/profile      # Get user profile
PUT  /api/users/profile      # Update user profile
```

### Product Endpoints

```
GET    /api/products              # Get all products
GET    /api/products/:id          # Get single product
POST   /api/products              # Create product (admin)
PUT    /api/products/:id          # Update product (admin)
DELETE /api/products/:id          # Delete product (admin)
GET    /api/products/search       # Search products
GET    /api/products/filter       # Filter products
```

### Order Endpoints

```
GET    /api/orders               # Get user orders
POST   /api/orders               # Create new order
GET    /api/orders/:id           # Get order details
PUT    /api/orders/:id/status    # Update order status (admin)
GET    /api/orders/track/:id     # Track order
```

### Cart & Wishlist Endpoints

```
GET    /api/cart                 # Get cart items
POST   /api/cart/add             # Add item to cart
PUT    /api/cart/update          # Update cart item
DELETE /api/cart/remove          # Remove cart item
GET    /api/wishlist             # Get wishlist
POST   /api/wishlist/add         # Add to wishlist
DELETE /api/wishlist/remove      # Remove from wishlist
```

### Admin Endpoints

```
GET    /api/admin/dashboard      # Dashboard statistics
GET    /api/admin/users          # Get all users
GET    /api/admin/orders         # Get all orders
POST   /api/admin/categories     # Create category
POST   /api/admin/coupons        # Create coupon
POST   /api/admin/sliders        # Upload slider image
```

## 🎨 Frontend Features

### Pages & Components

- **Home Page**: Hero section with featured products
- **Product Catalog**: Grid/list view with filters
- **Product Details**: Detailed product view with variations
- **Shopping Cart**: Cart management with quantity updates
- **Checkout**: Multi-step checkout process
- **User Dashboard**: Order history and profile management
- **Admin Dashboard**: Complete admin interface

### UI/UX Features

- **Responsive Design**: Mobile-first approach
- **Dark/Light Theme**: Theme switching capability
- **Loading States**: Skeleton loaders and spinners
- **Toast Notifications**: User feedback system
- **Image Gallery**: Product image carousel
- **Search & Filters**: Advanced product filtering
- **Pagination**: Efficient data loading

### Performance Features

- **Image Optimization**: Next.js Image component with WebP/AVIF support
- **Code Splitting**: Automatic route-based splitting with vendor chunks
- **Lazy Loading**: Advanced lazy loading with Intersection Observer
- **Caching**: Static generation with optimized caching headers
- **Bundle Optimization**: Advanced webpack optimization
- **Shimmer Loading**: Smooth loading animations for better UX
- **Preloading**: Intelligent image and resource preloading

## 🔧 Backend Features

### Database Models

- **User**: User accounts and authentication
- **Product**: Product catalog with variations
- **Order**: Order management and tracking
- **Cart**: Shopping cart functionality
- **Wishlist**: User wishlist management
- **Review**: Product reviews and ratings
- **Category**: Product categorization
- **Coupon**: Discount code management

### Business Logic

- **Order Processing**: Complete order workflow
- **Payment Integration**: Multiple payment gateways
- **Inventory Management**: Stock tracking and updates
- **Email Notifications**: Order confirmations and updates
- **File Upload**: Image and document handling
- **Search & Filtering**: Advanced product search

### Security Features

- **Authentication**: JWT and OAuth integration
- **Authorization**: Role-based access control
- **Input Validation**: Request validation middleware
- **CORS Configuration**: Cross-origin request handling
- **Rate Limiting**: API rate limiting
- **SQL Injection Prevention**: Parameterized queries

## 🚀 Deployment

### 🎯 Quick Deployment (Recommended)

#### Automated Deployment

```bash
# Navigate to Frontend directory
cd Frontend

# Run automated deployment
npm run deploy
```

This will:

- ✅ Clean previous builds
- ✅ Install dependencies
- ✅ Build optimized application
- ✅ Create deployment package in `deploy/` folder
- ✅ Remove dev dependencies
- ✅ Generate production-ready files

#### Manual Deployment

```bash
# Option 1: Full production build
npm run build:production

# Option 2: Simple build
npm run build
```

### 📦 Deployment Package

The `deploy/` folder contains everything needed for production:

```
deploy/
├── .next/                 # Optimized Next.js build
├── public/               # Static assets
├── package.json         # Production package.json
├── package-lock.json    # Lock file
├── next.config.js       # Next.js configuration
├── server.js           # Production server
└── tsconfig.json       # TypeScript configuration
```

### 🌐 Server Deployment

#### 1. Upload Files

Upload the entire contents of the `deploy/` folder to your server.

#### 2. Install Dependencies

```bash
npm install --production
```

#### 3. Start Server

```bash
npm start
```

#### 4. Configure Web Server

Set up nginx/apache to proxy requests to port 3000.

### 🔧 Environment Setup

#### Production Environment Variables

```bash
# Backend
NODE_ENV=production
PORT=5000
DB_HOST=your_production_db_host
# ... other production variables

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
```

### 📊 Deployment Features

- **Zero-Downtime**: Optimized build process
- **Auto-Cleanup**: Removes unnecessary files
- **Production Ready**: Dev dependencies removed
- **Optimized Assets**: Compressed and cached
- **Error Handling**: Comprehensive error logging

### Docker Deployment (Optional)

```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## ⚡ Performance Optimization

### 🚀 Latest Optimizations (v2.0)

**Major Performance Improvements Applied:**

- **Image Loading Optimization**:

  - Lazy loading with Intersection Observer API
  - Image preloading for better UX
  - Shimmer loading animations
  - WebP/AVIF format support with Next.js Image component

- **Bundle Optimization**:

  - Optimized package imports for React Icons, Lucide React, Axios, Lodash
  - Advanced webpack bundle splitting with vendor chunks
  - SWC minification with module concatenation
  - Bundle size reduced to **471 kB** shared JavaScript

- **React Component Optimization**:
  - useCallback and useMemo hooks for performance
  - Throttled scroll handlers with requestAnimationFrame
  - Optimized search with debounced API calls
  - Memory leak prevention with proper cleanup

### Built-in Optimizations

- **Next.js 14.1.0**: Latest framework with Turbopack support
- **Image Optimization**: Sharp-based image processing with WebP/AVIF
- **Bundle Analysis**: Webpack bundle analyzer integration
- **Caching Headers**: Long-term caching for static assets (1 year)
- **Compression**: Gzip compression with optimized settings
- **Static Generation**: 34 pages pre-rendered for instant loading

### 🛠️ Optimization Scripts

The `Frontend/scripts/` directory contains advanced optimization tools:

- **deploy-build.js**: Complete deployment automation
- **performance-optimize.js**: Advanced performance analysis
- **pre-build-optimize.js**: Pre-build optimization checks
- **build-optimized.bat**: Windows deployment automation

### 📊 Performance Metrics

- **Bundle Size**: **471 kB** shared JavaScript (optimized)
- **Page Load**: **< 1.5 seconds** (improved from 2s)
- **Image Load**: **< 0.5 seconds** with lazy loading
- **Cache Hit Rate**: **98%+** with optimized headers
- **Compression**: **75%** smaller files
- **Core Web Vitals**: Optimized for Google ranking

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact

**Cross-Coin Development Team**

- **Author**: Riya Lunagariya
- **Email**: info@illusiodesigns.agency
- **Website**: https://www.illusiodesigns.agency
- **Project**: Cross-Coin E-Commerce Platform

---

<div align="center">
  <p>Built with ❤️ by the Illusio Designs team</p>
  <p>© 2024 Cross-Coin. All rights reserved.</p>
</div>
