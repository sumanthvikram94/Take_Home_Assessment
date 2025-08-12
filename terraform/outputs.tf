output "cluster_name" {
  value = module.eks.cluster_id
}
output "kubeconfig_certificate_authority_data" {
  value = module.eks.cluster_certificate_authority_data
  sensitive = true
}
output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}
