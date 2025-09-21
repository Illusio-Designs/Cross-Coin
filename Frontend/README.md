# Cross-Coin Frontend

This is the frontend application for the Cross-Coin e-commerce platform, built with Next.js, React, and Tailwind CSS.

## Features

- Modern, responsive design with Tailwind CSS
- Server-side rendering with Next.js
- Dynamic product catalog with categories
- Shopping cart and wishlist functionality
- User authentication and profile management
- Product search and filtering
- Order tracking and management
- Review and rating system
- Responsive image handling
- SEO optimization

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager
- Backend API running (see Backend README for setup)

## Environment Setup

1. Create a `.env.local` file in the root directory with the following variables:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Authentication
NEXT_PUBLIC_JWT_SECRET=your_jwt_secret

# Image Upload
NEXT_PUBLIC_UPLOAD_URL=http://localhost:3000/uploads
```

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd frontend1
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

## Available Scripts

- `npm run dev`: Start the development server
- `npm run build`: Build the production application
- `npm start`: Start the production server
- `npm run lint`: Run ESLint
- `npm run format`: Format code with Prettier

## Project Structure

```
frontend1/
├── src/
│   ├── app/              # Next.js 13+ app directory
│   ├── components/       # Reusable React components
│   ├── lib/             # Utility functions and helpers
│   ├── styles/          # Global styles and Tailwind config
│   └── types/           # TypeScript type definitions
├── public/              # Static assets
└── ...
```

## Key Technologies

- **Next.js**: React framework for server-side rendering and static site generation
- **React**: JavaScript library for building user interfaces
- **Tailwind CSS**: Utility-first CSS framework
- **TypeScript**: Static type checking
- **Axios**: HTTP client for API requests
- **React Query**: Data fetching and caching
- **Zustand**: State management
- **React Hook Form**: Form handling
- **Yup**: Form validation

## Component Architecture

The application follows a modular component architecture:

- **Layout Components**: Page layouts and navigation
- **UI Components**: Reusable UI elements
- **Feature Components**: Feature-specific components
- **Page Components**: Page-specific components

## API Integration

The frontend communicates with the backend API through:

- RESTful API endpoints
- JWT authentication
- File upload handling
- Real-time updates (where applicable)

## Styling

- Tailwind CSS for utility-first styling
- Custom CSS modules for component-specific styles
- Responsive design for all screen sizes
- Dark mode support

## Performance Optimization

- Image optimization with Next.js Image component
- Code splitting and lazy loading
- Server-side rendering for SEO
- Static site generation where applicable
- Caching strategies

## Development Guidelines

1. **Code Style**
   - Follow ESLint and Prettier configurations
   - Use TypeScript for type safety
   - Follow React best practices

2. **Component Development**
   - Create reusable components
   - Implement proper prop typing
   - Use React hooks effectively
   - Follow atomic design principles

3. **State Management**
   - Use Zustand for global state
   - React Query for server state
   - Local state with useState when appropriate

4. **Testing**
   - Write unit tests for components
   - Integration tests for features
   - E2E tests for critical paths

## Deployment

The application can be deployed to various platforms:

- Vercel (recommended for Next.js)
- Netlify
- AWS Amplify
- Custom server

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
