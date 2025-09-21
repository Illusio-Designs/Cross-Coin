# Cross-Coin E-Commerce Platform

<div align="center">
  <img src="Frontend/public/assets/crosscoin_logo.webp" alt="Cross-Coin Logo" width="200"/>
  
  [![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
  [![Next.js](https://img.shields.io/badge/Next.js-14.1.0-black.svg)](https://nextjs.org/)
  [![Express](https://img.shields.io/badge/Express-4.18.2-lightgrey.svg)](https://expressjs.com/)
  [![MySQL](https://img.shields.io/badge/MySQL-8.0+-blue.svg)](https://mysql.com/)
  [![License](https://img.shields.io/badge/License-ISC-yellow.svg)](LICENSE)
</div>

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
│   │   ├── components/      # React components
│   │   ├── pages/          # Next.js pages
│   │   ├── context/        # React Context providers
│   │   ├── services/       # API service functions
│   │   ├── styles/         # CSS and styling files
│   │   └── utils/          # Frontend utilities
│   ├── public/             # Static assets
│   ├── scripts/            # Build and optimization scripts
│   └── deploy.bat          # Deployment script
├── optimize/               # Performance optimization scripts
│   ├── deploy.bat          # Deployment automation
│   ├── optimize-site.bat   # Windows optimization
│   ├── optimize-site.sh    # Linux/Mac optimization
│   └── super-fast-optimize.bat # Advanced optimization
└── README.md              # This file
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

- **Image Optimization**: Next.js Image component
- **Code Splitting**: Automatic route-based splitting
- **Lazy Loading**: Component and image lazy loading
- **Caching**: Static generation and ISR
- **Bundle Optimization**: Webpack optimization

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

### Production Deployment

#### 1. Environment Setup

```bash
# Set production environment variables
NODE_ENV=production
DB_HOST=your_production_db_host
# ... other production variables
```

#### 2. Backend Deployment

```bash
cd Backend
npm install --production
npm run build
npm start
```

#### 3. Frontend Deployment

```bash
cd Frontend
npm install
npm run build
npm start
```

#### 4. Using Deployment Scripts

```bash
# Windows
cd optimize
optimize-site.bat

# Linux/Mac
cd optimize
chmod +x optimize-site.sh
./optimize-site.sh
```

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

### Built-in Optimizations

- **Next.js Optimization**: Automatic code splitting and optimization
- **Image Optimization**: Sharp-based image processing
- **Bundle Analysis**: Webpack bundle analyzer
- **Caching Headers**: Static asset caching
- **Compression**: Gzip compression enabled

### Optimization Scripts

The `optimize/` directory contains several optimization scripts:

- **optimize-site.bat/sh**: Standard optimization
- **super-fast-optimize.bat**: Advanced optimization with:
  - Aggressive compression (70-80% reduction)
  - Maximum caching (1 year for static assets)
  - Bundle splitting with enforced chunks
  - SWC minification with module concatenation
  - Critical CSS inlined for instant rendering

### Performance Metrics

- **Page Load**: < 2 seconds
- **Image Load**: < 1 second
- **Cache Hit Rate**: 95%+
- **Compression**: 70-80% smaller files

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
