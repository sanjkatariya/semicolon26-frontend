# Getting Started - Agentic Orchestrator

Complete guide to set up and run the Agentic Orchestrator platform locally and in production.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Running Services](#running-services)
4. [Production Deployment](#production-deployment)
5. [Configuration](#configuration)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

#### Development Environment
- **Node.js**: 20.x or higher
- **Python**: 3.11 or higher
- **Go**: 1.21 or higher
- **Docker**: 24.x or higher
- **Docker Compose**: 2.x or higher
- **Git**: Latest version

#### Production Environment
- **Kubernetes**: 1.28 or higher
- **Helm**: 3.12 or higher
- **kubectl**: Latest version
- **Terraform**: 1.6 or higher (for infrastructure)

#### Optional Tools
- **k9s**: Kubernetes CLI UI
- **Lens**: Kubernetes IDE
- **Postman**: API testing
- **pgAdmin**: PostgreSQL management

### System Requirements

#### Development
- **CPU**: 4+ cores
- **RAM**: 16GB minimum, 32GB recommended
- **Disk**: 50GB free space
- **OS**: Windows 10/11, macOS 12+, or Linux

#### Production (per node)
- **CPU**: 8+ cores
- **RAM**: 32GB minimum
- **Disk**: 100GB+ SSD
- **Network**: 1Gbps+

---

## Local Development Setup

### 1. Clone the Repository

```bash
# Clone the main repository
git clone https://github.com/your-org/agentic-orchestrator.git
cd agentic-orchestrator
```

### 2. Setup Infrastructure

```bash
# Start local infrastructure with Docker Compose
cd infrastructure/docker
docker-compose -f docker-compose.dev.yml up -d

# This starts:
# - PostgreSQL (port 5432)
# - Redis (port 6379)
# - Kafka (port 9092)
# - Zookeeper (port 2181)
# - Elasticsearch (port 9200)
# - Kibana (port 5601)
```

### 3. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your configuration
# NEXT_PUBLIC_API_URL=http://localhost:8000
# NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Start development server
npm run dev

# Frontend will be available at http://localhost:3000
```

### 4. Setup Identity Service

```bash
cd services/identity-service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# DATABASE_URL=postgresql://user:password@localhost:5432/identity_db
# REDIS_URL=redis://localhost:6379/0
# KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Run database migrations
alembic upgrade head

# Start the service
uvicorn src.api.main:app --reload --port 8001

# Service will be available at http://localhost:8001
```

### 5. Setup Agent Registry Service

```bash
cd services/agent-registry

# Install dependencies
go mod download

# Copy environment file
cp .env.example .env

# Edit .env with your configuration

# Run the service
go run cmd/server/main.go

# Service will be available at http://localhost:8002
```

### 6. Verify Setup

```bash
# Check frontend
curl http://localhost:3000

# Check identity service
curl http://localhost:8001/health

# Check agent registry
curl http://localhost:8002/health

# Check infrastructure
docker ps
```

---

## Running Services

### Start All Services

```bash
# Option 1: Using Docker Compose (recommended for development)
docker-compose up -d

# Option 2: Using individual commands
# Terminal 1: Frontend
cd frontend && npm run dev

# Terminal 2: Identity Service
cd services/identity-service && uvicorn src.api.main:app --reload

# Terminal 3: Agent Registry
cd services/agent-registry && go run cmd/server/main.go

# Terminal 4: Other services...
```

### Stop All Services

```bash
# Docker Compose
docker-compose down

# Or stop individual services with Ctrl+C
```

### View Logs

```bash
# Docker Compose logs
docker-compose logs -f [service-name]

# Individual service logs
# Check terminal output or log files
```

---

## Production Deployment

### 1. Prepare Infrastructure

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Plan infrastructure changes
terraform plan -var-file=environments/production.tfvars

# Apply infrastructure
terraform apply -var-file=environments/production.tfvars

# This creates:
# - VPC and networking
# - EKS/GKE/AKS cluster
# - RDS PostgreSQL
# - ElastiCache Redis
# - MSK Kafka
# - Elasticsearch Service
```

### 2. Setup Kubernetes

```bash
# Get cluster credentials
# AWS:
aws eks update-kubeconfig --name agentic-orchestrator --region us-east-1

# GCP:
gcloud container clusters get-credentials agentic-orchestrator --region us-central1

# Azure:
az aks get-credentials --resource-group agentic-orchestrator --name agentic-orchestrator

# Verify connection
kubectl cluster-info
kubectl get nodes
```

### 3. Install Istio Service Mesh

```bash
# Download Istio
curl -L https://istio.io/downloadIstio | sh -
cd istio-*

# Install Istio
istioctl install --set profile=production -y

# Enable automatic sidecar injection
kubectl label namespace default istio-injection=enabled
```

### 4. Deploy with Helm

```bash
cd infrastructure/helm

# Add Helm repositories
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install the platform
helm install agentic-orchestrator ./agentic-orchestrator \
  --namespace security-platform \
  --create-namespace \
  --values values.production.yaml

# Verify deployment
kubectl get pods -n security-platform
kubectl get services -n security-platform
```

### 5. Setup Observability

```bash
# Install Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace observability \
  --create-namespace

# Install Loki
helm install loki grafana/loki-stack \
  --namespace observability

# Install Tempo
helm install tempo grafana/tempo \
  --namespace observability

# Access Grafana
kubectl port-forward -n observability svc/prometheus-grafana 3000:80
# Open http://localhost:3000 (admin/prom-operator)
```

### 6. Configure DNS and Ingress

```bash
# Get ingress IP
kubectl get ingress -n security-platform

# Configure DNS records
# A record: agentic-orchestrator.io -> [INGRESS_IP]
# A record: api.agentic-orchestrator.io -> [INGRESS_IP]
# A record: *.agentic-orchestrator.io -> [INGRESS_IP]
```

### 7. Setup SSL/TLS

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer for Let's Encrypt
kubectl apply -f infrastructure/kubernetes/base/cert-manager/cluster-issuer.yaml

# Certificates will be automatically provisioned
```

---

## Configuration

### Environment Variables

#### Frontend (.env.local)
```env
# API Configuration
NEXT_PUBLIC_API_URL=https://api.agentic-orchestrator.io
NEXT_PUBLIC_WS_URL=wss://api.agentic-orchestrator.io

# Authentication
NEXTAUTH_URL=https://agentic-orchestrator.io
NEXTAUTH_SECRET=your-secret-key-here

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_DEBUG=false
```

#### Identity Service (.env)
```env
# Application
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# Database
DATABASE_URL=postgresql://user:password@postgres:5432/identity_db
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10

# Redis
REDIS_URL=redis://redis:6379/0
REDIS_MAX_CONNECTIONS=50

# Kafka
KAFKA_BOOTSTRAP_SERVERS=kafka:9092
KAFKA_GROUP_ID=identity-service

# Security
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ALGORITHM=RS256
JWT_EXPIRATION_MINUTES=30
REFRESH_TOKEN_EXPIRATION_DAYS=7

# CORS
CORS_ORIGINS=https://agentic-orchestrator.io,https://api.agentic-orchestrator.io

# OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4317
OTEL_SERVICE_NAME=identity-service
```

#### Agent Registry (.env)
```env
# Application
ENVIRONMENT=production
PORT=8002

# Database
DATABASE_URL=postgresql://user:password@postgres:5432/agent_registry_db

# Redis
REDIS_URL=redis://redis:6379/1

# Kafka
KAFKA_BROKERS=kafka:9092
KAFKA_GROUP_ID=agent-registry

# Observability
OTEL_ENDPOINT=tempo:4317
```

### Kubernetes Secrets

```bash
# Create secrets
kubectl create secret generic identity-service-secrets \
  --from-literal=database-url='postgresql://...' \
  --from-literal=jwt-secret='...' \
  --namespace security-platform

kubectl create secret generic agent-registry-secrets \
  --from-literal=database-url='postgresql://...' \
  --namespace security-platform
```

---

## Troubleshooting

### Common Issues

#### 1. Frontend won't start

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev

# Check Node version
node --version  # Should be 20.x+
```

#### 2. Backend service connection errors

```bash
# Check if infrastructure is running
docker ps

# Check service logs
docker-compose logs [service-name]

# Verify database connection
psql -h localhost -U user -d identity_db

# Verify Redis connection
redis-cli ping
```

#### 3. Kubernetes pod not starting

```bash
# Check pod status
kubectl get pods -n security-platform

# Describe pod
kubectl describe pod [pod-name] -n security-platform

# Check logs
kubectl logs [pod-name] -n security-platform

# Check events
kubectl get events -n security-platform --sort-by='.lastTimestamp'
```

#### 4. Database migration errors

```bash
# Check current migration version
alembic current

# Rollback one version
alembic downgrade -1

# Upgrade to latest
alembic upgrade head

# Generate new migration
alembic revision --autogenerate -m "description"
```

#### 5. Service mesh issues

```bash
# Check Istio installation
istioctl verify-install

# Check sidecar injection
kubectl get pod [pod-name] -o jsonpath='{.spec.containers[*].name}'

# View Istio proxy logs
kubectl logs [pod-name] -c istio-proxy
```

### Health Checks

```bash
# Frontend
curl http://localhost:3000

# Identity Service
curl http://localhost:8001/health
curl http://localhost:8001/health/ready
curl http://localhost:8001/health/live

# Agent Registry
curl http://localhost:8002/health

# Infrastructure
# PostgreSQL
pg_isready -h localhost -p 5432

# Redis
redis-cli ping

# Kafka
kafka-topics.sh --list --bootstrap-server localhost:9092
```

### Performance Issues

```bash
# Check resource usage
kubectl top nodes
kubectl top pods -n security-platform

# Check HPA status
kubectl get hpa -n security-platform

# View metrics
kubectl port-forward -n observability svc/prometheus-grafana 3000:80
```

### Debugging Tips

1. **Enable Debug Logging**
   ```env
   DEBUG=true
   LOG_LEVEL=DEBUG
   ```

2. **Use Development Tools**
   - React DevTools
   - Redux DevTools
   - TanStack Query DevTools

3. **Check Network**
   ```bash
   # Test connectivity
   curl -v http://localhost:8001/health
   
   # Check DNS
   nslookup api.agentic-orchestrator.io
   ```

4. **Database Queries**
   ```sql
   -- Check connections
   SELECT * FROM pg_stat_activity;
   
   -- Check table sizes
   SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
   FROM pg_tables
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   ```

---

## Next Steps

After successful setup:

1. **Create First User**
   ```bash
   curl -X POST http://localhost:8001/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"SecurePass123!","full_name":"Admin User"}'
   ```

2. **Register First Agent**
   ```bash
   curl -X POST http://localhost:8002/api/v1/agents/register \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"name":"trivy","type":"scanner","version":"0.48.0"}'
   ```

3. **Create First Workflow**
   - Navigate to http://localhost:3000/workflows/builder
   - Use the visual editor to create a workflow

4. **Explore Documentation**
   - Architecture: `/docs/architecture/`
   - API Reference: `/docs/api/`
   - User Guide: `/docs/user-guide/`

---

## Support

### Documentation
- **Architecture**: [SYSTEM_ARCHITECTURE.md](docs/architecture/SYSTEM_ARCHITECTURE.md)
- **Project Structure**: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
- **Implementation**: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

### Community
- **GitHub Issues**: https://github.com/your-org/agentic-orchestrator/issues
- **Slack**: https://agentic-orchestrator.slack.com
- **Email**: support@agentic-orchestrator.io

### Resources
- **API Documentation**: https://api.agentic-orchestrator.io/docs
- **User Guide**: https://docs.agentic-orchestrator.io
- **Blog**: https://blog.agentic-orchestrator.io

---

**Happy Orchestrating! 🚀**