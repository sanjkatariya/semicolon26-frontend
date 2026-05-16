// API client for workflow execution with SSE streaming

import {
  WorkflowBatchTriggerRequest,
  WorkflowEvent,
  WorkflowTriggerRequest,
} from '@/types/workflow-execution';

const WORKFLOW_API_BASE = (
  process.env.NEXT_PUBLIC_WORKFLOW_API_BASE ||
  process.env.WORKFLOW_API_BASE ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000'
).replace(/\/+$/, '');
const WORKFLOW_APP_ID = process.env.APP_ID;

if (!WORKFLOW_API_BASE) {
  throw new Error('WORKFLOW_API_BASE is not configured. Set it in .env and restart Next.js.');
}

function buildWorkflowUrl(path: string): string {
  const url = new URL(path, `${WORKFLOW_API_BASE}/`);

  if (WORKFLOW_APP_ID) {
    url.searchParams.set('app', WORKFLOW_APP_ID);
  }

  return url.toString();
}

function sanitizeRequestForLogging(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeRequestForLogging);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, fieldValue]) => [
        key,
        /token|secret|password|private_key/i.test(key) && fieldValue
          ? '[redacted]'
          : sanitizeRequestForLogging(fieldValue),
      ])
    );
  }

  return value;
}

export class WorkflowAPIClient {
  /**
   * Trigger a workflow execution with SSE streaming
   * Returns an EventSource for real-time updates
   */
  static triggerWorkflow(
    request: WorkflowTriggerRequest,
    onEvent: (event: WorkflowEvent) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void
  ): EventSource {
    const url = buildWorkflowUrl('/api/workflow/trigger');
    
    // Create EventSource with POST data (using fetch for POST, then EventSource for streaming)
    // Note: EventSource doesn't support POST directly, so we need a workaround
    
    // For now, we'll use fetch with streaming response
    const eventSource = this.createSSEConnection(url, request, onEvent, onError, onComplete);
    
    return eventSource;
  }

  /**
   * Trigger a batch workflow execution with SSE streaming
   * Returns an EventSource-like object for cancelling the stream.
   */
  static triggerBatchWorkflow(
    request: WorkflowBatchTriggerRequest,
    onEvent: (event: WorkflowEvent) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void
  ): EventSource {
    return this.createSSEConnection(
      buildWorkflowUrl('/api/workflow/trigger-batch'),
      request,
      onEvent,
      onError,
      onComplete
    );
  }

  /**
   * Create SSE connection using fetch with streaming
   */
  private static createSSEConnection(
    url: string,
    request: WorkflowTriggerRequest | WorkflowBatchTriggerRequest,
    onEvent: (event: WorkflowEvent) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void
  ): EventSource {
    // We'll use a custom implementation since EventSource doesn't support POST
    const controller = new AbortController();
    
    console.log('[WorkflowAPI] Starting SSE connection to:', url);
    console.log('[WorkflowAPI] Request:', sanitizeRequestForLogging(request));
    
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
      // Important: keep connection alive
      keepalive: true,
    })
      .then(async (response) => {
        console.log('[WorkflowAPI] Response status:', response.status);
        console.log('[WorkflowAPI] Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          throw new Error(
            `HTTP error! status: ${response.status}${errorText ? ` - ${errorText}` : ''}`
          );
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        console.log('[WorkflowAPI] Starting to read stream...');
        let buffer = '';
        let eventCount = 0;

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log('[WorkflowAPI] Stream completed. Total events:', eventCount);
            onComplete?.();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                eventCount++;
                console.log('[WorkflowAPI] Event #' + eventCount + ':', data.event, data.agent || '', data.status || '');
                onEvent(data as WorkflowEvent);
              } catch (e) {
                console.error('[WorkflowAPI] Failed to parse SSE data:', line, e);
              }
            } else if (line.startsWith('event: ')) {
              console.log('[WorkflowAPI] Event type:', line.slice(7));
            } else if (line.startsWith(': ')) {
              // Comment/keep-alive
              console.log('[WorkflowAPI] Keep-alive ping');
            }
          }
        }
      })
      .catch((error) => {
        console.error('[WorkflowAPI] Stream error:', error);
        if (error.name !== 'AbortError') {
          onError?.(error);
        }
      });

    // Return a mock EventSource-like object for compatibility
    return {
      close: () => controller.abort(),
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      onerror: null,
      onmessage: null,
      onopen: null,
      readyState: 1,
      url,
      withCredentials: false,
      CONNECTING: 0,
      OPEN: 1,
      CLOSED: 2,
    } as EventSource;
  }

  /**
   * Get workflow execution history (mock for now)
   */
  static async getWorkflowHistory(): Promise<any[]> {
    // This would call a real API endpoint
    return [];
  }

  /**
   * Get workflow execution details (mock for now)
   */
  static async getWorkflowExecution(_id: string): Promise<any> {
    // This would call a real API endpoint
    return null;
  }
}

// Made with Bob
