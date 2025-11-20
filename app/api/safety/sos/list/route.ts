import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

export const runtime = 'nodejs';

// GET - получить список SOS сигналов для текущего пользователя
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    // Находим все SOS сигналы, где текущий пользователь является получателем (toUserId)
    const sosAlerts = await db.collection('sosAlerts')
      .find({ 
        toUserId: session.user.id,
        status: { $ne: 'read' } // Только непрочитанные
      })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    // Обогащаем данными отправителя
    const enrichedAlerts = await Promise.all(
      sosAlerts.map(async (alert) => {
        const { ObjectId } = await import('mongodb');
        let fromUser = null;
        
        if (ObjectId.isValid(alert.fromUserId)) {
          fromUser = await db.collection('users').findOne(
            { _id: new ObjectId(alert.fromUserId) },
            { projection: { name: 1, email: 1 } }
          );
        }

        return {
          _id: alert._id.toString(),
          fromUser: fromUser ? {
            id: fromUser._id.toString(),
            name: fromUser.name,
            email: fromUser.email,
          } : null,
          location: alert.location,
          timestamp: alert.timestamp,
          message: alert.message,
          status: alert.status,
        };
      })
    );

    return NextResponse.json({ alerts: enrichedAlerts });
  } catch (error) {
    console.error('[SOS List] Error:', error);
    return NextResponse.json({ error: 'Failed to get SOS alerts' }, { status: 500 });
  }
}

// POST - отметить SOS как прочитанный
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { alertId } = body;

    if (!alertId) {
      return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');

    // Отмечаем как прочитанный только если пользователь является получателем
    await db.collection('sosAlerts').updateOne(
      {
        _id: new ObjectId(alertId),
        toUserId: session.user.id,
      },
      {
        $set: { status: 'read' },
      },
      { bypassDocumentValidation: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SOS List] Error:', error);
    return NextResponse.json({ error: 'Failed to mark alert as read' }, { status: 500 });
  }
}

