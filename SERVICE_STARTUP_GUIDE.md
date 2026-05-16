# Service Startup Guide - Agentic Orchestrator

Complete guide to run all services in the correct order.

## 🎯 Service Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Port 3000)                      │
│                    Next.js 15 + React 19                     │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                  API Gateway (Port 8000)                     │
│                    NGINX + Rate Limiting                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Backend Services                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Identity    │  │ Agent Registry│  │ Workflow     │     │
│  │  Port 8001   │  │  Port 8002    │  │ Port 8003    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Infrastructure                            │
│  PostgreSQL (5432) | Redis (6379) | Kafka (9092)           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites

### Required Software
- **Node.js**: 20.x or higher
- **Python**: 3.11 or higher
- **Docker**: 24.x or higher (for infrastructure)
- **Docker Compose**: 2.x or higher

### Check Versions
```bash
node --version    # Should be v20.x or higher
python --version  # Should be 3.11 or higher
docker --version  # Should be 24.x or higher
```

---

## 🚀 Quick Start (Development Mode)

### Option 1: Frontend Only (With Mock Data)

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies (if not done)
npm install

# 3. Start development server
npm run dev
```

**Frontend will run on**: `http://localhost:3000`

**Features Available**:
- ✅ Complete UI with mock data
- ✅ All components functional
- ✅ No backend required
- ✅ Perfect for UI development

---

### Option 2: Full Stack (All Services)

#### Step 1: Start Infrastructure

```bash
# Navigate to infrastructure directory
cd infrastructure/docker

# Start all infrastructure services
docker-compose -f docker-compose.dev.yml up -d

# Verify services are running
docker ps
```

**Services Started**:
- PostgreSQL (Port 5432)
- Redis (Port 6379)
- Kafka (Port 9092)
- Zookeeper (Port 2181)
- Elasticsearch (Port 9200)

#### Step 2: Start Backend Services

**Terminal 1 - Identity Service**:
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

# Run database migrations
alembic upgrade head

# Start service
uvicorn src.api.main:app --reload --port 8001
```

**Identity Service**: `http://localhost:8001`

**Terminal 2 - Agent Registry Service**:
```bash
cd services/agent-registry

# Install dependencies
go mod download

# Start service
go run cmd/server/main.go
```

**Agent Registry**: `http://localhost:8002`

**Terminal 3 - Workflow Orchestrator**:
```bash
cd services/workflow-orchestrator

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start service
uvicorn src.api.main:app --reload --port 8003
```

**Workflow Orchestrator**: `http://localhost:8003`

#### Step 3: Start Frontend

**Terminal 4 - Frontend**:
```bash
cd frontend

# Install dependencies (if not done)
npm install

# Start development server
npm run dev
```

**Frontend**: `http://localhost:3000`

---

## 🔍 Service Details

### 1. Frontend (Port 3000)

**Technology**: Next.js 15 + React 19

**Start Command**:
```bash
cd frontend
npm run dev
```

**Health Check**:
```bash
curl http://localhost:3000
```

**Features**:
- Landing page
- Dashboard (with mock data)
- Agent registry
- Vulnerability explorer
- Workflow builder
- Real-time updates

---

### 2. Identity Service (Port 8001)

**Technology**: Python FastAPI

**Start Command**:
```bash
cd services/identity-service
venv\Scripts\activate  # Windows
uvicorn src.api.main:app --reload --port 8001
```

**Health Check**:
```bash
curl http://localhost:8001/health
```

**API Endpoints**:
- `GET /health` - Health check
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration
- `GET /api/v1/users` - List users
- `GET /api/v1/roles` - List roles

**Database**: PostgreSQL (identity_db)

---

### 3. Agent Registry Service (Port 8002)

**Technology**: Go

**Start Command**:
```bash
cd services/agent-registry
go run cmd/server/main.go
```

**Health Check**:
```bash
curl http://localhost:8002/health
```

**API Endpoints**:
- `GET /health` - Health check
- `POST /api/v1/agents/register` - Register agent
- `GET /api/v1/agents` - List agents
- `GET /api/v1/agents/{id}` - Get agent details
- `POST /api/v1/agents/{id}/heartbeat` - Agent heartbeat

**Database**: PostgreSQL (agent_registry_db)

---

### 4. Workflow Orchestrator (Port 8003)

**Technology**: Python FastAPI

**Start Command**:
```bash
cd services/workflow-orchestrator
venv\Scripts\activate  # Windows
uvicorn src.api.main:app --reload --port 8003
```

**Health Check**:
```bash
curl http://localhost:8003/health
```

**API Endpoints**:
- `GET /health` - Health check
- `POST /api/v1/workflows` - Create workflow
- `GET /api/v1/workflows` - List workflows
- `POST /api/v1/workflows/{id}/execute` - Execute workflow
- `GET /api/v1/workflows/runs/{id}` - Get workflow run

**Database**: PostgreSQL (workflow_db)

---

## 🗄️ Infrastructure Services

### PostgreSQL (Port 5432)

**Connection String**:
```
postgresql://user:password@localhost:5432/database_name
```

**Databases**:
- `identity_db` - User authentication
- `agent_registry_db` - Agent management
- `workflow_db` - Workflow execution
- `vulnerability_db` - Vulnerability data

**Access**:
```bash
# Using psql
psql -h localhost -U user -d identity_db

# Using Docker
docker exec -it postgres psql -U user -d identity_db
```

---

### Redis (Port 6379)

**Connection String**:
```
redis://localhost:6379/0
```

**Usage**:
- Session storage
- Cache
- Rate limiting
- Pub/Sub

**Access**:
```bash
# Using redis-cli
redis-cli

# Using Docker
docker exec -it redis redis-cli
```

---

### Kafka (Port 9092)

**Bootstrap Servers**:
```
localhost:9092
```

**Topics**:
- `vulnerability.detected`
- `vulnerability.normalized`
- `remediation.plan.created`
- `agent.execution.started`
- `workflow.completed`

**Access**:
```bash
# List topics
docker exec -it kafka kafka-topics.sh --list --bootstrap-server localhost:9092

# Create topic
docker exec -it kafka kafka-topics.sh --create --topic test --bootstrap-server localhost:9092

# Consume messages
docker exec -it kafka kafka-console-consumer.sh --topic test --from-beginning --bootstrap-server localhost:9092
```

---

### Elasticsearch (Port 9200)

**URL**: `http://localhost:9200`

**Usage**:
- Vulnerability search
- Log aggregation
- Analytics

**Access**:
```bash
# Health check
curl http://localhost:9200/_cluster/health

# List indices
curl http://localhost:9200/_cat/indices
```

---

## 🧪 Testing Services

### Test Frontend
```bash
# Open browser
http://localhost:3000

# Should see landing page
# Navigate to dashboard to see mock data
```

### Test Identity Service
```bash
# Health check
curl http://localhost:8001/health

# Register user
curl -X POST http://localhost:8001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","full_name":"Test User"}'

# Login
curl -X POST http://localhost:8001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

### Test Agent Registry
```bash
# Health check
curl http://localhost:8002/health

# List agents
curl http://localhost:8002/api/v1/agents
```

### Test Workflow Orchestrator
```bash
# Health check
curl http://localhost:8003/health

# List workflows
curl http://localhost:8003/api/v1/workflows
```

---

## 🛑 Stopping Services

### Stop Frontend
```bash
# Press Ctrl+C in the terminal running npm run dev
```

### Stop Backend Services
```bash
# Press Ctrl+C in each terminal running the services
```

### Stop Infrastructure
```bash
cd infrastructure/docker
docker-compose -f docker-compose.dev.yml down

# To remove volumes (data will be lost)
docker-compose -f docker-compose.dev.yml down -v
```

---

## 🔧 Troubleshooting

### Port Already in Use

**Problem**: Port 3000 is already in use

**Solution**:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### Database Connection Error

**Problem**: Cannot connect to PostgreSQL

**Solution**:
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart PostgreSQL
docker restart postgres

# Check logs
docker logs postgres
```

### Module Not Found

**Problem**: Python module not found

**Solution**:
```bash
# Ensure virtual environment is activated
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux

# Reinstall dependencies
pip install -r requirements.txt
```

---

## 📊 Service Status Dashboard

Create a simple script to check all services:

```bash
#!/bin/bash
# check-services.sh

echo "Checking Services..."
echo ""

# Frontend
echo "Frontend (3000):"
curl -s http://localhost:3000 > /dev/null && echo "✅ Running" || echo "❌ Not running"

# Identity Service
echo "Identity Service (8001):"
curl -s http://localhost:8001/health > /dev/null && echo "✅ Running" || echo "❌ Not running"

# Agent Registry
echo "Agent Registry (8002):"
curl -s http://localhost:8002/health > /dev/null && echo "✅ Running" || echo "❌ Not running"

# Workflow Orchestrator
echo "Workflow Orchestrator (8003):"
curl -s http://localhost:8003/health > /dev/null && echo "✅ Running" || echo "❌ Not running"

# PostgreSQL
echo "PostgreSQL (5432):"
docker ps | grep postgres > /dev/null && echo "✅ Running" || echo "❌ Not running"

# Redis
echo "Redis (6379):"
docker ps | grep redis > /dev/null && echo "✅ Running" || echo "❌ Not running"

# Kafka
echo "Kafka (9092):"
docker ps | grep kafka > /dev/null && echo "✅ Running" || echo "❌ Not running"
```

---

## 🎯 Development Workflow

### Day-to-Day Development

1. **Start Infrastructure** (once per day):
   ```bash
   cd infrastructure/docker
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Start Services** (as needed):
   - Frontend: Always
   - Backend: Only when testing integrations

3. **Develop**:
   - Frontend changes: Hot reload automatic
   - Backend changes: Restart service

4. **Stop** (end of day):
   ```bash
   # Stop services: Ctrl+C
   # Stop infrastructure: docker-compose down
   ```

---

## 📚 Additional Resources

- **Architecture**: `docs/architecture/SYSTEM_ARCHITECTURE.md`
- **Project Structure**: `PROJECT_STRUCTURE.md`
- **Getting Started**: `GETTING_STARTED.md`
- **Frontend Guide**: `frontend/README.md`
- **Mock Data**: `mock-data/README.md`

---

**Last Updated**: 2026-05-14
**Version**: 1.0.0