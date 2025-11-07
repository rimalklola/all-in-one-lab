output "grafana_url" {
  value = "http://localhost:30000"
}

output "prometheus_url" {
  value = "http://localhost:30090"
}

output "alertmanager_url" {
  value = "http://localhost:30093"
}

output "namespace_monitoring" {
  value = kubernetes_namespace.monitoring.metadata[0].name
}
