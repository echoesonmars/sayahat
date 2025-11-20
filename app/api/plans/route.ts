import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export const runtime = 'nodejs';

type Plan = {
  title: string;
  date?: string;
  locations?: Array<{ name: string; lat?: number; lng?: number }>;
  description?: string;
  route?: {
    destination?: { lat: number; lng: number };
    origin?: { lat: number; lng: number };
    via?: Array<{ lat: number; lng: number }>;
    note?: string;
    hints?: string[];
  };
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ plans: [] }, { status: 200 });
    }

    const { db } = await connectToDatabase();
    const plans = await db.collection('plans').find({ userId: session.user.id }).sort({ createdAt: -1 }).toArray();
    
    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Failed to fetch plans', error);
    return NextResponse.json({ plans: [] }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Received plan data:', body);
    const { title, date, locations, description, route } = body as Plan;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      console.error('Plan validation failed: title is required');
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const planData = {
      title: title.trim(),
      date: date || new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }),
      locations: locations || [],
      description: description || '',
      route: route || null,
      userId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    console.log('Inserting plan:', planData);
    const result = await db.collection('plans').insertOne(planData, {
      bypassDocumentValidation: true,
    });
    console.log('Plan inserted with ID:', result.insertedId);

    return NextResponse.json({ 
      id: result.insertedId.toString(),
      success: true 
    });
  } catch (error) {
    console.error('Failed to create plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let userFriendlyError = `Failed to create plan: ${errorMessage}`;
    if (errorMessage.includes('validation') || errorMessage.includes('Document failed')) {
      userFriendlyError = 'Ошибка валидации данных. Проверьте схему коллекции plans в MongoDB Compass.';
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
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid plan ID' }, { status: 400 });
    }

    // Удаляем только планы текущего пользователя
    await db.collection('plans').deleteOne({ _id: new ObjectId(id), userId: session.user.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete plan', error);
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 });
  }
}

