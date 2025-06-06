# Cross-Coin Backend

This is the backend service for the Cross-Coin e-commerce platform, built with Node.js, Express, and Sequelize ORM.

## Features

- RESTful API architecture
- MySQL database with Sequelize ORM
- User authentication and authorization
- Product management with categories and variations
- Shopping cart and wishlist functionality
- Order management system
- Review and rating system
- Coupon management
- SEO optimization support
- File upload handling

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn package manager

## Environment Setup

1. Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=crosscoin
DB_DIALECT=mysql

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# File Upload Configuration
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880 # 5MB in bytes
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
npm run setup-db
```

4. Start the development server:
```bash
npm run dev
```

## Available Scripts

- `npm run dev`: Start the development server with nodemon
- `npm start`: Start the production server
- `npm run setup-db`: Set up the database and create tables
- `npm test`: Run tests
- `npm run lint`: Run ESLint
- `npm run format`: Format code with Prettier

## API Documentation

The API documentation is available at `/api-docs` when the server is running.

### Main Endpoints

- `/api/auth` - Authentication endpoints
- `/api/users` - User management
- `/api/products` - Product management
- `/api/categories` - Category management
- `/api/orders` - Order management
- `/api/cart` - Shopping cart
- `/api/wishlist` - Wishlist management
- `/api/reviews` - Review management
- `/api/coupons` - Coupon management

## Database Schema

The application uses the following main models:

- User
- Product
- Category
- Order
- Cart
- Review
- Coupon
- Attribute
- ProductVariation

For detailed schema information, refer to the model files in the `model` directory.

## Error Handling

The application implements a centralized error handling system with proper HTTP status codes and error messages.

## Security

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- CORS configuration
- Rate limiting
- File upload security

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 