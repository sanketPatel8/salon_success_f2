import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { sessionConfig, setupSimpleAuth } from "./simple-auth";
import { setupStripeWebhooks } from "./stripe-webhooks";

console.log("Loaded DATABASE_URL:", process.env.DATABASE_URL);

const app = express();

// STEP 1: Setup Stripe webhooks FIRST (before any middleware)
// This must come before express.json() because Stripe needs raw body
console.log('🔧 Step 1: Setting up Stripe webhooks...');
setupStripeWebhooks(app);

// Test endpoint for debugging
app.get('/api/stripe/webhook-test', (req, res) => {
  console.log('✅ Test endpoint hit!');
  res.json({ message: 'Webhook endpoint is accessible!', timestamp: new Date().toISOString() });
});

// STEP 2: Setup body parsing for all other routes
console.log('🔧 Step 2: Setting up body parsing...');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// STEP 3: Setup session management (skip for webhook routes)
console.log('🔧 Step 3: Setting up session management...');
app.use((req, res, next) => {
  // Skip session for webhook endpoints - Stripe doesn't send cookies
  if (req.path.startsWith('/api/stripe/webhook')) {
    return next();
  }
  return sessionConfig(req, res, next);
});

// Debug middleware to track all requests
app.use((req, res, next) => {
  const sessionInfo = req.path.startsWith('/api/stripe/webhook') 
    ? 'N/A (webhook)' 
    : `Session ID: ${req.sessionID || 'N/A'}, User ID: ${req.session?.userId || 'N/A'}`;
  console.log(`${req.method} ${req.url} - ${sessionInfo}`);
  next();
});

// STEP 4: Setup authentication routes
console.log('🔧 Step 4: Setting up authentication...');
setupSimpleAuth(app);

// Request logging middleware
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
  console.log('🔧 Step 5: Registering application routes...');
  const server = await registerRoutes(app);

  // Error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (res.headersSent) {
      return next(err);
    }

    res.status(status).json({ message });
  });

  // STEP 6: Setup Vite/Static files LAST (this is the catch-all)
  console.log('🔧 Step 6: Setting up Vite/static files...');
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT) || 8080;
  const host = process.env.HOST;

  server.listen(port, host, () => {
    console.log('\n' + '='.repeat(60));
    log(`🚀 Server running on http://${host}:${port}`);
    log(`📡 Stripe webhook endpoint: http://${host}:${port}/api/stripe/webhook`);
    log(`🧪 Test webhook route: http://${host}:${port}/api/stripe/webhook-test`);
    console.log('='.repeat(60) + '\n');
    
    console.log('💡 To test webhooks:');
    console.log(`   1. Run: stripe listen --forward-to http://${host}:${port}/api/stripe/webhook`);
    console.log(`   2. Trigger test: stripe trigger customer.subscription.created`);
    console.log('');
  });
})();