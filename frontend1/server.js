const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;
const hostname = process.env.HOSTNAME || 'localhost';

console.log(`Starting Next.js server in ${dev ? 'development' : 'production'} mode`);
console.log(`Port: ${port}, Hostname: ${hostname}`);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      // Parse the URL
      const parsedUrl = parse(req.url, true);
      const { pathname, query } = parsedUrl;

      // Add security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      }

      // Handle health check endpoint
      if (pathname === '/health') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: process.env.NODE_ENV,
          version: process.env.npm_package_version || '1.0.0'
        }));
        return;
      }

      // Handle API proxy if needed
      if (pathname.startsWith('/api/') && !process.env.NEXT_PUBLIC_API_URL.includes('localhost')) {
        // In production, redirect API calls to the actual API server
        const apiUrl = process.env.NEXT_PUBLIC_API_URL + pathname;
        console.log(`Proxying API request to: ${apiUrl}`);
        // You might want to implement actual proxy logic here
      }
      
      // Let Next.js handle the request
      await handle(req, res, parsedUrl);

    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      
      // Send appropriate error response
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        timestamp: new Date().toISOString()
      }));
    }
  });

  // Error handling for the server
  server.on('error', (err) => {
    console.error('Server error:', err);
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use`);
      process.exit(1);
    } else {
      console.error('Unexpected server error:', err);
      process.exit(1);
    }
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  });

  // Start the server
  server.listen(port, hostname, (err) => {
    if (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Health check available at: http://${hostname}:${port}/health`);
  });
}); 