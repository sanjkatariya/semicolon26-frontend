# 🎨 Workflow Builder Guide

## Overview

The Workflow Builder is a visual tool for creating custom security automation workflows by combining multiple agents into a sequential execution pipeline.

## Features

### 1. **Visual Workflow Canvas**
- **START Node**: Entry point for all workflows
- **Agent Nodes**: Draggable agent cards that execute in sequence
- **END Node**: Completion point for workflows
- **Visual Flow**: Clear visual representation of execution order

### 2. **Agent Library**
The builder includes 13 pre-configured agents across 4 categories:

#### 🔍 Scanners (5 agents)
- **Trivy**: Container vulnerability scanner
- **Snyk**: Dependency vulnerability scanner
- **Checkov**: Infrastructure-as-Code scanner
- **Semgrep**: Static code analysis
- **SonarQube**: Code quality and security scanner

#### 🔬 Analyzers (3 agents)
- **Dependency Analyzer**: Analyzes package dependencies
- **Code Analyzer**: Deep code analysis
- **Infrastructure Analyzer**: Cloud infrastructure analysis

#### 🛠️ Fixers (3 agents)
- **Auto Patcher**: Automated vulnerability patching
- **Code Fixer**: Automated code remediation
- **Config Fixer**: Configuration file remediation

#### 📢 Notifiers (2 agents)
- **Slack Notifier**: Send notifications to Slack
- **Email Notifier**: Send email notifications

### 3. **Workflow Management**
- **Add Agents**: Click on any agent card to add it to the workflow
- **Reorder Agents**: Use ↑ and ↓ buttons to change execution order
- **Remove Agents**: Click × button to remove agents
- **Clear All**: Reset the entire workflow

### 4. **Workflow Execution**
- **Save Workflow**: Persist workflow configuration
- **Execute Workflow**: Run the workflow immediately
- **Success Feedback**: Visual confirmation on save

## How to Use

### Creating a Workflow

1. **Navigate to Workflow Builder**
   - Click "🎨 Create" in the navigation bar
   - Or click "🎨 Create Workflow" button on the workflows page

2. **Add Agents**
   - Browse the agent library on the left
   - Click on any agent card to add it to your workflow
   - Agents appear in the center canvas between START and END nodes

3. **Configure Execution Order**
   - Agents execute in top-to-bottom order
   - Use ↑ button to move an agent up
   - Use ↓ button to move an agent down
   - First agent receives initial input
   - Each subsequent agent receives output from previous agent

4. **Review Workflow**
   - Check the visual flow in the canvas
   - Verify agent order matches your requirements
   - Ensure all necessary agents are included

5. **Save Workflow**
   - Enter a workflow name in the input field
   - Click "💾 Save Workflow" button
   - Success modal confirms save

6. **Execute Workflow** (Optional)
   - Click "🚀 Execute Now" in the success modal
   - Or save and execute later from workflows list

## Example Workflows

### 1. **Complete Security Scan**
```
START
  ↓
Trivy (Container Scan)
  ↓
Snyk (Dependency Scan)
  ↓
Semgrep (Code Analysis)
  ↓
Checkov (IaC Scan)
  ↓
Slack Notifier
  ↓
END
```

### 2. **Scan and Auto-Remediate**
```
START
  ↓
Trivy (Scan)
  ↓
Dependency Analyzer
  ↓
Auto Patcher (Fix)
  ↓
Code Fixer (Fix)
  ↓
Email Notifier
  ↓
END
```

### 3. **Full Stack Analysis**
```
START
  ↓
Code Analyzer
  ↓
Dependency Analyzer
  ↓
Infrastructure Analyzer
  ↓
SonarQube
  ↓
Slack Notifier
  ↓
END
```

### 4. **Quick Vulnerability Check**
```
START
  ↓
Snyk (Dependencies)
  ↓
Trivy (Containers)
  ↓
Email Notifier
  ↓
END
```

## Agent Details

### Scanner Agents

#### Trivy
- **Purpose**: Scan container images for vulnerabilities
- **Input**: Container image reference
- **Output**: List of CVEs with severity ratings
- **Use Case**: Docker/Kubernetes security

#### Snyk
- **Purpose**: Scan dependencies for known vulnerabilities
- **Input**: Package manifest files
- **Output**: Vulnerability report with fix recommendations
- **Use Case**: Dependency management

#### Checkov
- **Purpose**: Scan Infrastructure-as-Code for misconfigurations
- **Input**: Terraform, CloudFormation, Kubernetes YAML
- **Output**: Policy violations and security issues
- **Use Case**: Cloud infrastructure security

#### Semgrep
- **Purpose**: Static code analysis for security patterns
- **Input**: Source code files
- **Output**: Security vulnerabilities and code smells
- **Use Case**: Application security

#### SonarQube
- **Purpose**: Comprehensive code quality and security analysis
- **Input**: Full codebase
- **Output**: Quality metrics, bugs, vulnerabilities
- **Use Case**: Code quality assurance

### Analyzer Agents

#### Dependency Analyzer
- **Purpose**: Deep analysis of package dependencies
- **Input**: Dependency tree
- **Output**: Risk assessment, license compliance
- **Use Case**: Supply chain security

#### Code Analyzer
- **Purpose**: Advanced code structure analysis
- **Input**: Source code
- **Output**: Architecture insights, complexity metrics
- **Use Case**: Code maintainability

#### Infrastructure Analyzer
- **Purpose**: Cloud infrastructure configuration analysis
- **Input**: Cloud resource configurations
- **Output**: Security posture, cost optimization
- **Use Case**: Cloud security

### Fixer Agents

#### Auto Patcher
- **Purpose**: Automatically patch known vulnerabilities
- **Input**: Vulnerability report
- **Output**: Patched code/configurations
- **Use Case**: Automated remediation

#### Code Fixer
- **Purpose**: Fix code-level security issues
- **Input**: Code vulnerabilities
- **Output**: Fixed source code
- **Use Case**: Code security

#### Config Fixer
- **Purpose**: Fix configuration misconfigurations
- **Input**: Configuration issues
- **Output**: Corrected configurations
- **Use Case**: Infrastructure security

### Notifier Agents

#### Slack Notifier
- **Purpose**: Send notifications to Slack channels
- **Input**: Workflow results
- **Output**: Slack message
- **Use Case**: Team communication

#### Email Notifier
- **Purpose**: Send email notifications
- **Input**: Workflow results
- **Output**: Email message
- **Use Case**: Stakeholder updates

## Best Practices

### 1. **Workflow Design**
- Start with scanners to identify issues
- Use analyzers for deeper insights
- Apply fixers for remediation
- End with notifiers for communication

### 2. **Agent Selection**
- Choose agents based on your tech stack
- Avoid redundant scanning
- Balance thoroughness with execution time
- Consider agent dependencies

### 3. **Execution Order**
- Scan before analyzing
- Analyze before fixing
- Fix before notifying
- Group similar operations together

### 4. **Performance**
- Limit workflow to 5-7 agents for optimal performance
- Use parallel execution for independent agents (future feature)
- Cache results when possible

### 5. **Naming Conventions**
- Use descriptive workflow names
- Include purpose in name (e.g., "Daily Security Scan")
- Version workflows (e.g., "API Scan v2")

## Technical Details

### Workflow Structure
```typescript
interface Workflow {
  id: string;
  name: string;
  agents: Agent[];
  created_at: string;
  updated_at: string;
}

interface Agent {
  id: string;
  name: string;
  type: 'scanner' | 'analyzer' | 'fixer' | 'notifier';
  category: string;
  description: string;
  icon: string;
  color: string;
}
```

### Execution Flow
1. Workflow starts at START node
2. Each agent executes sequentially
3. Output of agent N becomes input of agent N+1
4. Workflow completes at END node
5. Results stored in database
6. Notifications sent if configured

### State Management
- Workflow state stored in Zustand
- Real-time updates via WebSocket
- Persistent storage in PostgreSQL
- Event streaming via Kafka

## Integration Points

### 1. **Workflow List Page**
- View all saved workflows
- Execute workflows
- Navigate to builder

### 2. **Workflow Execution Page**
- Real-time execution monitoring
- Step-by-step progress
- Live logs and results

### 3. **Agent Registry**
- View all available agents
- Agent health status
- Agent capabilities

### 4. **Dashboard**
- Workflow execution metrics
- Success/failure rates
- Performance analytics

## Future Enhancements

### Planned Features
- [ ] Parallel agent execution
- [ ] Conditional branching
- [ ] Agent configuration parameters
- [ ] Workflow templates
- [ ] Workflow versioning
- [ ] Workflow scheduling
- [ ] Approval gates
- [ ] Custom agent creation
- [ ] Workflow marketplace
- [ ] AI-powered workflow suggestions

### Advanced Capabilities
- [ ] Multi-tenant workflows
- [ ] Workflow inheritance
- [ ] Dynamic agent loading
- [ ] Workflow analytics
- [ ] Cost optimization
- [ ] SLA monitoring
- [ ] Compliance tracking
- [ ] Audit trails

## Troubleshooting

### Common Issues

#### Agents Not Appearing
- Check agent registry service is running
- Verify agent health status
- Refresh the page

#### Workflow Not Saving
- Check network connectivity
- Verify API gateway is accessible
- Check browser console for errors

#### Execution Failures
- Review agent logs
- Check agent dependencies
- Verify input data format

#### Performance Issues
- Reduce number of agents
- Check agent resource usage
- Review execution logs

## Support

For issues or questions:
- Check system logs: `/var/log/orchestrator/`
- Review API documentation: `/docs/api`
- Contact DevSecOps team
- File issue in GitHub repository

## Keyboard Shortcuts

- `Ctrl/Cmd + S`: Save workflow
- `Ctrl/Cmd + E`: Execute workflow
- `Ctrl/Cmd + K`: Clear workflow
- `Esc`: Close modals

## Accessibility

- Full keyboard navigation support
- Screen reader compatible
- High contrast mode available
- Focus indicators on all interactive elements

---

**Last Updated**: 2026-05-14  
**Version**: 1.0.0  
**Author**: SecOps AI Team