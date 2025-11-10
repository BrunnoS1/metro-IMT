import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = params.filename;
    
    // Security: only allow specific WASM files
    if (!filename.endsWith('.wasm') || filename.includes('..')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // Path to WASM files in public directory
    const wasmPath = path.join(process.cwd(), 'public', 'wasm', filename);

    // Check if file exists
    if (!fs.existsSync(wasmPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Read the WASM file
    const wasmBuffer = fs.readFileSync(wasmPath);

    // Return with correct content type
    return new NextResponse(wasmBuffer, {
      headers: {
        'Content-Type': 'application/wasm',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving WASM file:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
