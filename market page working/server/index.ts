// Load environment variables from .env.local (fallback to default .env if needed)
import dotenv from "dotenv";
import path from "path";
const envLocalPath = path.resolve(process.cwd(), ".env.local");
const envDefaultPath = path.resolve(process.cwd(), ".env");
const loaded = dotenv.config({ path: envLocalPath });
if (loaded.error) {
  dotenv.config({ path: envDefaultPath });
}
if (process.env.NODE_ENV === "development") {
  console.log(
    `[env] Loaded env file: ${loaded.error ? envDefaultPath : envLocalPath}`
  );
}

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
      // Basic API logging without response body to avoid security issues
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      // Only log response size in production, not full content
      if (capturedJsonResponse && process.env.NODE_ENV === 'development') {
        const responseStr = JSON.stringify(capturedJsonResponse);
        logLine += ` :: ${responseStr.length > 100 ? responseStr.slice(0, 97) + "..." : responseStr}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Enhanced error logging for production debugging
    console.error(`Error ${status} on ${req.method} ${req.url}:`, {
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
    });

    // Send user-friendly error response (hide stack traces in production)
    res.status(status).json({ 
      message: status >= 500 ? "Internal server error. Please try again." : message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
