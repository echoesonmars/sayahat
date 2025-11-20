import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

// POST - отправить SOS
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { contactId, lat, lng } = body;

    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Находим контакт
    const contact = await db.collection('safetyContacts').findOne({
      _id: new ObjectId(contactId),
      contactUserId: session.user.id, // Только тот, кто ввел код, может отправить SOS владельцу
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Получаем данные пользователя, который отправил SOS
    const sosUser = await db.collection('users').findOne(
      { _id: new ObjectId(session.user.id) },
      { projection: { name: 1, email: 1 } }
    );

    // Создаем SOS запись
    const sosData = {
      contactId: contact._id.toString(),
      fromUserId: session.user.id,
      toUserId: contact.userId,
      location: lat && lng ? { lat, lng } : null,
      timestamp: new Date(),
      status: 'pending',
      message: `SOS от ${sosUser?.name || 'Неизвестный'}`,
    };

    await db.collection('sosAlerts').insertOne(sosData, { bypassDocumentValidation: true });

    // Здесь можно добавить интеграцию с SMS/звонком
    // Например, через Twilio, или другой сервис
    console.log('[SOS] Alert created:', sosData);

    return NextResponse.json({ 
      success: true,
      message: 'SOS отправлен',
      // В реальном приложении здесь будет номер телефона для звонка
      phoneNumber: null, // TODO: добавить номер телефона из профиля
    });
  } catch (error) {
    console.error('[SOS] Error:', error);
    return NextResponse.json({ error: 'Failed to send SOS' }, { status: 500 });
  }
}

