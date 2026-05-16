# Docker Infrastructure Setup

Complete Docker Compose setup for the Agentic Orchestrator platform with all required infrastructure services.

## 📦 Services Included

### Core Infrastructure
- **PostgreSQL** (Port 5432) - Primary database with 10 separate databases for microservices
- **Redis** (Port 6379) - Cache and session store
- **Apache Kafka** (Port 9092) - Event streaming platform
- **Zookeeper** (Port 2181) - Kafka coordination

### Search & Storage
- **Elasticsearch** (Port 9200) - Vulnerability search and analytics
- **Neo4j** (Port 7474, 7687) - Dependency graph database
- **MinIO** (Port 9000, 9001) - Object storage for reports and artifacts

### Security
- **HashiCorp Vault** (Port 8200) - Secrets management

### Observability Stack
- **Prometheus** (Port 9090) - Metrics collection
- **Grafana** (Port 3001) - Visualization dashboards
- **Jaeger** (Port 16686) - Distributed tracing
- **Loki** (Port 3100) - Log aggregation
- **Promtail** - Log collection agent

### Development Tools
- **Kafka UI** (Port 8080) - Kafka management interface
- **Kibana** (Port 5601) - Elasticsearch visualization
- **RabbitMQ** (Port 5672, 15672) - Alternative message broker

## 🚀 Quick Start

### Start All Services

```bash
cd infrastructure/docker
docker-compose -f docker-compose.dev.yml up -d
```

### Start Specific Services

```bash
# Only databases
docker-compose -f docker-compose.dev.yml up -d postgres redis

# Only messaging
docker-compose -f docker-compose.dev.yml up -d kafka zookeeper

# Only observability
docker-compose -f docker-compose.dev.yml up -d prometheus grafana jaeger loki
```

### Stop All Services

```bash
docker-compose -f docker-compose.dev.yml down
```

### Stop and Remove Volumes (Clean Slate)

```bash
docker-compose -f docker-compose.dev.yml down -v
```

## 📊 Service Access URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| **Kafka UI** | http://localhost:8080 | - |
| **Grafana** | http://localhost:3001 | admin / agentic_admin |
| **Prometheus** | http://localhost:9090 | - |
| **Jaeger UI** | http://localhost:16686 | - |
| **Kibana** | http://localhost:5601 | - |
| **Neo4j Browser** | http://localhost:7474 | neo4j / agentic_neo4j_password |
| **MinIO Console** | http://localhost:9001 | agentic_minio / agentic_minio_password |
| **RabbitMQ Management** | http://localhost:15672 | agentic_user / agentic_password |
| **Vault UI** | http://localhost:8200 | Token: agentic-root-token |

## 🔐 Default Credentials

### PostgreSQL
```
Host: localhost
Port: 5432
User: agentic_user
Password: agentic_password
Databases:
  - agentic_orchestrator (main)
  - identity_db
  - agent_registry_db
  - workflow_db
  - vulnerability_db
  - remediation_db
  - audit_db
  - compliance_db
  - notification_db
  - git_integration_db
  - policy_db
```

### Redis
```
Host: localhost
Port: 6379
Password: agentic_redis_password
```

### Kafka
```
Bootstrap Servers: localhost:9092
Internal: kafka:9093
```

### Elasticsearch
```
Host: localhost
Port: 9200
Security: Disabled (dev mode)
```

### Neo4j
```
HTTP: http://localhost:7474
Bolt: bolt://localhost:7687
User: neo4j
Password: agentic_neo4j_password
```

### Vault
```
Address: http://localhost:8200
Root Token: agentic-root-token
```

## 🗄️ Database Initialization

The PostgreSQL container automatically creates all required databases on first startup using the init script:

```bash
infrastructure/docker/init-scripts/01-init-databases.sh
```

Databases created:
- `identity_db` - User authentication and authorization
- `agent_registry_db` - Agent registration and metadata
- `workflow_db` - Workflow definitions and executions
- `vulnerability_db` - Vulnerability data
- `remediation_db` - Remediation jobs and history
- `audit_db` - Audit logs and compliance
- `compliance_db` - Compliance policies and reports
- `notification_db` - Notification templates and history
- `git_integration_db` - Git repository integrations
- `policy_db` - Security policies

## 📈 Monitoring Setup

### Prometheus Targets

All microservices are configured to be scraped by Prometheus. See `prometheus/prometheus.yml` for the complete list.

Expected service endpoints:
- API Gateway: http://localhost:8000/metrics
- Identity Service: http://localhost:8001/metrics
- Agent Registry: http://localhost:8002/metrics
- Workflow Orchestrator: http://localhost:8003/metrics
- And more...

### Grafana Dashboards

Access Grafana at http://localhost:3001 with credentials:
- Username: `admin`
- Password: `agentic_admin`

Pre-configured data sources:
- Prometheus (metrics)
- Loki (logs)
- Jaeger (traces)

### Log Aggregation

Logs are collected by Promtail and sent to Loki. View logs in Grafana's Explore section.

## 🔧 Configuration Files

```
infrastructure/docker/
├── docker-compose.dev.yml          # Main compose file
├── init-scripts/
│   └── 01-init-databases.sh        # PostgreSQL initialization
├── prometheus/
│   └── prometheus.yml              # Prometheus configuration
├── loki/
│   └── loki-config.yml            # Loki configuration
├── promtail/
│   └── promtail-config.yml        # Promtail configuration
└── grafana/
    └── provisioning/               # Grafana provisioning (optional)
```

## 🐳 Docker Network

All services run on the `agentic-network` bridge network, allowing inter-service communication using service names.

Example connection strings from microservices:
```
postgres://agentic_user:agentic_password@postgres:5432/identity_db
redis://agentic_redis_password@redis:6379
kafka:9093
elasticsearch:9200
neo4j://neo4j:agentic_neo4j_password@neo4j:7687
```

## 💾 Data Persistence

All data is persisted in Docker volumes:

```bash
# List volumes
docker volume ls | grep agentic

# Inspect a volume
docker volume inspect agentic-orchestrator_postgres_data

# Backup a volume
docker run --rm -v agentic-orchestrator_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data

# Restore a volume
docker run --rm -v agentic-orchestrator_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /
```

## 🔍 Health Checks

All services include health checks. Check status:

```bash
# View all container health
docker-compose -f docker-compose.dev.yml ps

# Check specific service logs
docker-compose -f docker-compose.dev.yml logs -f postgres
docker-compose -f docker-compose.dev.yml logs -f kafka
docker-compose -f docker-compose.dev.yml logs -f prometheus
```

## 🚨 Troubleshooting

### PostgreSQL won't start
```bash
# Check logs
docker-compose -f docker-compose.dev.yml logs postgres

# Remove volume and restart
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d postgres
```

### Kafka connection issues
```bash
# Ensure Zookeeper is healthy first
docker-compose -f docker-compose.dev.yml ps zookeeper

# Check Kafka logs
docker-compose -f docker-compose.dev.yml logs kafka

# Restart Kafka
docker-compose -f docker-compose.dev.yml restart kafka
```

### Elasticsearch memory issues
```bash
# Increase Docker memory allocation to at least 4GB
# Or reduce ES memory in docker-compose.dev.yml:
# ES_JAVA_OPTS=-Xms256m -Xmx256m
```

### Port conflicts
```bash
# Check what's using a port
netstat -ano | findstr :5432  # Windows
lsof -i :5432                 # Linux/Mac

# Change port in docker-compose.dev.yml if needed
```

## 🔄 Service Dependencies

Start order for optimal initialization:

1. **Infrastructure Layer**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d postgres redis zookeeper
   ```

2. **Messaging Layer**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d kafka
   ```

3. **Search & Storage**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d elasticsearch neo4j minio
   ```

4. **Observability**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d prometheus loki jaeger
   docker-compose -f docker-compose.dev.yml up -d grafana promtail
   ```

5. **Development Tools**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d kafka-ui kibana
   ```

## 📝 Environment Variables

Create a `.env` file in the `infrastructure/docker` directory to override defaults:

```env
# PostgreSQL
POSTGRES_USER=custom_user
POSTGRES_PASSWORD=custom_password

# Redis
REDIS_PASSWORD=custom_redis_password

# Grafana
GF_SECURITY_ADMIN_PASSWORD=custom_grafana_password

# MinIO
MINIO_ROOT_USER=custom_minio_user
MINIO_ROOT_PASSWORD=custom_minio_password
```

## 🎯 Production Considerations

This setup is for **development only**. For production:

1. ✅ Use external managed services (RDS, ElastiCache, MSK)
2. ✅ Enable authentication on all services
3. ✅ Use secrets management (Vault, AWS Secrets Manager)
4. ✅ Configure proper resource limits
5. ✅ Set up backup strategies
6. ✅ Enable SSL/TLS
7. ✅ Configure proper networking and firewalls
8. ✅ Use Kubernetes for orchestration
9. ✅ Implement proper monitoring and alerting
10. ✅ Set up disaster recovery

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Kafka Docker Documentation](https://docs.confluent.io/platform/current/installation/docker/image-reference.html)
- [Prometheus Configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Grafana Documentation](https://grafana.com/docs/)

## 🆘 Support

For issues or questions:
1. Check service logs: `docker-compose logs <service-name>`
2. Verify health: `docker-compose ps`
3. Review configuration files
4. Consult service-specific documentation

---

**Status**: ✅ Ready for Development
**Last Updated**: 2026-05-14