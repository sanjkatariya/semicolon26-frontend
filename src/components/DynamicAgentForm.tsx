'use client';

import { useState, useEffect } from 'react';
import { AgentConfigSchema, FieldSchema, LayoutSection } from '../types/agent-config';

interface DynamicAgentFormProps {
  agentId: string;
  onSubmit: (data: Record<string, any>) => void;
  onCancel?: () => void;
}

export default function DynamicAgentForm({ agentId, onSubmit, onCancel }: DynamicAgentFormProps) {
  const [schema, setSchema] = useState<AgentConfigSchema | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch agent configuration schema
    fetch(`/api/v1/agents/configurations/${agentId}/input-form`)
      .then(res => res.json())
      .then(data => {
        setSchema(data);
        // Initialize form with defaults
        const defaults: Record<string, any> = {};
        Object.entries(data.input_schema.properties).forEach(([key, field]: [string, any]) => {
          if (field.default !== undefined) {
            defaults[key] = field.default;
          }
        });
        setFormData(defaults);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading schema:', err);
        setLoading(false);
      });
  }, [agentId]);

  const validateField = (fieldName: string, value: any, fieldSchema: FieldSchema): string | null => {
    const validation = fieldSchema.validation;
    if (!validation) return null;

    if (validation.required && !value) {
      return `${fieldSchema.title} is required`;
    }

    if (fieldSchema.type === 'string' && value) {
      if (validation.minLength && value.length < validation.minLength) {
        return `Minimum length is ${validation.minLength}`;
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        return `Maximum length is ${validation.maxLength}`;
      }
      if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
        return `Invalid format`;
      }
    }

    if (fieldSchema.type === 'number' && value !== undefined) {
      if (validation.min !== undefined && value < validation.min) {
        return `Minimum value is ${validation.min}`;
      }
      if (validation.max !== undefined && value > validation.max) {
        return `Maximum value is ${validation.max}`;
      }
    }

    return null;
  };

  const handleFieldChange = (fieldName: string, value: any, fieldSchema: FieldSchema) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    // Validate on change
    const error = validateField(fieldName, value, fieldSchema);
    setErrors(prev => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[fieldName] = error;
      } else {
        delete newErrors[fieldName];
      }
      return newErrors;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!schema) return;

    // Validate all fields
    const newErrors: Record<string, string> = {};
    Object.entries(schema.input_schema.properties).forEach(([fieldName, fieldSchema]) => {
      const error = validateField(fieldName, formData[fieldName], fieldSchema);
      if (error) {
        newErrors[fieldName] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  const renderField = (fieldName: string, fieldSchema: FieldSchema) => {
    const { type, title, ui, validation, enum: enumValues } = fieldSchema;
    const value = formData[fieldName];
    const error = errors[fieldName];
    const widget = ui?.widget || type;

    const baseInputClass = `w-full px-3 py-2 text-sm bg-slate-900/50 border rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 ${
      error ? 'border-red-500' : 'border-slate-700'
    }`;

    switch (widget) {
      case 'input':
      case 'string':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleFieldChange(fieldName, e.target.value, fieldSchema)}
            placeholder={ui?.placeholder}
            required={validation?.required}
            className={baseInputClass}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleFieldChange(fieldName, e.target.value, fieldSchema)}
            placeholder={ui?.placeholder}
            required={validation?.required}
            rows={4}
            className={baseInputClass}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => handleFieldChange(fieldName, e.target.value ? parseFloat(e.target.value) : undefined, fieldSchema)}
            placeholder={ui?.placeholder}
            required={validation?.required}
            min={validation?.min}
            max={validation?.max}
            className={baseInputClass}
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleFieldChange(fieldName, e.target.value, fieldSchema)}
            required={validation?.required}
            className={baseInputClass}
          >
            <option value="">Select {title}</option>
            {enumValues?.map((option: any) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div className="space-y-2">
            {enumValues?.map((option: any) => (
              <label key={option} className="flex items-center gap-2 text-sm text-white cursor-pointer hover:bg-slate-800/50 p-2 rounded">
                <input
                  type="checkbox"
                  checked={(value || []).includes(option)}
                  onChange={(e) => {
                    const current = value || [];
                    const updated = e.target.checked
                      ? [...current, option]
                      : current.filter((v: any) => v !== option);
                    handleFieldChange(fieldName, updated, fieldSchema);
                  }}
                  className="w-4 h-4 text-blue-500 bg-slate-900 border-slate-700 rounded focus:ring-blue-500"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
      case 'boolean':
        return (
          <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleFieldChange(fieldName, e.target.checked, fieldSchema)}
              className="w-4 h-4 text-blue-500 bg-slate-900 border-slate-700 rounded focus:ring-blue-500"
            />
            <span>{ui?.help_text || 'Enable'}</span>
          </label>
        );

      case 'file':
        return (
          <input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFieldChange(fieldName, file, fieldSchema);
              }
            }}
            className={baseInputClass}
          />
        );

      case 'json-editor':
        return (
          <textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleFieldChange(fieldName, parsed, fieldSchema);
              } catch {
                handleFieldChange(fieldName, e.target.value, fieldSchema);
              }
            }}
            placeholder={ui?.placeholder || '{}'}
            rows={6}
            className={`${baseInputClass} font-mono text-xs`}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleFieldChange(fieldName, e.target.value, fieldSchema)}
            className={baseInputClass}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-white">Loading configuration...</div>
        </div>
      </div>
    );
  }

  if (!schema) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-400 mb-2">❌ Failed to load agent configuration</div>
        <div className="text-slate-400 text-sm">Please try again or contact support</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Agent Info */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🤖</div>
          <div>
            <h3 className="text-lg font-bold text-white">{schema.agent_name}</h3>
            <p className="text-xs text-slate-400">Version {schema.version}</p>
          </div>
        </div>
      </div>

      {/* Dynamic Form Sections */}
      {schema.ui_config.input_layout.sections.map((section: LayoutSection, sectionIdx: number) => (
        <div key={sectionIdx} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-4">{section.title}</h3>
          
          <div className={`grid grid-cols-1 ${section.columns && section.columns > 1 ? `md:grid-cols-${section.columns}` : ''} gap-4`}>
            {section.fields.map((fieldName: string) => {
              const fieldSchema = schema.input_schema.properties[fieldName];
              if (!fieldSchema) return null;

              return (
                <div key={fieldName}>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {fieldSchema.ui?.icon && <span className="mr-1">{fieldSchema.ui.icon}</span>}
                    {fieldSchema.title}
                    {fieldSchema.validation?.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  
                  {renderField(fieldName, fieldSchema)}
                  
                  {errors[fieldName] && (
                    <p className="text-red-400 text-xs mt-1">{errors[fieldName]}</p>
                  )}
                  
                  {fieldSchema.ui?.help_text && !errors[fieldName] && (
                    <p className="text-slate-500 text-xs mt-1">{fieldSchema.ui.help_text}</p>
                  )}
                  
                  {fieldSchema.description && !fieldSchema.ui?.help_text && (
                    <p className="text-slate-500 text-xs mt-1">{fieldSchema.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="submit"
          className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-lg transition-all shadow-lg shadow-blue-500/50"
        >
          🚀 Execute Agent
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-all"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// Made with Bob
