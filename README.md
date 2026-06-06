<!--  --># Cross-Coin E-Commerce Platform

<div align="center">
  <img src="Crosscoin/public/assets/crosscoin_logo.webp" alt="Cross-Coin Logo" width="200"/>
  
  [![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
  [![Next.js](https://img.shields.io/badge/Next.js-14.2.33-black.svg)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
  [![Express](https://img.shields.io/badge/Express-4.18.2-lightgrey.svg)](https://expressjs.com/)
  [![MySQL](https://img.shields.io/badge/MySQL-8.0+-blue.svg)](https://mysql.com/)
  [![License](https://img.shields.io/badge/License-ISC-yellow.svg)](LICENSE)
</div>

## 🚀 Multi-Brand E-Commerce Platform

A comprehensive, production-ready e-commerce solution supporting multiple brands with advanced features for fashion accessories and retail products.

### 🏢 Supported Brands

| Brand | Vertical | Stack | Production readiness |
|---|---|---|---|
| **Cross-Coin** | Fashion accessories and socks | Vite SPA | 92/100 baseline |
| **Knitwink** | Knitted products and accessories | Next 16 + React 19 | 99/100 |
| **Velmique** | Luxury fragrance | Next 14.2 + React 18 | 97/100 |
| **Velquira** | Fine jewellery | Next 16 + React 19 | 97/100 |
| **Gripzus** | Specialized grip products | — | — |

Per-storefront detail lives in each `<Repo>/README.md` and `<Repo>/PENDING.md`. The remaining cross-cutting work is the Velmique Next 14.2 → 16 + React 19 + `@react-three/fiber@9` upgrade — see `Velmique/PENDING.md`.

### 🆕 Latest Features

- **Multi-Brand Architecture**: Separate frontend instances for each brand
- **Advanced Image Generation**: AI-powered product image generation
- **Performance Optimized**: Bundle size optimization and lazy loading
- **Automated Deployment**: One-command deployment with production builds
- **TypeScript Support**: Enhanced type checking and validation
- **Real-time Analytics**: Google Analytics and Facebook Pixel integration
- **Secure Payments**: Multiple payment gateway integrations

### 📦 Quick Start

```bash
# Backend
cd Backend
npm install
npm run dev

# Frontend (Crosscoin)
cd Crosscoin
npm install
npm run dev
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

Cross-Coin is a modern, full-stack multi-brand e-commerce platform specializing in fashion accessories and retail products. Built with cutting-edge technologies, it provides a seamless shopping experience with advanced features like real-time inventory management, multi-payment gateways, AI-powered image generation, and comprehensive admin dashboard.

### Key Highlights

- 🏢 **Multi-Brand Support**: Separate storefronts for Cross-Coin, Knitwink, and Gripzus
- 🛍️ **Complete E-Commerce**: Full shopping experience with cart, wishlist, and checkout
- 🎨 **Responsive Design**: Mobile-first approach with Tailwind CSS 3.4.1
- ⚡ **High Performance**: Optimized with Next.js 14.2.33 and advanced caching
- 🔐 **Secure**: JWT authentication, OAuth, input validation, and secure payment processing
- 📊 **Analytics**: Google Analytics, Facebook Pixel, and Vercel Analytics integration
- 🤖 **AI-Powered**: Automated product image generation capabilities
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
- **Shipping Management**: Real-time tracking with duplicate prevention and error handling

### 🔧 Technical Features

- **RESTful API**: Well-documented API endpoints
- **Image Optimization**: Automatic image compression with Sharp
- **AI Image Generation**: Automated product image creation
- **Database Optimization**: Efficient queries with Sequelize ORM
- **Error Handling**: Comprehensive error logging and user feedback
- **Security**: CORS, helmet, input sanitization, and SQL injection prevention
- **Performance Monitoring**: Vercel Analytics and Speed Insights
- **Session Management**: Express sessions with MySQL storage
- **File Processing**: Advanced file handling with Multer and Sharp

## 🤖 AI Image Generation

The platform includes advanced AI-powered image generation capabilities for product images. See dedicated documentation:

- [AI Image Generation Spec](AI_IMAGE_GENERATION_SPEC.md)
- [Implementation Guide](AI_IMAGE_GENERATION_IMPLEMENTATION.md)
- [README](AI_IMAGE_GENERATION_README.md)
- [Summary](AI_IMAGE_GENERATION_SUMMARY.md)

## 🛠️ Tech Stack

### Frontend

- **Framework**: Next.js 14.2.33 with React 18.2.0
- **Styling**: Tailwind CSS 3.4.1 with Autoprefixer
- **State Management**: Redux Toolkit 2.2.1 + React Context API
- **Authentication**: NextAuth.js 4.24.5
- **Icons**: Lucide React 0.511.0 + React Icons 5.0.1
- **Animations**: GSAP 3.13.0 + Lottie animations
- **Forms**: React Hook Form with validation
- **Notifications**: React Hot Toast 2.4.1 + React Toastify 11.0.5
- **Rich Text**: TipTap 2.25.0 + React Quill 2.0.0
- **Analytics**: Vercel Analytics + Speed Insights
- **Routing**: React Router DOM 7.6.2
- **Data Export**: XLSX 0.18.5

### Backend

- **Runtime**: Node.js with Express.js 4.18.2
- **Database**: MySQL 8.0+ with Sequelize ORM 6.31.0
- **Authentication**: JWT + Passport.js with Google OAuth 2.0
- **File Upload**: Multer with Sharp 0.33.5 for image processing
- **Payment**: Razorpay 2.9.6 integration
- **Email**: Nodemailer 6.10.0 for notifications
- **Security**: bcrypt 6.0.0, helmet, CORS 2.8.5
- **Session**: Express Session with MySQL storage
- **Compression**: Gzip compression 1.8.1
- **Scheduling**: Node-cron 3.0.3
- **PDF Generation**: PDF-lib 1.17.1
- **Data Processing**: XLSX 0.18.5, Archiver 7.0.1

### DevOps & Tools

- **Version Control**: Git
- **Package Manager**: npm
- **Development**: Nodemon 2.0.22 for auto-restart
- **Testing**: Jest 29.7.0 + Playwright 1.55.0
- **Linting**: ESLint with Next.js config
- **Performance**: Webpack Bundle Analyzer 4.10.1
- **TypeScript**: 5.3.3 with type checking
- **Build Tools**: Automated deployment scripts
- **Cleaning**: Rimraf 5.0.5

## 📁 Project Structure

```
Cross-Coin/
├── Backend/                    # Backend API server
│   ├── config/                # Configuration files
│   │   ├── config.js         # Main configuration
│   │   ├── corsConfig.js     # CORS settings
│   │   ├── cronJobs.js       # Scheduled tasks
│   │   ├── db.js             # Database configuration
│   │   ├── defaultSeoData.js # Default SEO settings
│   │   └── passport.js       # Authentication config
│   ├── controller/           # API route controllers (22 controllers)
│   ├── middleware/           # Custom middleware (auth, brand, upload)
│   ├── model/               # Database models (40+ Sequelize models)
│   ├── routes/              # API route definitions
│   ├── services/            # Business logic services
│   ├── integration/         # Third-party integrations (Analytics, FB, Google)
│   ├── uploads/             # File uploads storage
│   │   ├── categories/      # Category images
│   │   └── products/        # Product images
│   ├── scripts/             # Database setup and migration scripts
│   └── package.json         # Backend dependencies
│
├── Crosscoin/               # Cross-Coin brand frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Next.js pages
│   │   ├── context/        # React Context providers
│   │   ├── services/       # API service functions
│   │   ├── styles/         # CSS and styling files
│   │   └── utils/          # Frontend utilities
│   ├── public/             # Static assets
│   ├── scripts/            # Build and optimization scripts
│   │   ├── deploy-build.js # Automated deployment
│   │   ├── performance-optimize.js # Performance analysis
│   │   └── pre-build-optimize.js # Pre-build checks
│   ├── deploy/             # Production deployment package
│   └── package.json        # Frontend dependencies
│
├── Knitwink/               # Knitwink brand frontend
│   └── [Similar structure to Crosscoin]
│
├── Gripzus/                # Gripzus brand frontend
│   └── [Similar structure to Crosscoin]
│
├── AI_IMAGE_GENERATION_*.md # AI image generation documentation
└── README.md               # This file
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

# Create .env file (see Configuration section)
```

### 3. Frontend Setup (Choose your brand)

```bash
# For Cross-Coin
cd Crosscoin
npm install

# For Knitwink
cd Knitwink
npm install

# For Gripzus
cd Gripzus
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

### 5. Start Development Servers

```bash
# Terminal 1 - Backend
cd Backend
npm run dev

# Terminal 2 - Frontend (Crosscoin example)
cd Crosscoin
npm run dev
```

Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## ⚙️ Configuration

### Environment Configuration

Create `.env` files in Backend and your chosen frontend directory:

#### Backend/.env

```env
NODE_ENV=development
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=crosscoin_db

# Authentication
JWT_SECRET=your_jwt_secret_key_here
SESSION_SECRET=your_session_secret_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/users/auth/google/callback

# Payment Gateway
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# FShip Integration (Optional)
FSHIP_API_KEY=your_fship_api_key
FSHIP_API_URL=https://api.fship.com

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

#### Frontend/.env.local (Crosscoin/Knitwink/Gripzus)

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000

# Authentication
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Analytics (Optional)
NEXT_PUBLIC_GA_ID=your_google_analytics_id
NEXT_PUBLIC_FB_PIXEL_ID=your_facebook_pixel_id

# Environment
NODE_ENV=development
```

## ⚙️ Configuration (Continued)

### Database Configuration

The application uses Sequelize ORM with MySQL. Database models are defined in `Backend/model/` directory with proper associations and relationships.

Key models include:
- User, GuestUser
- Product, ProductVariation, ProductImage, ProductSEO
- Order, OrderItem, OrderStatusHistory
- Cart, CartItem, Wishlist
- Category, Brand, Attribute
- Payment, ShippingAddress, ShippingFee
- Review, Coupon, Slider, Policy, SEO

### Authentication Setup

1. **Google OAuth**: 
   - Create project in Google Cloud Console
   - Enable Google+ API
   - Configure OAuth consent screen
   - Create OAuth 2.0 credentials
   - Add authorized redirect URIs

2. **JWT**: 
   - Configure JWT_SECRET in environment variables
   - Token expiration set in config

3. **NextAuth**: 
   - Configure NEXTAUTH_SECRET and NEXTAUTH_URL
   - Supports Google OAuth and credentials providers

### Payment Integration

- **Razorpay**: Primary payment gateway for Indian market
- **PayPal**: Alternative payment option for international customers
- **Skrill**: Additional international payment support

Configure payment keys in Backend/.env file.

### File Upload Configuration

- **Multer**: Handles multipart/form-data file uploads
- **Sharp**: Image processing, resizing, and optimization
- **Storage**: Local storage in `Backend/uploads/` with organized subdirectories
- **Supported Formats**: JPEG, PNG, WebP, AVIF

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

- **Home Page**: Hero section with sliders, featured products, and categories
- **Product Catalog**: Grid/list view with advanced filters and sorting
- **Product Details**: Detailed product view with variations, reviews, and related products
- **Shopping Cart**: Real-time cart management with quantity updates
- **Wishlist**: Save favorite products across sessions
- **Checkout**: Multi-step checkout with address validation and payment
- **User Dashboard**: Order history, profile management, addresses, and wishlist
- **Admin Dashboard**: Complete admin interface for all operations
- **Category Pages**: Browse products by category
- **Brand Pages**: Browse products by brand
- **Search Results**: Advanced search with filters
- **Order Tracking**: Real-time order status updates

### UI/UX Features

- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Theme Support**: Next-themes for dark/light mode switching
- **Loading States**: Skeleton loaders, shimmer effects, and Lottie animations
- **Toast Notifications**: Dual notification system (React Hot Toast + Toastify)
- **Image Gallery**: Product image carousel with zoom functionality
- **Advanced Search**: Real-time search with debouncing
- **Filters & Sorting**: Multi-criteria product filtering and sorting
- **Pagination**: Efficient data loading with pagination controls
- **Date Picker**: React DatePicker for date selections
- **Select Components**: React Select for enhanced dropdowns
- **Rich Text Editor**: TipTap and Quill for content management
- **Data Export**: Export orders and reports to Excel format

### Performance Features

- **Image Optimization**: Next.js Image component with WebP/AVIF support
- **Code Splitting**: Automatic route-based splitting with vendor chunks
- **Lazy Loading**: Intersection Observer API for images and components
- **Static Generation**: Pre-rendered pages for instant loading
- **Bundle Optimization**: Webpack optimization with tree shaking
- **Compression**: Gzip compression for all assets
- **Caching**: Optimized caching headers for static resources
- **Analytics**: Vercel Analytics and Speed Insights integration
- **Performance Monitoring**: Real-time Core Web Vitals tracking
- **Preloading**: Intelligent resource preloading for critical assets

## 🔧 Backend Features

### Database Models (40+ Sequelize Models)

Core models with associations:
- **User Management**: User, GuestUser
- **Product System**: Product, ProductVariation, ProductImage, ProductSEO, ProductBrand
- **Order Management**: Order, OrderItem, OrderStatusHistory, Payment
- **Shopping Features**: Cart, CartItem, Wishlist
- **Catalog**: Category, CategoryBrand, Brand, BrandSetting, Attribute, AttributeValue
- **Marketing**: Coupon, CouponUsage, Slider, Review, ReviewImage
- **Shipping**: ShippingAddress, ShippingFee, FshipLabelDownload
- **Content**: Policy, SEOMetadata, UTM

### Business Logic & Services

- **Order Processing**: Complete order workflow with status tracking
- **Payment Integration**: Razorpay integration with webhook handling
- **Inventory Management**: Real-time stock tracking and updates
- **Email Notifications**: Order confirmations, status updates, and newsletters
- **File Upload**: Multi-file upload with image optimization
- **Search & Filtering**: Advanced product search with multiple criteria
- **Brand Management**: Multi-brand support with brand-specific settings
- **Address Quality**: Address validation and quality checking
- **FShip Integration**: Shipping label generation and tracking
- **Settings Helper**: Centralized settings management

### Integration Services

- **Dashboard Analytics**: Custom analytics and reporting
- **Facebook Catalog**: Product catalog sync for Facebook
- **Facebook Pixel**: Event tracking and conversion optimization
- **Google Analytics**: E-commerce tracking and user behavior

### Security Features

- **Authentication**: JWT tokens with refresh token support
- **Authorization**: Role-based access control (RBAC)
- **Input Validation**: Request validation middleware with sanitization
- **CORS Configuration**: Configurable cross-origin request handling
- **Rate Limiting**: API rate limiting to prevent abuse
- **SQL Injection Prevention**: Parameterized queries with Sequelize
- **XSS Protection**: Input sanitization with DOMPurify
- **Password Hashing**: bcrypt with salt rounds
- **Session Management**: Secure session storage with MySQL
- **Helmet**: Security headers configuration

### API Features

- **RESTful Design**: Clean and consistent API structure
- **Error Handling**: Centralized error handling with proper status codes
- **Logging**: Morgan for HTTP request logging
- **Compression**: Gzip compression for responses
- **File Processing**: Sharp for image optimization and resizing
- **PDF Generation**: PDF-lib for invoice and label generation
- **Excel Export**: XLSX for data export functionality
- **Scheduled Tasks**: Node-cron for automated jobs
- **Archiving**: Archiver for file compression and downloads

## 🚀 Deployment

### 🎯 Quick Deployment (Recommended)

#### Automated Deployment

```bash
# Navigate to your brand's frontend directory
cd Crosscoin  # or Knitwink or Gripzus

# Run automated deployment
npm run deploy
```

This will:
- ✅ Clean previous builds
- ✅ Run pre-build optimizations
- ✅ Install dependencies
- ✅ Build optimized application
- ✅ Create deployment package in `deploy/` folder
- ✅ Remove dev dependencies
- ✅ Generate production-ready files

#### Manual Deployment Options

```bash
# Option 1: Full production build with optimizations
npm run build:production

# Option 2: Optimized build
npm run build:optimized

# Option 3: Simple build
npm run build

# Option 4: Performance analysis
npm run optimize:performance
```

### 📦 Deployment Package

The `deploy/` folder contains everything needed for production:

```
deploy/
├── .next/                 # Optimized Next.js build
├── public/               # Static assets
├── package.json         # Production package.json (no dev deps)
├── package-lock.json    # Lock file
├── next.config.js       # Next.js configuration
├── server.js           # Production server (if custom)
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
# Using npm
npm start

# Using PM2 (recommended for production)
pm2 start npm --name "crosscoin" -- start
pm2 save
pm2 startup
```

#### 4. Configure Web Server (Nginx Example)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 🔧 Environment Setup

#### Production Environment Variables

```bash
# Backend
NODE_ENV=production
PORT=5000
DB_HOST=your_production_db_host
DB_USER=your_production_db_user
DB_PASSWORD=your_production_db_password
DB_DATABASE=crosscoin_production
JWT_SECRET=your_strong_jwt_secret
# ... other production variables

# Frontend
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your_strong_nextauth_secret
```

### 📊 Deployment Features

- **Zero-Downtime**: Optimized build process with minimal interruption
- **Auto-Cleanup**: Removes unnecessary files and dev dependencies
- **Production Ready**: Optimized for production environment
- **Optimized Assets**: Compressed and cached static files
- **Error Handling**: Comprehensive error logging
- **Performance**: Pre-optimized for best Core Web Vitals

### 🐳 Docker Deployment (Optional)

#### Dockerfile for Frontend

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

#### Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build: ./Backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    depends_on:
      - mysql

  frontend:
    build: ./Crosscoin
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - backend

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: your_password
      MYSQL_DATABASE: crosscoin_db
    volumes:
      - mysql_data:/var/lib/mysql

volumes:
  mysql_data:
```

## ⚡ Performance Optimization

### 🚀 Built-in Optimizations

The platform includes comprehensive performance optimizations:

**Image Optimization:**
- Next.js Image component with automatic WebP/AVIF conversion
- Sharp-based server-side image processing
- Lazy loading with Intersection Observer API
- Image preloading for critical assets
- Responsive images with srcset

**Bundle Optimization:**
- Webpack optimization with tree shaking
- Code splitting with vendor chunks
- Dynamic imports for route-based splitting
- SWC minification (faster than Terser)
- Module concatenation for smaller bundles

**React Optimization:**
- useCallback and useMemo hooks
- React.memo for component memoization
- Throttled scroll handlers with requestAnimationFrame
- Debounced search and input handlers
- Proper cleanup to prevent memory leaks

**Caching Strategy:**
- Static generation for product pages
- Incremental Static Regeneration (ISR)
- Long-term caching for static assets (1 year)
- Service worker caching (if implemented)
- API response caching

**Loading Performance:**
- Shimmer loading animations
- Skeleton screens for better perceived performance
- Lottie animations for engaging loading states
- Progressive image loading
- Prefetching for navigation

### 🛠️ Optimization Scripts

The platform includes automated optimization tools in `scripts/`:

```bash
# Pre-build optimization checks
npm run optimize:pre-build

# Performance analysis after build
npm run optimize:performance

# Full optimized build
npm run build:optimized

# Bundle analysis
npm run analyze
```

**Scripts functionality:**
- **pre-build-optimize.js**: Validates configuration, checks dependencies
- **performance-optimize.js**: Analyzes bundle size, identifies optimization opportunities
- **deploy-build.js**: Complete deployment automation with optimizations

### 📊 Performance Metrics

Target metrics for production:

- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.5s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **First Input Delay (FID)**: < 100ms
- **Bundle Size**: Optimized to < 500 KB shared JavaScript
- **Image Load Time**: < 0.5s with lazy loading
- **Cache Hit Rate**: 95%+ for static assets

### 🔍 Monitoring & Analytics

- **Vercel Analytics**: Real-time performance monitoring
- **Vercel Speed Insights**: Core Web Vitals tracking
- **Google Analytics**: User behavior and conversion tracking
- **Facebook Pixel**: Event tracking and remarketing
- **Custom Dashboard**: Backend analytics for business metrics

### 💡 Best Practices Implemented

- Static generation for SEO-critical pages
- Dynamic imports for heavy components
- Compression middleware for API responses
- CDN-ready static asset structure
- Optimized font loading with next/font
- Minimal third-party scripts
- Efficient database queries with indexes
- Connection pooling for database
- Redis caching for session storage (optional)

## 🤝 Contributing

We welcome contributions to improve the Cross-Coin platform! Please follow these guidelines:

### Getting Started

1. **Fork the repository**
2. **Clone your fork**: `git clone https://github.com/yourusername/cross-coin.git`
3. **Create a feature branch**: `git checkout -b feature/amazing-feature`
4. **Make your changes**
5. **Commit your changes**: `git commit -m 'Add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Development Guidelines

- **Code Style**: Follow the existing code style and conventions
- **ESLint**: Ensure your code passes linting (`npm run lint`)
- **TypeScript**: Use TypeScript for type safety where applicable
- **Testing**: Add tests for new features (Jest for backend, Playwright for frontend)
- **Documentation**: Update documentation for significant changes
- **Commits**: Write clear, descriptive commit messages
- **Pull Requests**: Provide detailed description of changes

### Code Standards

- Use meaningful variable and function names
- Add comments for complex logic
- Follow React best practices (hooks, component structure)
- Optimize for performance (avoid unnecessary re-renders)
- Ensure accessibility compliance
- Handle errors gracefully
- Validate user inputs

### Testing

```bash
# Backend tests
cd Backend
npm test

# Frontend type checking
cd Crosscoin
npm run type-check

# Linting
npm run lint
```

### Areas for Contribution

- Bug fixes and issue resolution
- Performance improvements
- New features and enhancements
- Documentation improvements
- Test coverage expansion
- Accessibility improvements
- UI/UX enhancements
- Security improvements

## 📄 License

This project is licensed under the ISC License.

## 📞 Contact

**Cross-Coin Development Team**

- **Author**: Riya Lunagariya
- **Email**: info@illusiodesigns.agency
- **Website**: [https://www.illusiodesigns.agency](https://www.illusiodesigns.agency)
- **Project**: Cross-Coin Multi-Brand E-Commerce Platform

### Support

For support, bug reports, or feature requests:
- Open an issue on GitHub
- Contact us via email
- Visit our website for more information

---

<div align="center">
  
### 🌟 Key Features Summary

| Feature | Description |
|---------|-------------|
| 🏢 Multi-Brand | Support for Cross-Coin, Knitwink, and Gripzus |
| 🛍️ E-Commerce | Complete shopping cart, wishlist, and checkout |
| 🤖 AI-Powered | Automated product image generation |
| ⚡ Performance | Optimized with Next.js 14.2.33 and advanced caching |
| 🔐 Security | JWT, OAuth, input validation, and secure payments |
| 📊 Analytics | Google Analytics, Facebook Pixel, Vercel Analytics |
| 🚀 Deployment | One-command automated deployment |
| 📱 Responsive | Mobile-first design with Tailwind CSS |

### 🛠️ Tech Stack Summary

**Frontend**: Next.js 14.2.33 • React 18.2.0 • Tailwind CSS 3.4.1 • Redux Toolkit 2.2.1

**Backend**: Node.js • Express 4.18.2 • MySQL 8.0+ • Sequelize 6.31.0

**Tools**: TypeScript 5.3.3 • Jest 29.7.0 • Playwright 1.55.0 • Sharp 0.33.5

---

<p>Built with ❤️ by the Illusio Designs team</p>
<p>© 2024 Cross-Coin. All rights reserved.</p>

</div>
