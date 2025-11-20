import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('[Register] Starting registration process...');
    const body = await request.json();
    const { email, password, name } = body;

    console.log('[Register] Received data:', { email, name, passwordLength: password?.length });

    if (!email || !password || !name) {
      console.error('[Register] Missing required fields');
      return NextResponse.json(
        { error: 'Email, password and name are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      console.error('[Register] Password too short');
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    console.log('[Register] Connecting to database...');
    const { db } = await connectToDatabase();
    console.log('[Register] Database connected successfully');
    
    // Проверяем, существует ли пользователь
    console.log('[Register] Checking if user exists...');
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      console.error('[Register] User already exists:', email);
      return NextResponse.json(
        { error: 'Пользователь с таким email уже существует' },
        { status: 400 }
      );
    }

    // Хешируем пароль
    console.log('[Register] Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаем пользователя
    console.log('[Register] Creating user...');
    const userData = {
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    console.log('[Register] User data to insert:', { ...userData, password: '[HIDDEN]' });
    
    // Пытаемся вставить с обходом валидации, если она есть
    const result = await db.collection('users').insertOne(userData, {
      bypassDocumentValidation: true,
    });
    console.log('[Register] User created successfully with ID:', result.insertedId);

    return NextResponse.json({
      id: result.insertedId.toString(),
      email,
      name,
      success: true,
    });
  } catch (error) {
    console.error('[Register] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Register] Error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Более информативное сообщение об ошибке
    let userFriendlyError = 'Ошибка при регистрации. Проверьте подключение к базе данных.';
    if (errorMessage.includes('MongoDB') || errorMessage.includes('connection')) {
      userFriendlyError = 'Ошибка подключения к базе данных. Проверьте настройки MongoDB в .env.local';
    } else if (errorMessage.includes('credentials')) {
      userFriendlyError = 'Ошибка подключения к базе данных. Проверьте правильность MONGODB_URI';
    } else if (errorMessage.includes('validation') || errorMessage.includes('Document failed')) {
      userFriendlyError = 'Ошибка валидации данных. Возможно, в базе данных установлена схема валидации. Проверьте схему коллекции users в MongoDB Compass.';
    }
    
    return NextResponse.json(
      { error: userFriendlyError, details: process.env.NODE_ENV === 'development' ? errorMessage : undefined },
      { status: 500 }
    );
  }
}

