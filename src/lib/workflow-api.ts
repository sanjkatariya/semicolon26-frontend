// API client for workflow execution with SSE streaming

import { WorkflowTriggerRequest, WorkflowEvent } from '@/types/workflow-execution';

const WORKFLOW_API_BASE = process.env.NEXT_PUBLIC_WORKFLOW_API_URL || 'http://127.0.0.1:8010';

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
    const url = `${WORKFLOW_API_BASE}/api/workflow/trigger`;
    
    // Create EventSource with POST data (using fetch for POST, then EventSource for streaming)
    // Note: EventSource doesn't support POST directly, so we need a workaround
    
    // For now, we'll use fetch with streaming response
    const eventSource = this.createSSEConnection(url, request, onEvent, onError, onComplete);
    
    return eventSource;
  }

  /**
   * Create SSE connection using fetch with streaming
   */
  private static createSSEConnection(
    url: string,
    request: WorkflowTriggerRequest,
    onEvent: (event: WorkflowEvent) => void,
    onError?: (error: Error) => void,
    onComplete?: () => void
  ): EventSource {
    // We'll use a custom implementation since EventSource doesn't support POST
    const controller = new AbortController();
    
    console.log('[WorkflowAPI] Starting SSE connection to:', url);
    console.log('[WorkflowAPI] Request:', request);
    
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
          throw new Error(`HTTP error! status: ${response.status}`);
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
  static async getWorkflowExecution(id: string): Promise<any> {
    // This would call a real API endpoint
    return null;
  }
}

// Made with Bob
