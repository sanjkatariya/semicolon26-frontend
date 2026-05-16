import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    
    // Map agent IDs to config files
    const configFiles: Record<string, string> = {
      'trivy-scanner-v1': 'agent-config-trivy.json',
    };

    const configFile = configFiles[agentId];
    if (!configFile) {
      return NextResponse.json(
        { error: 'Agent configuration not found' },
        { status: 404 }
      );
    }

    // Read config file from public/mock-data
    const filePath = path.join(process.cwd(), 'public', 'mock-data', configFile);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const config = JSON.parse(fileContent);

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error loading agent configuration:', error);
    return NextResponse.json(
      { error: 'Failed to load agent configuration' },
      { status: 500 }
    );
  }
}

// Made with Bob
