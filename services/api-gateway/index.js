// services/api-gateway/index.js

const express = require('express');
const proxy = require('express-http-proxy');

const app = express();
const PORT = 8080; // This is a standard port for a gateway

// Proxy requests for the order service
app.use('/orders', proxy('http://order-service', {
  proxyReqPathResolver: req => `/order${req.url}` // Maps /orders -> /order
}));

// Proxy requests for the inventory service
app.use('/inventory', proxy('http://inventory-service', {
  proxyReqPathResolver: req => `/inventory${req.url}` // Maps /inventory -> /inventory
}));

// A simple health check for the gateway itself
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'up' });
});

app.listen(PORT, () => {
  console.log(`API-Gateway listening on http://localhost:${PORT}`);
});