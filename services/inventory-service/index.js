// services/inventory-service/index.js

const express = require('express');
const app = express();
const PORT = 8081;

// 1. IMPORT PROM-CLIENT
const promClient = require('prom-client');

// === METRICS DEFINITIONS ===

// 2. CREATE A REGISTRY
// This is where all metrics are stored.
const register = new promClient.Registry();

// 3. COLLECT DEFAULT METRICS
// This collects things like Node.js event loop lag, heap usage, etc.
promClient.collectDefaultMetrics({ register });

// 4. DEFINE YOUR CUSTOM METRICS (as required by the lab [cite: 58])

// COUNTER: For tracking total requests
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['service', 'method', 'route', 'code'],
});

// GAUGE: For tracking the current stock level
const inventoryStockGauge = new promClient.Gauge({
  name: 'inventory_stock_level',
  help: 'Current stock level of an item',
  labelNames: ['service', 'item'],
});

// HISTOGRAM: For measuring request latency
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['service', 'method', 'route', 'code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5] // Buckets for latency
});

// Register all custom metrics
register.registerMetric(httpRequestsTotal);
register.registerMetric(inventoryStockGauge);
register.registerMetric(httpRequestDuration);

// === END METRICS DEFINITIONS ===


// Mock database
const inventory = {
  'widget': { stock: 100, name: 'A high-quality widget' },
  'gadget': { stock: 50, name: 'A shiny new gadget' }
};
// Set initial gauge values
inventoryStockGauge.set({ service: 'inventory-service', item: 'widget' }, 100);
inventoryStockGauge.set({ service: 'inventory-service', item: 'gadget' }, 50);


/**
 * @route GET /health
 * @description A simple health check endpoint.
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'up' });
});

/**
 * @route GET /inventory/:item
 * @description Gets the stock level for a specific item.
 * NOW WITH METRICS!
 */
app.get('/inventory/:item', (req, res) => {
  // 5. START LATENCY TIMER
  const end = httpRequestDuration.startTimer();

  const item = req.params.item;
  const itemData = inventory[item];

  if (itemData) {
    res.status(200).json(itemData);
    // 6. INCREMENT COUNTER & OBSERVE LATENCY
    httpRequestsTotal.inc({ service: 'inventory-service', method: 'GET', route: '/inventory/:item', code: 200 });
    end({ service: 'inventory-service', method: 'GET', route: '/inventory/:item', code: 200 });
  } else {
    res.status(404).json({ error: 'Item not found' });
    // 6. INCREMENT COUNTER & OBSERVE LATENCY (for errors)
    httpRequestsTotal.inc({ service: 'inventory-service', method: 'GET', route: '/inventory/:item', code: 404 });
    end({ service: 'inventory-service', method: 'GET', route: '/inventory/:item', code: 404 });
  }
});

/**
 * @route GET /metrics
 * @description Exposes all collected metrics for Prometheus to scrape [cite: 66]
 */
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

app.listen(PORT, () => {
  console.log(`Inventory-service listening on http://localhost:${PORT}`);
});                                                                                                        