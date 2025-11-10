// services/inventory-service/tracing.js
// ... (copy all 'require' lines) ...
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");

const JAEGER_COLLECTOR_URL = 'http://jaeger-collector.default.svc.cluster.local:4318/v1/traces';

const sdk = new opentelemetry.NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: JAEGER_COLLECTOR_URL,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
  serviceName: "inventory-service", // <-- CHANGE THIS NAME
});

sdk.start();
console.log("OpenTelemetry tracing initialized for inventory-service...");