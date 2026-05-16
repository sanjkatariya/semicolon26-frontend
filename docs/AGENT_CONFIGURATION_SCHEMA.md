# Agent Configuration Schema & Dynamic Form System

## Overview

Yeh system agents ke liye dynamic configuration define karne ka best approach hai. Isme:
1. **Input Schema**: Agent ko kya inputs chahiye
2. **Output Schema**: Agent kya output dega
3. **Dynamic UI Generation**: Schema se automatic form generation
4. **Report Generation**: Output schema se automatic report UI

---

## Architecture Design

### 1. Agent Configuration Schema Structure

```typescript
interface AgentConfigSchema {
  agent_id: string;
  agent_name: string;
  version: string;
  
  // Input Configuration
  input_schema: {
    type: 'object';
    properties: {
      [key: string]: FieldSchema;
    };
    required: string[];
  };
  
  // Output Configuration
  output_schema: {
    type: 'object';
    properties: {
      [key: string]: FieldSchema;
    };
  };
  
  // UI Metadata
  ui_config: {
    input_layout: LayoutConfig;
    output_layout: LayoutConfig;
  };
}

interface FieldSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'file' | 'select' | 'multiselect';
  title: string;
  description?: string;
  default?: any;
  enum?: any[];  // For select/multiselect
  format?: string;  // e.g., 'email', 'url', 'date', 'json'
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    required?: boolean;
  };
  ui?: {
    widget?: 'input' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file' | 'json-editor';
    placeholder?: string;
    help_text?: string;
    icon?: string;
  };
}

interface LayoutConfig {
  sections: Array<{
    title: string;
    fields: string[];
    columns?: number;
  }>;
}
```

---

## Example: Trivy Scanner Agent Configuration

```json
{
  "agent_id": "trivy-scanner-v1",
  "agent_name": "Trivy Container Scanner",
  "version": "1.0.0",
  
  "input_schema": {
    "type": "object",
    "properties": {
      "image_name": {
        "type": "string",
        "title": "Container Image",
        "description": "Docker image to scan",
        "validation": {
          "required": true,
          "pattern": "^[a-zA-Z0-9._/-]+:[a-zA-Z0-9._-]+$"
        },
        "ui": {
          "widget": "input",
          "placeholder": "nginx:latest",
          "help_text": "Format: repository:tag",
          "icon": "🐳"
        }
      },
      "severity_levels": {
        "type": "multiselect",
        "title": "Severity Levels",
        "description": "Which severity levels to scan for",
        "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"],
        "default": ["CRITICAL", "HIGH"],
        "ui": {
          "widget": "multiselect",
          "help_text": "Select one or more severity levels",
          "icon": "⚠️"
        }
      },
      "scan_type": {
        "type": "select",
        "title": "Scan Type",
        "enum": ["os", "library", "all"],
        "default": "all",
        "ui": {
          "widget": "select",
          "icon": "🔍"
        }
      },
      "ignore_unfixed": {
        "type": "boolean",
        "title": "Ignore Unfixed Vulnerabilities",
        "default": false,
        "ui": {
          "widget": "checkbox",
          "help_text": "Skip vulnerabilities without fixes"
        }
      },
      "timeout": {
        "type": "number",
        "title": "Scan Timeout (seconds)",
        "default": 300,
        "validation": {
          "min": 30,
          "max": 3600
        },
        "ui": {
          "widget": "input",
          "icon": "⏱️"
        }
      }
    },
    "required": ["image_name", "severity_levels"]
  },
  
  "output_schema": {
    "type": "object",
    "properties": {
      "scan_id": {
        "type": "string",
        "title": "Scan ID"
      },
      "image": {
        "type": "string",
        "title": "Scanned Image"
      },
      "scan_time": {
        "type": "string",
        "format": "datetime",
        "title": "Scan Timestamp"
      },
      "total_vulnerabilities": {
        "type": "number",
        "title": "Total Vulnerabilities",
        "ui": {
          "widget": "metric",
          "color": "red"
        }
      },
      "vulnerabilities_by_severity": {
        "type": "object",
        "title": "Vulnerabilities by Severity",
        "properties": {
          "CRITICAL": { "type": "number" },
          "HIGH": { "type": "number" },
          "MEDIUM": { "type": "number" },
          "LOW": { "type": "number" }
        },
        "ui": {
          "widget": "bar-chart",
          "colors": {
            "CRITICAL": "#ef4444",
            "HIGH": "#f97316",
            "MEDIUM": "#eab308",
            "LOW": "#3b82f6"
          }
        }
      },
      "vulnerabilities": {
        "type": "array",
        "title": "Vulnerability Details",
        "items": {
          "type": "object",
          "properties": {
            "cve_id": { "type": "string", "title": "CVE ID" },
            "severity": { "type": "string", "title": "Severity" },
            "package": { "type": "string", "title": "Package" },
            "installed_version": { "type": "string", "title": "Installed" },
            "fixed_version": { "type": "string", "title": "Fixed In" },
            "description": { "type": "string", "title": "Description" }
          }
        },
        "ui": {
          "widget": "data-table",
          "columns": ["cve_id", "severity", "package", "installed_version", "fixed_version"],
          "sortable": true,
          "filterable": true
        }
      },
      "scan_duration": {
        "type": "number",
        "title": "Scan Duration (seconds)",
        "ui": {
          "widget": "metric",
          "icon": "⏱️"
        }
      },
      "status": {
        "type": "string",
        "title": "Scan Status",
        "enum": ["success", "failed", "partial"],
        "ui": {
          "widget": "badge",
          "colors": {
            "success": "green",
            "failed": "red",
            "partial": "yellow"
          }
        }
      }
    }
  },
  
  "ui_config": {
    "input_layout": {
      "sections": [
        {
          "title": "Target Configuration",
          "fields": ["image_name", "scan_type"],
          "columns": 2
        },
        {
          "title": "Scan Options",
          "fields": ["severity_levels", "ignore_unfixed", "timeout"],
          "columns": 1
        }
      ]
    },
    "output_layout": {
      "sections": [
        {
          "title": "Scan Summary",
          "fields": ["scan_id", "image", "scan_time", "status", "scan_duration"],
          "columns": 3
        },
        {
          "title": "Vulnerability Overview",
          "fields": ["total_vulnerabilities", "vulnerabilities_by_severity"],
          "columns": 2
        },
        {
          "title": "Detailed Results",
          "fields": ["vulnerabilities"],
          "columns": 1
        }
      ]
    }
  }
}
```

---

## Implementation Strategy

### 1. Database Schema

```sql
-- Agent Configuration Table
CREATE TABLE agent_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(255) UNIQUE NOT NULL,
    agent_name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    input_schema JSONB NOT NULL,
    output_schema JSONB NOT NULL,
    ui_config JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Agent Execution Results Table
CREATE TABLE agent_execution_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL,
    agent_id VARCHAR(255) NOT NULL,
    execution_id UUID NOT NULL,
    input_data JSONB NOT NULL,
    output_data JSONB NOT NULL,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    error_message TEXT,
    FOREIGN KEY (agent_id) REFERENCES agent_configurations(agent_id)
);

-- Indexes
CREATE INDEX idx_agent_config_agent_id ON agent_configurations(agent_id);
CREATE INDEX idx_execution_workflow_id ON agent_execution_results(workflow_id);
CREATE INDEX idx_execution_agent_id ON agent_execution_results(agent_id);
```

### 2. Backend API Endpoints

```python
# FastAPI Backend

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any

router = APIRouter(prefix="/api/v1/agents")

class AgentConfigSchema(BaseModel):
    agent_id: str
    agent_name: str
    version: str
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    ui_config: Dict[str, Any]

@router.post("/configurations")
async def create_agent_configuration(config: AgentConfigSchema):
    """Save agent configuration schema"""
    # Validate schema
    # Save to database
    return {"status": "success", "agent_id": config.agent_id}

@router.get("/configurations/{agent_id}")
async def get_agent_configuration(agent_id: str):
    """Get agent configuration schema"""
    # Fetch from database
    return config

@router.get("/configurations/{agent_id}/input-form")
async def get_input_form_schema(agent_id: str):
    """Get dynamic form schema for agent input"""
    config = await get_agent_configuration(agent_id)
    return {
        "schema": config.input_schema,
        "ui_config": config.ui_config.input_layout
    }

@router.post("/execute")
async def execute_agent(
    agent_id: str,
    workflow_id: str,
    input_data: Dict[str, Any]
):
    """Execute agent with input data"""
    # Validate input against schema
    # Execute agent
    # Store results
    return {
        "execution_id": "...",
        "status": "running"
    }

@router.get("/results/{execution_id}")
async def get_execution_results(execution_id: str):
    """Get agent execution results with formatted output"""
    result = await fetch_result(execution_id)
    config = await get_agent_configuration(result.agent_id)
    
    return {
        "execution_id": execution_id,
        "agent_id": result.agent_id,
        "input_data": result.input_data,
        "output_data": result.output_data,
        "output_schema": config.output_schema,
        "ui_config": config.ui_config.output_layout
    }
```

### 3. Frontend Dynamic Form Component

```typescript
// components/DynamicAgentForm.tsx

import { useState } from 'react';

interface DynamicAgentFormProps {
  agentId: string;
  onSubmit: (data: any) => void;
}

export function DynamicAgentForm({ agentId, onSubmit }: DynamicAgentFormProps) {
  const [schema, setSchema] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    // Fetch agent configuration
    fetch(`/api/v1/agents/configurations/${agentId}/input-form`)
      .then(res => res.json())
      .then(data => setSchema(data));
  }, [agentId]);

  const renderField = (fieldName: string, fieldSchema: any) => {
    const { type, title, ui, validation } = fieldSchema;

    switch (ui?.widget || type) {
      case 'input':
        return (
          <input
            type="text"
            value={formData[fieldName] || ''}
            onChange={(e) => setFormData({ ...formData, [fieldName]: e.target.value })}
            placeholder={ui?.placeholder}
            required={validation?.required}
            className="w-full px-3 py-2 border rounded"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={formData[fieldName] || ''}
            onChange={(e) => setFormData({ ...formData, [fieldName]: e.target.value })}
            placeholder={ui?.placeholder}
            className="w-full px-3 py-2 border rounded"
          />
        );

      case 'select':
        return (
          <select
            value={formData[fieldName] || fieldSchema.default}
            onChange={(e) => setFormData({ ...formData, [fieldName]: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          >
            {fieldSchema.enum?.map((option: string) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div className="space-y-2">
            {fieldSchema.enum?.map((option: string) => (
              <label key={option} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={(formData[fieldName] || []).includes(option)}
                  onChange={(e) => {
                    const current = formData[fieldName] || [];
                    const updated = e.target.checked
                      ? [...current, option]
                      : current.filter((v: string) => v !== option);
                    setFormData({ ...formData, [fieldName]: updated });
                  }}
                />
                {option}
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={formData[fieldName] || false}
            onChange={(e) => setFormData({ ...formData, [fieldName]: e.target.checked })}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={formData[fieldName] || fieldSchema.default || ''}
            onChange={(e) => setFormData({ ...formData, [fieldName]: parseInt(e.target.value) })}
            min={validation?.min}
            max={validation?.max}
            className="w-full px-3 py-2 border rounded"
          />
        );

      default:
        return <input type="text" className="w-full px-3 py-2 border rounded" />;
    }
  };

  if (!schema) return <div>Loading...</div>;

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
      {schema.ui_config.sections.map((section: any) => (
        <div key={section.title} className="mb-6">
          <h3 className="text-lg font-bold mb-4">{section.title}</h3>
          <div className={`grid grid-cols-${section.columns || 1} gap-4`}>
            {section.fields.map((fieldName: string) => {
              const fieldSchema = schema.schema.properties[fieldName];
              return (
                <div key={fieldName}>
                  <label className="block text-sm font-medium mb-2">
                    {fieldSchema.ui?.icon} {fieldSchema.title}
                  </label>
                  {renderField(fieldName, fieldSchema)}
                  {fieldSchema.ui?.help_text && (
                    <p className="text-xs text-gray-500 mt-1">{fieldSchema.ui.help_text}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <button type="submit" className="px-6 py-2 bg-blue-500 text-white rounded">
        Execute Agent
      </button>
    </form>
  );
}
```

### 4. Frontend Dynamic Report Component

```typescript
// components/DynamicAgentReport.tsx

export function DynamicAgentReport({ executionId }: { executionId: string }) {
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch(`/api/v1/agents/results/${executionId}`)
      .then(res => res.json())
      .then(data => setResult(data));
  }, [executionId]);

  const renderOutput = (fieldName: string, fieldSchema: any, value: any) => {
    const widget = fieldSchema.ui?.widget;

    switch (widget) {
      case 'metric':
        return (
          <div className="bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold" style={{ color: fieldSchema.ui?.color }}>
              {value}
            </div>
            <div className="text-sm text-gray-400">{fieldSchema.title}</div>
          </div>
        );

      case 'bar-chart':
        return (
          <div className="space-y-2">
            {Object.entries(value).map(([key, val]: [string, any]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-24 text-sm">{key}</span>
                <div className="flex-1 bg-gray-700 rounded-full h-6">
                  <div
                    className="h-6 rounded-full flex items-center justify-center text-xs text-white"
                    style={{
                      width: `${(val / Math.max(...Object.values(value))) * 100}%`,
                      backgroundColor: fieldSchema.ui?.colors?.[key]
                    }}
                  >
                    {val}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'data-table':
        return (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-800">
                  {fieldSchema.ui?.columns.map((col: string) => (
                    <th key={col} className="px-4 py-2 text-left">
                      {fieldSchema.items.properties[col].title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {value.map((row: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-700">
                    {fieldSchema.ui?.columns.map((col: string) => (
                      <td key={col} className="px-4 py-2">{row[col]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'badge':
        return (
          <span
            className="px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: fieldSchema.ui?.colors?.[value] || 'gray',
              color: 'white'
            }}
          >
            {value}
          </span>
        );

      default:
        return <div className="text-white">{JSON.stringify(value)}</div>;
    }
  };

  if (!result) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {result.ui_config.sections.map((section: any) => (
        <div key={section.title} className="bg-slate-900 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">{section.title}</h3>
          <div className={`grid grid-cols-${section.columns} gap-4`}>
            {section.fields.map((fieldName: string) => {
              const fieldSchema = result.output_schema.properties[fieldName];
              const value = result.output_data[fieldName];
              return (
                <div key={fieldName}>
                  {renderOutput(fieldName, fieldSchema, value)}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## Benefits of This Approach

### 1. **Flexibility**
- Agents can define their own input/output schemas
- No code changes needed for new agents
- Easy to update agent configurations

### 2. **Consistency**
- Standardized schema format
- Uniform UI generation
- Consistent validation

### 3. **Developer Experience**
- Simple JSON configuration
- Auto-generated forms
- Auto-generated reports

### 4. **User Experience**
- Dynamic, context-aware forms
- Beautiful, customized reports
- Type-safe inputs

### 5. **Maintainability**
- Schema-driven development
- Single source of truth
- Easy to test and validate

---

## Usage Flow

### Agent Registration
1. Developer creates agent configuration JSON
2. POST to `/api/v1/agents/configurations`
3. System validates and stores schema
4. Agent appears in UI with custom form

### Workflow Execution
1. User selects agent in workflow
2. System fetches agent configuration
3. Dynamic form renders based on input_schema
4. User fills form
5. System validates against schema
6. Agent executes with validated input

### Report Generation
1. Agent completes execution
2. System stores output_data
3. Frontend fetches result with output_schema
4. Dynamic report renders based on schema
5. User sees beautiful, customized report

---

## Best Practices

1. **Schema Versioning**: Include version in agent_id
2. **Validation**: Always validate input/output against schema
3. **Defaults**: Provide sensible defaults
4. **Help Text**: Add descriptions and help text
5. **Icons**: Use emojis or icons for better UX
6. **Error Handling**: Validate and show clear errors
7. **Testing**: Test schemas with sample data
8. **Documentation**: Document each field clearly

---

## Future Enhancements

1. **Conditional Fields**: Show/hide fields based on other values
2. **Field Dependencies**: Link field values
3. **Custom Validators**: Add custom validation functions
4. **Real-time Preview**: Show output preview while filling form
5. **Schema Marketplace**: Share schemas across teams
6. **AI-Generated Schemas**: Use AI to generate schemas from agent code
7. **Visual Schema Builder**: Drag-and-drop schema designer

---

**Last Updated**: 2026-05-15  
**Version**: 1.0.0  
**Author**: SecOps AI Team