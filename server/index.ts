import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";

// Load environment variables from .env.local first, then .env
dotenv.config({ path: '.env.local' });
dotenv.config();

// Debug environment variables
console.log('Environment check:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('POSTGRES_URL exists:', !!process.env.POSTGRES_URL);
if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 20) + '...');
}

const app = express();
const port = process.env.PORT || 5000;

// Configure CORS for production deployment
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? true  // Allow all origins in production (since frontend and backend are served together)
    : ['http://localhost:5173', 'http://localhost:3000'], // Development origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Register API routes FIRST - this is critical for hosted environments
    const server = await registerRoutes(app);
    
    // Add API route debugging middleware for production
    if (process.env.NODE_ENV === 'production') {
      app.use('/api/*', (req, res, next) => {
        console.log(`API route accessed: ${req.method} ${req.path}`);
        console.log('Request headers:', req.headers);
        next();
      });
    }

    // Global error handler - moved after route registration
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      console.error('Server error:', err);
      res.status(status).json({ message });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (process.env.NODE_ENV === "development") {
      await setupVite(app, server);
    } else {
      // Production static file serving
      const clientDistPath = path.join(process.cwd(), 'dist');
      console.log('Serving static files from:', clientDistPath);
      
      // Serve static files
      app.use(express.static(clientDistPath, {
        maxAge: '1d',
        setHeaders: (res, filePath) => {
          // Cache JavaScript and CSS files longer
          if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
          }
        }
      }));
      
      // Handle React Router routes - IMPORTANT: Only for non-API routes
      app.get('*', (req, res, next) => {
        // Skip API routes - let them be handled by the API handlers
        if (req.path.startsWith('/api/') || req.path === '/api') {
          console.log('API route detected, passing to next handler:', req.path);
          return next();
        }
        
        // Skip health check route
        if (req.path === '/health') {
          return next();
        }
        
        // For all other routes, serve the React app
        console.log('Frontend route, serving index.html for:', req.path);
        const indexPath = path.join(clientDistPath, 'index.html');
        res.sendFile(indexPath, (err) => {
          if (err) {
            console.error('Error serving index.html:', err);
            res.status(500).send('Error serving application');
          }
        });
      });
    }

    // Use PORT from environment (Render sets this automatically)
    const port = process.env.PORT || 5000;
    server.listen({
      port: Number(port),
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
