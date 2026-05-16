// Agent Configuration Schema Types

export type FieldType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'array' 
  | 'object' 
  | 'file' 
  | 'select' 
  | 'multiselect';

export type WidgetType = 
  | 'input' 
  | 'textarea' 
  | 'select' 
  | 'multiselect'
  | 'checkbox' 
  | 'radio' 
  | 'file' 
  | 'json-editor'
  | 'number'
  | 'metric'
  | 'bar-chart'
  | 'data-table'
  | 'badge'
  | 'pie-chart';

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}

export interface FieldUI {
  widget?: WidgetType;
  placeholder?: string;
  help_text?: string;
  icon?: string;
  color?: string;
  colors?: Record<string, string>;
  columns?: string[];
  sortable?: boolean;
  filterable?: boolean;
}

export interface FieldSchema {
  type: FieldType;
  title: string;
  description?: string;
  default?: any;
  enum?: any[];
  format?: string;
  validation?: FieldValidation;
  ui?: FieldUI;
  properties?: Record<string, FieldSchema>;
  items?: FieldSchema;
}

export interface SchemaProperties {
  type: 'object';
  properties: Record<string, FieldSchema>;
  required?: string[];
}

export interface LayoutSection {
  title: string;
  fields: string[];
  columns?: number;
}

export interface LayoutConfig {
  sections: LayoutSection[];
}

export interface UIConfig {
  input_layout: LayoutConfig;
  output_layout: LayoutConfig;
}

export interface AgentConfigSchema {
  agent_id: string;
  agent_name: string;
  version: string;
  input_schema: SchemaProperties;
  output_schema: SchemaProperties;
  ui_config: UIConfig;
}

export interface AgentExecutionResult {
  execution_id: string;
  agent_id: string;
  workflow_id: string;
  input_data: Record<string, any>;
  output_data: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

// Made with Bob
