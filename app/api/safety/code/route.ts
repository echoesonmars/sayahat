import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import crypto from 'crypto';

export const runtime = 'nodejs';

// Генерирует уникальный код (6-значный)
function generateUniqueCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 6);
}

// GET - получить или создать уникальный код пользователя
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    
    if (!ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }
    
    const user = await db.collection('users').findOne({ _id: new ObjectId(session.user.id) });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Если у пользователя уже есть код, возвращаем его
    if (user.safetyCode) {
      return NextResponse.json({ code: user.safetyCode });
    }

    // Генерируем новый код
    let newCode: string;
    let attempts = 0;
    do {
      newCode = generateUniqueCode();
      const existing = await db.collection('users').findOne({ safetyCode: newCode });
      if (!existing) break;
      attempts++;
      if (attempts > 10) {
        return NextResponse.json({ error: 'Failed to generate unique code' }, { status: 500 });
      }
    } while (true);

    // Сохраняем код в базу
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { safetyCode: newCode } },
      { bypassDocumentValidation: true }
    );

    return NextResponse.json({ code: newCode });
  } catch (error) {
    console.error('[Safety Code] Error:', error);
    return NextResponse.json({ error: 'Failed to get safety code' }, { status: 500 });
  }
}

