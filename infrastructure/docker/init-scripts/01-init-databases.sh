#!/bin/bash
set -e

# Create multiple databases for microservices
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Identity Service Database
    CREATE DATABASE identity_db;
    GRANT ALL PRIVILEGES ON DATABASE identity_db TO $POSTGRES_USER;

    -- Agent Registry Database
    CREATE DATABASE agent_registry_db;
    GRANT ALL PRIVILEGES ON DATABASE agent_registry_db TO $POSTGRES_USER;

    -- Workflow Orchestrator Database
    CREATE DATABASE workflow_db;
    GRANT ALL PRIVILEGES ON DATABASE workflow_db TO $POSTGRES_USER;

    -- Vulnerability Service Database
    CREATE DATABASE vulnerability_db;
    GRANT ALL PRIVILEGES ON DATABASE vulnerability_db TO $POSTGRES_USER;

    -- Remediation Engine Database
    CREATE DATABASE remediation_db;
    GRANT ALL PRIVILEGES ON DATABASE remediation_db TO $POSTGRES_USER;

    -- Audit Logging Database
    CREATE DATABASE audit_db;
    GRANT ALL PRIVILEGES ON DATABASE audit_db TO $POSTGRES_USER;

    -- Compliance Engine Database
    CREATE DATABASE compliance_db;
    GRANT ALL PRIVILEGES ON DATABASE compliance_db TO $POSTGRES_USER;

    -- Notification Service Database
    CREATE DATABASE notification_db;
    GRANT ALL PRIVILEGES ON DATABASE notification_db TO $POSTGRES_USER;

    -- Git Integration Database
    CREATE DATABASE git_integration_db;
    GRANT ALL PRIVILEGES ON DATABASE git_integration_db TO $POSTGRES_USER;

    -- Policy Engine Database
    CREATE DATABASE policy_db;
    GRANT ALL PRIVILEGES ON DATABASE policy_db TO $POSTGRES_USER;
EOSQL

echo "✅ All databases created successfully!"

# Made with Bob
