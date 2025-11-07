// services/order-service/index.js

const express = require('express');
const promClient = require('prom-client');
const axios = require('axios'); // To call the inventory-service
const opossum = require('opossum'); // The circuit breaker

const app = express();
app.use(express.json()); // To parse JSON bodies
const PORT = 8082; // We'll run this one on port 8082

// === METRICS DEFINITIONS ===
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom metrics for order-service
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['service', 'method', 'route', 'code'],
  registers: [register],
});

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['service', 'method', 'route', 'code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
});

// A new counter for orders
const ordersTotal = new promClient.Counter({
  name: 'orders_total',
  help: 'Total orders processed',
  labelNames: ['service', 'status'], // e.g., 'success', 'failed_inventory', 'failed_breaker'
  registers: [register],
});

// === END METRICS ===

// === HEALTH CHECK ===
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'up' });
});

// === METRICS ENDPOINT ===
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

// === SERVICE-TO-SERVICE CALL LOGIC ===

// 1. This is the function that will be "wrapped" by the circuit breaker.
// It tries to call the inventory-service.
async function checkInventory(item) {
  // We use the Kubernetes service name.
  // The service runs on port 80, so we don't need to specify it.
  const inventoryUrl = `http://inventory-service/inventory/${item}`;
  
  try {
    const response = await axios.get(inventoryUrl);
    return response.data; // e.g., { "stock": 100, "name": "widget" }
  } catch (error) {
    // If the service returns 404 (item not found) or 500, it's an error
    console.error(`Inventory check failed for ${item}:`, error.message);
    throw new Error(`Inventory-service call failed: ${error.message}`);
  }
}

// 2. Configure the circuit breaker
const circuitOptions = {
  timeout: 3000, // 3-second timeout
  errorThresholdPercentage: 50, // Open breaker if 50% of requests fail
  resetTimeout: 10000 // Wait 10s before trying to close the breaker
};
const breaker = new opossum(checkInventory, circuitOptions);

// 3. (Optional but recommended) Listen to breaker events
breaker.on('open', () => console.warn('BREAKER OPEN: Inventory-service is failing.'));
breaker.on('close', () => console.info('BREAKER CLOSED: Inventory-service is responding.'));
breaker.on('fallback', () => ordersTotal.inc({ service: 'order-service', status: 'failed_breaker' }));

// === BUSINESS LOGIC ENDPOINT ===

app.post('/order', async (req, res) => {
  const end = httpRequestDuration.startTimer();
  const { item, quantity } = req.body;

  if (!item || !quantity) {
    res.status(400).json({ error: 'Item and quantity are required' });
    httpRequestsTotal.inc({ service: 'order-service', method: 'POST', route: '/order', code: 400 });
    end({ service: 'order-service', method: 'POST', route: '/order', code: 400 });
    return;
  }

  try {
    // 4. "Fire" the breaker. Opossum will call checkInventory() for us.
    const inventory = await breaker.fire(item);

    // 5. Logic
    if (inventory.stock >= quantity) {
      // Success! (We're not actually updating the stock, just simulating)
      res.status(200).json({ message: 'Order successful', item, quantity });
      ordersTotal.inc({ service: 'order-service', status: 'success' });
      httpRequestsTotal.inc({ service: 'order-service', method: 'POST', route: '/order', code: 200 });
      end({ service: 'order-service', method: 'POST', route: '/order', code: 200 });
    } else {
      // Not enough stock
      res.status(400).json({ message: 'Insufficient stock', item, stock: inventory.stock });
      ordersTotal.inc({ service: 'order-service', status: 'failed_inventory' });
      httpRequestsTotal.inc({ service: 'order-service', method: 'POST', route: '/order', code: 400 });
      end({ service: 'order-service', method: 'POST', route: '/order', code: 400 });
    }
  } catch (error) {
    // 6. This 'catch' block runs if the breaker is OPEN or the call times out
    res.status(503).json({ error: 'Service unavailable: Inventory-service is down.' });
    httpRequestsTotal.inc({ service: 'order-service', method: 'POST', route: '/order', code: 503 });
    end({ service: 'order-service', method: 'POST', route: '/order', code: 503 });
  }
});


app.listen(PORT, () => {
  console.log(`Order-service listening on http://localhost:${PORT}`);
});