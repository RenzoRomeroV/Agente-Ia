import { NextResponse } from 'next/server';
import { createClient } from '@deepgram/sdk';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Deepgram API key not configured' }, { status: 500 });
    }

    // Since the API Key does not have member/project key generation scopes,
    // we return the API key directly to establish the WebSocket client-side connection.
    return NextResponse.json({ token: apiKey });
  } catch (err: any) {
    console.error('Exception generating Deepgram token:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
