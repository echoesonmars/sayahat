import { NextRequest, NextResponse } from 'next/server';
import { buildNearbyPlacesContext, isValidCoordinates, Coordinates } from '@/lib/geo';
import { connectToDatabase } from '@/lib/mongodb';
import { buildPlacesContextFromDocs, getNearbyPlacesFromDb } from '@/lib/places';

type HistoryMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatRequestBody = {
  prompt?: string;
  history?: HistoryMessage[];
  coords?: Coordinates;
};

const SYSTEM_PROMPT = `Ты — Sayahat, AI-гид по Казахстану. Отвечай кратко на русском.

ПРАВИЛА:
1. Если пользователь просит СОХРАНИТЬ ПЛАН/МАРШРУТ (слова: сохрани, создай, добавь план) → в конце ответа добавь:
<plan>{"title":"Название","date":"15 дек 2024","description":"описание","locations":[{"name":"Место","lat":43.2,"lng":76.8}]}</plan>

2. Если пользователь просит СОХРАНИТЬ ЗАМЕТКУ/ЧЕК/ВАУЧЕР (слова: сохрани заметку, добавь в заметки, запомни, чек, ваучер) → в конце ответа добавь:
<note>{"title":"Заголовок","content":"текст","type":"note"}</note>
Тип: "receipt" для чеков, "voucher" для ваучеров, "note" для остального.

3. Для маршрута добавь в конце:
<route>{"destination":{"lat":43.2,"lng":76.8},"origin":{"lat":...,"lng":...},"note":"описание"}</route>

ИНФОРМАЦИЯ О ГОРОДАХ:
- В базе данных есть информация о местах в Шымкенте и Алматы
- Когда пользователь спрашивает о местах, ресторанах, достопримечательностях в этих городах, используй данные из базы
- Можешь упоминать конкретные места, если они есть в базе данных

ВАЖНО: Блоки <plan>, <note>, <route> добавляй ТОЛЬКО в самом конце, после всего текста. Внутри тегов только JSON, без текста.`;

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 500 });
  }

  let body: ChatRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const prompt = body?.prompt?.trim();

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  const safeHistory: HistoryMessage[] = Array.isArray(body?.history)
    ? body.history
        .filter(
          (item): item is HistoryMessage =>
            typeof item?.role === 'string' &&
            (item.role === 'user' || item.role === 'assistant') &&
            typeof item?.content === 'string',
        )
        .slice(-10)
    : [];

  const coords = isValidCoordinates(body?.coords) ? body.coords : null;
  let locationContext = buildNearbyPlacesContext(coords);

  // Получаем информацию о городах из БД для контекста AI
  let citiesContext = '';
  try {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    
    // Получаем информацию о городах (Шымкент и Алматы)
    const cityIds = [
      '691c9b692f57d6e91156d18a', // Шымкент
      '691c9b892f57d6e91156d18b', // Алматы
    ];
    
    const cities = await db.collection('towns').find({
      _id: { $in: cityIds.map(id => new ObjectId(id)) }
    }).toArray();
    
    if (cities.length > 0) {
      const citiesInfo = cities.map(city => {
        const places = city.places || city.Places || city.data || [];
        const placesCount = Array.isArray(places) ? places.length : 0;
        const cityName = city.name || 'Неизвестный город';
        
        // Собираем примеры категорий мест
        const categories = new Set<string>();
        if (Array.isArray(places)) {
          places.slice(0, 50).forEach((place: { category?: string[] }) => {
            if (place.category && Array.isArray(place.category)) {
              place.category.forEach((cat: string) => categories.add(cat));
            }
          });
        }
        
        const categoriesText = Array.from(categories).slice(0, 5).join(', ');
        return `- ${cityName} (ID: ${city._id?.toString()}): ${placesCount} мест. Категории: ${categoriesText || 'разные'}`;
      }).join('\n');
      
      citiesContext = `\n\nДОСТУПНЫЕ ГОРОДА В БАЗЕ ДАННЫХ:\n${citiesInfo}\n\nКогда пользователь спрашивает о местах, ресторанах, магазинах, достопримечательностях в Шымкенте или Алматы, используй информацию из базы данных. Можешь упоминать конкретные места, если они есть в базе.`;
    }
  } catch (error) {
    console.warn('[AI Guide] Failed to fetch cities from MongoDB', error);
  }

  if (coords) {
    try {
      const { db } = await connectToDatabase();
      const nearbyPlaces = await getNearbyPlacesFromDb(db, coords, 6);
      const dbContext = buildPlacesContextFromDocs(coords, nearbyPlaces);
      if (dbContext) {
        locationContext = dbContext;
      }
    } catch (error) {
      console.warn('[AI Guide] Failed to fetch places from MongoDB', error);
    }
  }

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...(locationContext ? [{ role: 'system' as const, content: locationContext }] : []),
    ...(citiesContext ? [{ role: 'system' as const, content: citiesContext }] : []),
    ...safeHistory,
    { role: 'user' as const, content: prompt },
  ];

  try {
    const upstreamResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 500,
        messages,
      }),
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      console.error('OpenAI upstream error', upstreamResponse.status, errorText);
      return NextResponse.json({ error: 'Upstream service error' }, { status: 502 });
    }

    const data = (await upstreamResponse.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const reply =
      data.choices?.[0]?.message?.content?.trim() ??
      'Извините, не удалось составить ответ. Попробуйте сформулировать вопрос иначе.';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Chat route error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

