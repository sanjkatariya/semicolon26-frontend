'use client';

import { useState, useEffect } from 'react';
import { AgentConfigSchema, FieldSchema, LayoutSection, AgentExecutionResult } from '../types/agent-config';

interface DynamicAgentReportProps {
  executionId: string;
}

interface ReportData extends AgentExecutionResult {
  output_schema: AgentConfigSchema['output_schema'];
  ui_config: AgentConfigSchema['ui_config'];
}

export default function DynamicAgentReport({ executionId }: DynamicAgentReportProps) {
  const [result, setResult] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch execution results with schema
    fetch(`/api/v1/agents/results/${executionId}`)
      .then(res => res.json())
      .then(data => {
        setResult(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading results:', err);
        setLoading(false);
      });
  }, [executionId]);

  const renderOutput = (fieldName: string, fieldSchema: FieldSchema, value: any) => {
    if (value === null || value === undefined) {
      return <div className="text-slate-500 text-sm">No data</div>;
    }

    const widget = fieldSchema.ui?.widget || fieldSchema.type;

    switch (widget) {
      case 'metric':
        return (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center">
            <div className="text-4xl font-bold mb-2" style={{ color: fieldSchema.ui?.color || '#3b82f6' }}>
              {fieldSchema.ui?.icon && <span className="mr-2">{fieldSchema.ui.icon}</span>}
              {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
            <div className="text-sm text-slate-400">{fieldSchema.title}</div>
          </div>
        );

      case 'bar-chart':
        if (typeof value !== 'object') return null;
        const maxValue = Math.max(...Object.values(value).map((v: any) => Number(v) || 0));
        return (
          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-300 mb-3">{fieldSchema.title}</div>
            {Object.entries(value).map(([key, val]: [string, any]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="w-24 text-sm text-slate-300 font-medium">{key}</span>
                <div className="flex-1 bg-slate-700/50 rounded-full h-8 overflow-hidden">
                  <div
                    className="h-8 rounded-full flex items-center justify-end px-3 text-xs font-bold text-white transition-all duration-500"
                    style={{
                      width: `${maxValue > 0 ? (Number(val) / maxValue) * 100 : 0}%`,
                      backgroundColor: fieldSchema.ui?.colors?.[key] || '#3b82f6',
                      minWidth: val > 0 ? '40px' : '0'
                    }}
                  >
                    {val > 0 && val}
                  </div>
                </div>
                <span className="w-12 text-sm text-slate-400 text-right">{val}</span>
              </div>
            ))}
          </div>
        );

      case 'pie-chart':
        if (typeof value !== 'object') return null;
        const total = Object.values(value).reduce((sum: number, v: any) => sum + (Number(v) || 0), 0);
        return (
          <div>
            <div className="text-sm font-medium text-slate-300 mb-3">{fieldSchema.title}</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(value).map(([key, val]: [string, any]) => {
                const percentage = total > 0 ? ((Number(val) / total) * 100).toFixed(1) : 0;
                return (
                  <div key={key} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: fieldSchema.ui?.colors?.[key] || '#3b82f6' }}
                      />
                      <span className="text-xs text-slate-400">{key}</span>
                    </div>
                    <div className="text-xl font-bold text-white">{val}</div>
                    <div className="text-xs text-slate-500">{percentage}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'data-table':
        if (!Array.isArray(value)) return null;
        const columns = fieldSchema.ui?.columns || Object.keys(value[0] || {});
        return (
          <div>
            <div className="text-sm font-medium text-slate-300 mb-3">{fieldSchema.title}</div>
            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-800">
                    {columns.map((col: string) => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                        {fieldSchema.items?.properties?.[col]?.title || col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-slate-900/50">
                  {value.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                        No data available
                      </td>
                    </tr>
                  ) : (
                    value.map((row: any, idx: number) => (
                      <tr key={idx} className="border-t border-slate-700 hover:bg-slate-800/50 transition-colors">
                        {columns.map((col: string) => (
                          <td key={col} className="px-4 py-3 text-sm text-slate-300">
                            {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {value.length > 0 && (
              <div className="text-xs text-slate-500 mt-2">
                Showing {value.length} {value.length === 1 ? 'row' : 'rows'}
              </div>
            )}
          </div>
        );

      case 'badge':
        const badgeColor = fieldSchema.ui?.colors?.[value] || fieldSchema.ui?.color || 'blue';
        const colorMap: Record<string, string> = {
          green: 'bg-green-500/20 text-green-400 border-green-500/30',
          red: 'bg-red-500/20 text-red-400 border-red-500/30',
          yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
          blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
          purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
          gray: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        };
        return (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${colorMap[badgeColor] || colorMap.blue}`}>
            {value}
          </span>
        );

      case 'string':
      case 'input':
        return (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">{fieldSchema.title}</div>
            <div className="text-sm text-white font-medium">{value}</div>
          </div>
        );

      case 'number':
        return (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">{fieldSchema.title}</div>
            <div className="text-2xl text-white font-bold">{Number(value).toLocaleString()}</div>
          </div>
        );

      case 'boolean':
        return (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">{fieldSchema.title}</div>
            <div className="text-lg">
              {value ? (
                <span className="text-green-400">✓ Yes</span>
              ) : (
                <span className="text-red-400">✗ No</span>
              )}
            </div>
          </div>
        );

      case 'array':
        if (!Array.isArray(value)) return null;
        return (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-2">{fieldSchema.title}</div>
            <div className="flex flex-wrap gap-2">
              {value.map((item: any, idx: number) => (
                <span key={idx} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">
                  {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                </span>
              ))}
            </div>
          </div>
        );

      default:
        // Fallback for unknown types
        return (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-400 mb-1">{fieldSchema.title}</div>
            <pre className="text-xs text-slate-300 overflow-auto">
              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
            </pre>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-white">Loading results...</div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-8 text-center">
        <div className="text-red-400 mb-2">❌ Failed to load execution results</div>
        <div className="text-slate-400 text-sm">Please try again or contact support</div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'running': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-4">
      {/* Execution Header */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Execution Results</h2>
            <p className="text-sm text-slate-400">ID: {result.execution_id}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(result.status)}`}>
            {result.status.toUpperCase()}
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-slate-400 text-xs mb-1">Agent</div>
            <div className="text-white font-medium">{result.agent_id}</div>
          </div>
          <div>
            <div className="text-slate-400 text-xs mb-1">Started</div>
            <div className="text-white font-medium">{new Date(result.started_at).toLocaleString()}</div>
          </div>
          {result.completed_at && (
            <div>
              <div className="text-slate-400 text-xs mb-1">Completed</div>
              <div className="text-white font-medium">{new Date(result.completed_at).toLocaleString()}</div>
            </div>
          )}
          {result.completed_at && (
            <div>
              <div className="text-slate-400 text-xs mb-1">Duration</div>
              <div className="text-white font-medium">
                {Math.round((new Date(result.completed_at).getTime() - new Date(result.started_at).getTime()) / 1000)}s
              </div>
            </div>
          )}
        </div>

        {result.error_message && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="text-red-400 text-sm font-medium mb-1">Error</div>
            <div className="text-red-300 text-xs">{result.error_message}</div>
          </div>
        )}
      </div>

      {/* Dynamic Output Sections */}
      {result.ui_config.output_layout.sections.map((section: LayoutSection, sectionIdx: number) => (
        <div key={sectionIdx} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-4">{section.title}</h3>
          
          <div className={`grid grid-cols-1 ${section.columns && section.columns > 1 ? `md:grid-cols-${section.columns}` : ''} gap-4`}>
            {section.fields.map((fieldName: string) => {
              const fieldSchema = result.output_schema.properties[fieldName];
              if (!fieldSchema) return null;

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

// Made with Bob
