# Agent Configuration System - Implementation Guide

## Overview

Yeh guide aapko step-by-step batayega ki Agent Configuration System ko kaise use karein.

---

## 🎯 Quick Start

### 1. Demo Page Access

```
http://localhost:3000/agent-config-demo
```

Yeh page pe aap:
- Dynamic form generation dekh sakte ho
- Dynamic report rendering test kar sakte ho
- Different widgets ka demo dekh sakte ho

### 2. Components Usage

#### Dynamic Form Component

```tsx
import DynamicAgentForm from '@/components/DynamicAgentForm';

function MyPage() {
  const handleSubmit = (data: Record<string, any>) => {
    console.log('Form data:', data);
    // Execute agent with this data
  };

  return (
    <DynamicAgentForm
      agentId="trivy-scanner-v1"
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
    />
  );
}
```

#### Dynamic Report Component

```tsx
import DynamicAgentReport from '@/components/DynamicAgentReport';

function ResultsPage() {
  return (
    <DynamicAgentReport executionId="exec-trivy-001" />
  );
}
```

---

## 📁 File Structure

```
frontend/
├── src/
│   ├── types/
│   │   └── agent-config.ts              # TypeScript types
│   ├── components/
│   │   ├── DynamicAgentForm.tsx         # Form component (358 lines)
│   │   └── DynamicAgentReport.tsx       # Report component (339 lines)
│   ├── app/
│   │   ├── agent-config-demo/
│   │   │   └── page.tsx                 # Demo page
│   │   └── api/v1/agents/
│   │       ├── configurations/[agentId]/input-form/
│   │       │   └── route.ts             # Config API
│   │       └── results/[executionId]/
│   │           └── route.ts             # Results API
│   └── public/mock-data/
│       ├── agent-config-trivy.json      # Sample config (189 lines)
│       └── agent-execution-result-trivy.json  # Sample result (310 lines)
```

---

## 🔧 Creating New Agent Configuration

### Step 1: Create Configuration JSON

```json
{
  "agent_id": "your-agent-id",
  "agent_name": "Your Agent Name",
  "version": "1.0.0",
  "input_schema": {
    "type": "object",
    "properties": {
      "field_name": {
        "type": "string",
        "title": "Field Title",
        "validation": {
          "required": true
        },
        "ui": {
          "widget": "input",
          "placeholder": "Enter value",
          "icon": "🔍"
        }
      }
    }
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "result_field": {
        "type": "number",
        "title": "Result",
        "ui": {
          "widget": "metric",
          "color": "#3b82f6"
        }
      }
    }
  },
  "ui_config": {
    "input_layout": {
      "sections": [
        {
          "title": "Section Name",
          "fields": ["field_name"],
          "columns": 1
        }
      ]
    },
    "output_layout": {
      "sections": [
        {
          "title": "Results",
          "fields": ["result_field"],
          "columns": 1
        }
      ]
    }
  }
}
```

### Step 2: Save Configuration

```bash
# Save to public/mock-data/
frontend/public/mock-data/agent-config-your-agent.json
```

### Step 3: Register in API Route

```typescript
// frontend/src/app/api/v1/agents/configurations/[agentId]/input-form/route.ts

const configFiles: Record<string, string> = {
  'trivy-scanner-v1': 'agent-config-trivy.json',
  'your-agent-id': 'agent-config-your-agent.json',  // Add this
};
```

---

## 🎨 Available Input Widgets

### 1. Text Input
```json
{
  "type": "string",
  "ui": {
    "widget": "input",
    "placeholder": "Enter text"
  }
}
```

### 2. Number Input
```json
{
  "type": "number",
  "validation": {
    "min": 0,
    "max": 100
  },
  "ui": {
    "widget": "number"
  }
}
```

### 3. Select Dropdown
```json
{
  "type": "select",
  "enum": ["option1", "option2", "option3"],
  "ui": {
    "widget": "select"
  }
}
```

### 4. Multi-Select
```json
{
  "type": "multiselect",
  "enum": ["opt1", "opt2", "opt3"],
  "ui": {
    "widget": "multiselect"
  }
}
```

### 5. Checkbox
```json
{
  "type": "boolean",
  "ui": {
    "widget": "checkbox"
  }
}
```

### 6. Textarea
```json
{
  "type": "string",
  "ui": {
    "widget": "textarea"
  }
}
```

### 7. File Upload
```json
{
  "type": "file",
  "ui": {
    "widget": "file"
  }
}
```

### 8. JSON Editor
```json
{
  "type": "object",
  "ui": {
    "widget": "json-editor"
  }
}
```

---

## 📊 Available Output Widgets

### 1. Metric Card
```json
{
  "type": "number",
  "ui": {
    "widget": "metric",
    "icon": "🎯",
    "color": "#3b82f6"
  }
}
```

### 2. Bar Chart
```json
{
  "type": "object",
  "properties": {
    "label1": { "type": "number" },
    "label2": { "type": "number" }
  },
  "ui": {
    "widget": "bar-chart",
    "colors": {
      "label1": "#ef4444",
      "label2": "#3b82f6"
    }
  }
}
```

### 3. Data Table
```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "col1": { "type": "string", "title": "Column 1" },
      "col2": { "type": "string", "title": "Column 2" }
    }
  },
  "ui": {
    "widget": "data-table",
    "columns": ["col1", "col2"],
    "sortable": true,
    "filterable": true
  }
}
```

### 4. Status Badge
```json
{
  "type": "string",
  "enum": ["success", "failed", "pending"],
  "ui": {
    "widget": "badge",
    "colors": {
      "success": "green",
      "failed": "red",
      "pending": "yellow"
    }
  }
}
```

### 5. Pie Chart
```json
{
  "type": "object",
  "ui": {
    "widget": "pie-chart",
    "colors": {
      "segment1": "#ef4444",
      "segment2": "#3b82f6"
    }
  }
}
```

---

## 🔄 Complete Workflow

### 1. Agent Registration
```typescript
// User registers agent with configuration
POST /api/v1/agents/configurations
{
  "agent_id": "my-agent",
  "input_schema": {...},
  "output_schema": {...},
  "ui_config": {...}
}
```

### 2. Form Generation
```typescript
// Frontend fetches configuration
GET /api/v1/agents/configurations/my-agent/input-form

// DynamicAgentForm renders based on schema
<DynamicAgentForm agentId="my-agent" onSubmit={handleSubmit} />
```

### 3. Agent Execution
```typescript
// User fills form and submits
const formData = {
  field1: "value1",
  field2: 123
};

// Backend validates and executes
POST /api/v1/agents/execute
{
  "agent_id": "my-agent",
  "input_data": formData
}

// Returns execution_id
{ "execution_id": "exec-123" }
```

### 4. Report Generation
```typescript
// Frontend fetches results
GET /api/v1/agents/results/exec-123

// DynamicAgentReport renders based on output_schema
<DynamicAgentReport executionId="exec-123" />
```

---

## 🧪 Testing

### Run Demo
```bash
cd frontend
npm run dev
# Visit http://localhost:3000/agent-config-demo
```

### Test Form
1. Click "📝 Input Form" tab
2. Fill in the fields
3. Click "🚀 Execute Agent"
4. See validation in action

### Test Report
1. Click "📊 Execution Report" tab
2. See different widgets:
   - Metric cards
   - Bar charts
   - Data tables
   - Status badges

---

## 🎯 Best Practices

### 1. Schema Design
- ✅ Use descriptive field names
- ✅ Add help text for complex fields
- ✅ Set sensible defaults
- ✅ Use appropriate validation
- ✅ Group related fields in sections

### 2. Validation
- ✅ Mark required fields
- ✅ Set min/max for numbers
- ✅ Use regex patterns for strings
- ✅ Provide clear error messages

### 3. UI/UX
- ✅ Use icons for visual appeal
- ✅ Add placeholders as examples
- ✅ Group fields logically
- ✅ Use appropriate widgets
- ✅ Keep forms concise

### 4. Output Design
- ✅ Use metrics for key numbers
- ✅ Use charts for comparisons
- ✅ Use tables for detailed data
- ✅ Use badges for status
- ✅ Organize in logical sections

---

## 🚀 Production Deployment

### 1. Backend Setup
```python
# Implement actual API endpoints
# Store schemas in PostgreSQL
# Validate inputs against schemas
# Execute agents
# Store results
```

### 2. Frontend Updates
```typescript
// Replace mock API routes with real endpoints
// Add error handling
// Add loading states
// Add retry logic
```

### 3. Database
```sql
-- Create tables
CREATE TABLE agent_configurations (...);
CREATE TABLE agent_execution_results (...);
```

---

## 📚 Examples

### Example 1: Simple Scanner
```json
{
  "input_schema": {
    "properties": {
      "target": {
        "type": "string",
        "title": "Scan Target",
        "ui": { "widget": "input", "icon": "🎯" }
      }
    }
  },
  "output_schema": {
    "properties": {
      "issues_found": {
        "type": "number",
        "ui": { "widget": "metric", "color": "#ef4444" }
      }
    }
  }
}
```

### Example 2: Complex Analyzer
```json
{
  "input_schema": {
    "properties": {
      "repo_url": { "type": "string" },
      "branch": { "type": "string" },
      "scan_types": { "type": "multiselect", "enum": ["security", "quality", "performance"] }
    }
  },
  "output_schema": {
    "properties": {
      "score": { "type": "number", "ui": { "widget": "metric" } },
      "issues_by_type": { "type": "object", "ui": { "widget": "bar-chart" } },
      "detailed_issues": { "type": "array", "ui": { "widget": "data-table" } }
    }
  }
}
```

---

## 🐛 Troubleshooting

### Form Not Loading
- Check agent_id is correct
- Verify config file exists
- Check API route is working
- Look at browser console

### Validation Errors
- Check validation rules in schema
- Verify required fields are filled
- Check min/max values
- Check regex patterns

### Report Not Rendering
- Check execution_id is correct
- Verify result file exists
- Check output_schema matches data
- Look at browser console

---

## 📞 Support

- Documentation: `/docs/AGENT_CONFIGURATION_SCHEMA.md`
- Demo Page: `/agent-config-demo`
- GitHub Issues: Create issue with details

---

**Last Updated**: 2026-05-15  
**Version**: 1.0.0  
**Author**: SecOps AI Team