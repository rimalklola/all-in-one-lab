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

resource "helm_release" "loki_stack" {
  name       = "loki"
  repository = "https://grafana.github.io/helm-charts" # <-- This is the fix
  chart      = "loki-stack"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name

  # Wait for the prometheus stack to be ready first
  depends_on = [helm_release.monitoring_stack]
}

resource "helm_release" "jaeger" {
  name       = "jaeger-operator"
  repository = "https://jaegertracing.github.io/helm-charts"
  chart      = "jaeger-operator"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name

  set = [
    {
      name  = "jaeger.create"
      value = "true"
    },
    {
      name  = "jaeger.spec.allInOne.image"
      value = "jaegertracing/all-in-one:latest"
    },
    # --- ADD THIS BLOCK ---
    {
      name  = "admissionWebhook.certManager.enabled"
      value = "false"
    }
    # ---------------------
  ]
}