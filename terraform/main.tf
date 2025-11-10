# --- Create Namespaces ---
resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = var.namespace_monitoring
  }
}

resource "kubernetes_namespace" "app" {
  metadata {
    name = "app"
  }
}

# --- Install kube-prometheus-stack (Prometheus + Grafana + Alertmanager) ---
resource "helm_release" "monitoring_stack" {
  name       = "monitoring"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name

  values = [
    file("${path.module}/values-monitoring.yaml")
  ]

  depends_on = [kubernetes_namespace.monitoring]

  
}
