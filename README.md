# DevOps Takehome — Complete EKS demo

This repo contains Terraform to provision an EKS cluster, a small Node.js app container,
Kubernetes manifests (including HPA and Cluster Autoscaler), monitoring configs for
kube-prometheus-stack (Prometheus + Grafana + Alertmanager), and a GitHub Actions workflow
to build/push and deploy the app.

## What is included
- Terraform: VPC + EKS cluster + managed node group (in terraform/).
- App: simple Node.js Express app with Dockerfile (in app/).
- Kubernetes manifests: Deployment, Service, HPA, Cluster Autoscaler manifest (in k8s/).
- Monitoring: Helm values and Alertmanager config (in monitoring/).
- CI/CD: GitHub Actions workflow that builds, pushes to ECR, and deploys to EKS.

## Quick run (summary)
1. Configure AWS CLI: `aws configure` with credentials that can create resources.
2. Terraform:
   ```
   cd terraform
   terraform init
   terraform apply -auto-approve
   ```
3. Configure kubectl:
   ```
   aws eks update-kubeconfig --name <cluster_name> --region <region>
   kubectl get nodes
   ```
4. Create ECR repository:
   ```
   ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
   REGION=us-east-1
   REPO_NAME=hello
   ECR_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}"
   aws ecr create-repository --repository-name $REPO_NAME || true
   ```
5. Build and push image locally (or let GitHub Actions do this):
   ```
   aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com
   docker build -t hello-app:latest ./app
   docker tag hello-app:latest ${ECR_URI}:latest
   docker push ${ECR_URI}:latest
   ```
6. Deploy to cluster:
   - Replace `<ECR_REPOSITORY_URI>` in `k8s/deployment.yaml` with your ECR URI.
   - `kubectl apply -f k8s/`
   - `kubectl get svc` and wait for LoadBalancer hostname.

## Monitoring (Prometheus + Grafana)
1. Add helm repos:
   ```
   helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
   helm repo add grafana https://grafana.github.io/helm-charts
   helm repo update
   ```
2. Install kube-prometheus-stack with the provided values:
   ```
   kubectl create namespace monitoring || true
   helm upgrade --install kube-prom-stack prometheus-community/kube-prometheus-stack -n monitoring -f monitoring/values.yaml
   ```
3. (Optional) Configure Alertmanager:
   - Replace `<SLACK_WEBHOOK_URL>` in `monitoring/alertmanager-config.yaml` and create secret:
     ```
     kubectl create secret generic alertmanager-prometheus -n monitoring --from-file=alertmanager.yaml=monitoring/alertmanager-config.yaml
     ```
   - Patch the helm release or values to use this secret (chart docs).

4. Access Grafana:
   ```
   kubectl port-forward -n monitoring svc/kube-prom-stack-grafana 3000:80
   # Open http://localhost:3000 (admin/prom-operator by default)
   ```

## Autoscaling
- Kubernetes HPA is included in `k8s/hpa.yaml` (scales pods based on CPU).
- Cluster Autoscaler manifest `k8s/cluster-autoscaler-deployment.yaml` is provided; you should:
  - Create a Kubernetes ServiceAccount and IAM role for the autoscaler (or use kube2iam/IRSA).
  - Configure autoscaler flags for your node group discovery (ASG tags or managed node group names).
  - For EKS Managed Node Groups you can use: `--node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled` and tag your ASG accordingly.

## GitHub Actions
- Add repository secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `ECR_REPO`, `EKS_CLUSTER_NAME`.
- Push to `main` to trigger the workflow.

## Cleanup
- `kubectl delete -f k8s/`
- `helm uninstall kube-prom-stack -n monitoring`
- `terraform destroy -auto-approve` in terraform/

## Notes
- Replace placeholder values (ECR URI, Slack webhook) with your real values.
- For production readiness, enable OIDC for GitHub Actions, tighten IAM policies, and configure secure secrets management.
