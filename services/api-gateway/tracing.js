// services/api-gateway/tracing.js
const opentelemetry = require("@opentelemetry/sdk-node");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");

// The internal Kubernetes address for the new Jaeger collector
const JAEGER_COLLECTOR_URL = 'http://jaeger-collector.default.svc.cluster.local:4318/v1/traces';

const sdk = new opentelemetry.NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: JAEGER_COLLECTOR_URL,
  }),
  instrumentations: [getNodeAutoInstrumentations()],
  serviceName: "api-gateway", // This name will appear in Jaeger
});

sdk.start();
console.log("OpenTelemetry tracing initialized for api-gateway...");