import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const runtime = 'nodejs';

type Note = {
  title: string;
  content?: string;
  type?: 'receipt' | 'voucher' | 'note';
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ notes: [] }, { status: 200 });
    }

    const { db } = await connectToDatabase();
    const notes = await db.collection('notes').find({ userId: session.user.id }).sort({ createdAt: -1 }).toArray();
    
    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Failed to fetch notes', error);
    // Возвращаем пустой массив вместо ошибки, чтобы клиент мог работать
    // Важно: возвращаем 200 статус, чтобы клиент не считал это ошибкой
    return NextResponse.json({ notes: [] }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Received note data:', body);
    const { title, content, type } = body as Note;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      console.error('Note validation failed: title is required');
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const noteData = {
      title: title.trim(),
      content: content || '',
      type: type || 'note',
      userId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    console.log('Inserting note:', noteData);
    const result = await db.collection('notes').insertOne(noteData, {
      bypassDocumentValidation: true,
    });
    console.log('Note inserted with ID:', result.insertedId);

    return NextResponse.json({ 
      id: result.insertedId.toString(),
      success: true 
    });
  } catch (error) {
    console.error('Failed to create note:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let userFriendlyError = `Failed to create note: ${errorMessage}`;
    if (errorMessage.includes('validation') || errorMessage.includes('Document failed')) {
      userFriendlyError = 'Ошибка валидации данных. Проверьте схему коллекции notes в MongoDB Compass.';
    }
    return NextResponse.json({ error: userFriendlyError }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid note ID' }, { status: 400 });
    }

    // Удаляем только заметки текущего пользователя
    await db.collection('notes').deleteOne({ _id: new ObjectId(id), userId: session.user.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete note', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}

