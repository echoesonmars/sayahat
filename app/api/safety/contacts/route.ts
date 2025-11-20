import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';

// GET - получить список контактов безопасности
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Находим все связи, где текущий пользователь либо владелец, либо контакт
    const contacts = await db.collection('safetyContacts').find({
      $or: [
        { userId: session.user.id },
        { contactUserId: session.user.id }
      ]
    }).toArray();

    // Собираем все уникальные ID пользователей для одного запроса
    const userIds = new Set<string>();
    contacts.forEach(contact => {
      if (String(contact.userId) !== String(session.user.id)) {
        userIds.add(String(contact.userId));
      }
      if (String(contact.contactUserId) !== String(session.user.id)) {
        userIds.add(String(contact.contactUserId));
      }
    });

    // Загружаем всех пользователей одним запросом
    const userIdsArray = Array.from(userIds).filter(id => ObjectId.isValid(id)).map(id => new ObjectId(id));
    const users = userIdsArray.length > 0 
      ? await db.collection('users').find(
          { _id: { $in: userIdsArray } },
          { projection: { name: 1, email: 1, safetyCode: 1 } }
        ).toArray()
      : [];
    
    const usersMap = new Map(users.map(u => [String(u._id), u]));

    // Создаем карту для быстрого поиска местоположений
    // Для контактов где isOwner = false, нам нужно найти связь где userId = владелец кода
    const ownerContactIds = contacts
      .filter(c => String(c.userId) !== String(session.user.id))
      .map(c => String(c.userId));
    
    const ownerContacts = ownerContactIds.length > 0
      ? await db.collection('safetyContacts').find({
          userId: { $in: ownerContactIds },
          contactUserId: session.user.id,
        }).toArray()
      : [];
    
    const locationMap = new Map(
      ownerContacts.map(oc => [String(oc.userId), oc.lastLocation])
    );

    // Обогащаем данными пользователей
    const enrichedContacts = contacts.map((contact) => {
      const isOwner = String(contact.userId) === String(session.user.id);
      const otherUserId = isOwner ? contact.contactUserId : contact.userId;
      
      const otherUser = usersMap.get(String(otherUserId));

      // Логика местоположения:
      let locationToShow = null;
      
      if (isOwner) {
        // Пользователь владелец кода - показываем его местоположение из этой связи
        locationToShow = contact.lastLocation || null;
      } else {
        // Пользователь ввел код - берем местоположение из карты
        locationToShow = locationMap.get(String(otherUserId)) || null;
      }

      return {
        _id: contact._id.toString(),
        isOwner,
        otherUser: otherUser ? {
          id: otherUser._id.toString(),
          name: otherUser.name,
          email: otherUser.email,
          code: otherUser.safetyCode,
        } : null,
        createdAt: contact.createdAt,
        lastLocation: locationToShow,
      };
    });

    return NextResponse.json({ contacts: enrichedContacts });
  } catch (error) {
    console.error('[Safety Contacts] Error:', error);
    return NextResponse.json({ error: 'Failed to get contacts' }, { status: 500 });
  }
}

// POST - добавить контакт по коду
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string' || code.length !== 6) {
      return NextResponse.json({ error: 'Invalid code format' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Находим пользователя с таким кодом
    const targetUser = await db.collection('users').findOne({ 
      safetyCode: code.toUpperCase().trim() 
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Code not found' }, { status: 404 });
    }

    if (String(targetUser._id) === String(session.user.id)) {
      return NextResponse.json({ error: 'Cannot add yourself' }, { status: 400 });
    }

    // Проверяем, не добавлен ли уже этот контакт
    const existing = await db.collection('safetyContacts').findOne({
      userId: String(targetUser._id),
      contactUserId: String(session.user.id),
    });

    if (existing) {
      return NextResponse.json({ error: 'Contact already added' }, { status: 400 });
    }

    // Создаем связь: targetUser - владелец кода, session.user - тот, кто ввел код
    const result = await db.collection('safetyContacts').insertOne({
      userId: String(targetUser._id),
      contactUserId: String(session.user.id),
      createdAt: new Date(),
      lastLocation: null,
    }, { bypassDocumentValidation: true });

    return NextResponse.json({ 
      success: true,
      contactId: result.insertedId.toString(),
      targetUserName: targetUser.name,
    });
  } catch (error) {
    console.error('[Safety Contacts] Error:', error);
    return NextResponse.json({ error: 'Failed to add contact' }, { status: 500 });
  }
}

// DELETE - удалить контакт
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('id');

    if (!contactId) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Удаляем только если пользователь является владельцем (userId)
    const result = await db.collection('safetyContacts').deleteOne({
      _id: new ObjectId(contactId),
      userId: session.user.id,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Contact not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Safety Contacts] Error:', error);
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
}

