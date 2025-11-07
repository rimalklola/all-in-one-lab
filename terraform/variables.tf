variable "kubeconfig_path" {
  description = "Path to your kubeconfig file"
  type        = string
  default     = "~/.kube/config"
}

variable "kube_context" {
  description = "Kubernetes context to use"
  type        = string
  default     = "kind-kind-kind"
}

variable "namespace_monitoring" {
  description = "Namespace for Prometheus/Grafana stack"
  type        = string
  default     = "monitoring"
}
