# Cross-Coin Frontend

This is the frontend application for the Cross-Coin project, built with Next.js and React.

## 🚀 Tech Stack

- **Framework**: Next.js 15.3.2
- **UI Library**: React 19.0.0
- **Styling**: Tailwind CSS 3.4.17
- **Icons**: React Icons 5.5.0

## 📦 Project Structure

```
frontend1/
├── src/
│   ├── app/          # Next.js app directory (routing and layouts)
│   ├── components/   # Reusable React components
│   ├── pages/        # Page components
│   ├── styles/       # Global styles and Tailwind configurations
│   └── assets/       # Static assets (images, fonts, etc.)
├── public/           # Public static files
└── ...
```

## 🛠️ Getting Started

### Prerequisites

- Node.js (Latest LTS version recommended)
- npm or yarn package manager

### Installation

1. Clone the repository:
   ```bash
   git clone [repository-url]
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

The application will be available at `http://localhost:3000`

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code linting

## 🎨 Styling

This project uses Tailwind CSS for styling. The configuration can be found in `tailwind.config.mjs`.

## 🔧 Configuration Files

- `next.config.mjs` - Next.js configuration
- `postcss.config.mjs` - PostCSS configuration
- `tailwind.config.mjs` - Tailwind CSS configuration
- `jsconfig.json` - JavaScript configuration

## 📚 Development Guidelines

1. **Component Structure**
   - Place reusable components in `src/components`
   - Keep components modular and focused on a single responsibility
   - Use TypeScript for better type safety

2. **Styling**
   - Use Tailwind CSS utility classes
   - Follow the project's design system
   - Keep styles consistent across components

3. **Code Quality**
   - Run linter before committing changes
   - Follow React best practices
   - Write meaningful component and function names

## 🤝 Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
