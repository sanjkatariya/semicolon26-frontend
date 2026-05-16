import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  try {
    const { executionId } = await params;
    
    // Map execution IDs to result files
    const resultFiles: Record<string, string> = {
      'exec-trivy-001': 'agent-execution-result-trivy.json',
    };

    const resultFile = resultFiles[executionId];
    if (!resultFile) {
      return NextResponse.json(
        { error: 'Execution result not found' },
        { status: 404 }
      );
    }

    // Read result file from public/mock-data
    const filePath = path.join(process.cwd(), 'public', 'mock-data', resultFile);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const result = JSON.parse(fileContent);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error loading execution result:', error);
    return NextResponse.json(
      { error: 'Failed to load execution result' },
      { status: 500 }
    );
  }
}

// Made with Bob
