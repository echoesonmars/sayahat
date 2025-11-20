import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit')) || 50;

    const { db } = await connectToDatabase();
    const cursor = db.collection('places').find({}).limit(Math.min(limit, 200));
    const places = await cursor.toArray();

    return NextResponse.json({ count: places.length, places });
  } catch (error) {
    console.error('[API /places] error', error);
    return NextResponse.json({ error: 'Unable to load places' }, { status: 500 });
  }
}

