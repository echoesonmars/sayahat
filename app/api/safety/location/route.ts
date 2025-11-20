import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const runtime = 'nodejs';

// POST - обновить местоположение
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { lat, lng } = body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    console.log('[Safety Location] Updating location for user:', session.user.id, { lat, lng });

    // Обновляем местоположение во всех связях, где пользователь является владельцем (userId)
    const updateResult = await db.collection('safetyContacts').updateMany(
      { userId: String(session.user.id) },
      {
        $set: {
          lastLocation: {
            lat,
            lng,
            timestamp: new Date(),
          },
        },
      },
      { bypassDocumentValidation: true }
    );

    console.log('[Safety Location] Updated', updateResult.modifiedCount, 'contacts');

    return NextResponse.json({ success: true, updated: updateResult.modifiedCount });
  } catch (error) {
    console.error('[Safety Location] Error:', error);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}

