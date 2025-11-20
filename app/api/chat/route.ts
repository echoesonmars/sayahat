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

КРИТИЧЕСКИ ВАЖНО ДЛЯ ПЛАНОВ:
- ВСЕГДА добавляй координаты (lat и lng) для КАЖДОГО места в locations
- Если пользователь просит добавить место в план, ОБЯЗАТЕЛЬНО найди его координаты из базы данных
- Если места нет в базе данных, используй примерные координаты города (Алматы: 43.2220, 76.8512; Шымкент: 42.3419, 69.5901; Астана: 51.1694, 71.4491)
- БЕЗ координат план нельзя будет открыть на карте - поэтому координаты ОБЯЗАТЕЛЬНЫ
- Формат: {"name":"Название места","lat":43.2220,"lng":76.8512}

2. Если пользователь просит СОХРАНИТЬ ЗАМЕТКУ/ЧЕК/ВАУЧЕР (слова: сохрани заметку, добавь в заметки, запомни, чек, ваучер) → в конце ответа добавь:
<note>{"title":"Заголовок","content":"текст","type":"note"}</note>
Тип: "receipt" для чеков, "voucher" для ваучеров, "note" для остального.

3. Для маршрута добавь в конце:
<route>{"destination":{"lat":43.2,"lng":76.8},"origin":{"lat":...,"lng":...},"note":"описание"}</route>

РАБОТА С БАЗОЙ ДАННЫХ:
- В базе данных есть информация о местах в Шымкенте, Алматы и Астане
- ВСЕГДА сначала используй информацию из базы данных, если она есть
- Когда пользователь спрашивает о местах, ресторанах, магазинах, достопримечательностях - используй конкретные места из базы
- Упоминай названия мест, их категории и города из базы данных
- Если в базе данных есть релевантные места - обязательно упомяни их в ответе

ПОИСК В ИНТЕРНЕТЕ:
- Если информации нет в базе данных или её недостаточно - используй свои знания о Казахстане
- Для общих вопросов о культуре, истории, традициях Казахстана используй свои знания
- Для актуальной информации (события, новости) можешь упомянуть, что информация может быть устаревшей

ВАЖНО: 
- Блоки <plan>, <note>, <route> добавляй ТОЛЬКО в самом конце, после всего текста. Внутри тегов только JSON, без текста.
- Приоритет: база данных → твои знания → общая информация`;

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

  // Маппинг ObjectId на названия городов
  const CITY_NAMES: Record<string, string> = {
    '691c9b692f57d6e91156d18a': 'Шымкент',
    '691c9b892f57d6e91156d18b': 'Алматы',
    '691f5027819a19c6c6a57e12': 'Астана',
  };

  // Поиск мест в БД по запросу пользователя
  let dbPlacesContext = '';
  try {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    
    // Извлекаем ключевые слова из запроса для поиска
    const queryLower = prompt.toLowerCase();
    const cityMentions: Record<string, string> = {
      'алматы': 'Алматы',
      'алмата': 'Алматы',
      'алмате': 'Алматы',
      'шымкент': 'Шымкент',
      'шымкенте': 'Шымкент',
      'астана': 'Астана',
      'астане': 'Астана',
      'астану': 'Астана',
    };
    
    let mentionedCity: string | null = null;
    for (const [key, value] of Object.entries(cityMentions)) {
      if (queryLower.includes(key)) {
        mentionedCity = value;
        break;
      }
    }
    
    // Получаем все города или конкретный город
    const cityIds = mentionedCity 
      ? Object.entries(CITY_NAMES)
          .filter(([, name]) => name === mentionedCity)
          .map(([id]) => id)
      : Object.keys(CITY_NAMES);
    
    const cities = await db.collection('towns').find({
      _id: { $in: cityIds.map(id => new ObjectId(id)) }
    }).toArray();
    
    if (cities.length > 0) {
      const allPlaces: Array<{
        name: string;
        city: string;
        category?: string[];
        tags?: Record<string, unknown>;
        lat?: number;
        lng?: number;
      }> = [];
      
      // Собираем все места из всех городов
      for (const city of cities) {
        const places = city.items || city.places || city.Places || city.data || [];
        const cityId = city._id?.toString() || '';
        const cityName = CITY_NAMES[cityId] || city.name || city.Name || city.meta?.name || 'Неизвестный город';
        
        if (Array.isArray(places)) {
          places.slice(0, 100).forEach((place: unknown) => {
            if (!place || typeof place !== 'object') return;
            const placeObj = place as Record<string, unknown>;
            allPlaces.push({
              name: (placeObj.name || placeObj.Name || 'Без названия') as string,
              city: cityName,
              category: (placeObj.category || placeObj.Category || []) as string[],
              tags: (placeObj.tags || placeObj.Tags || {}) as Record<string, unknown>,
              lat: (placeObj.lat || placeObj.Lat || placeObj.latitude || placeObj.Latitude) as number | undefined,
              lng: (placeObj.lon || placeObj.Lon || placeObj.longitude || placeObj.Longitude || placeObj.lng || placeObj.Lng) as number | undefined,
            });
          });
        }
      }
      
      // Фильтруем места по запросу пользователя
      const searchTerms = prompt.toLowerCase().split(/\s+/).filter(term => term.length > 2);
      const relevantPlaces = allPlaces.filter(place => {
        if (searchTerms.length === 0) return false;
        
        const placeName = (place.name || '').toLowerCase();
        const placeCategory = (place.category || []).map((c: string) => c.toLowerCase()).join(' ');
        const placeTags = Object.values(place.tags || {}).map(v => String(v).toLowerCase()).join(' ');
        const allText = `${placeName} ${placeCategory} ${placeTags}`;
        
        return searchTerms.some(term => allText.includes(term));
      }).slice(0, 20); // Берем топ 20 релевантных мест
      
      if (relevantPlaces.length > 0) {
        const placesInfo = relevantPlaces.map(place => {
          const categoryText = (place.category || []).slice(0, 3).join(', ') || 'разное';
          const coordsText = place.lat && place.lng ? ` (${place.lat.toFixed(4)}, ${place.lng.toFixed(4)})` : '';
          return `- ${place.name} в ${place.city}${coordsText} | Категория: ${categoryText}`;
        }).join('\n');
        
        dbPlacesContext = `\n\nРЕЛЕВАНТНЫЕ МЕСТА ИЗ БАЗЫ ДАННЫХ (найдено ${relevantPlaces.length}):\n${placesInfo}\n\nИспользуй эту информацию при ответе пользователю. Если пользователь спрашивает о конкретном месте, упомяни его из базы данных.`;
      }
    }
  } catch (error) {
    console.warn('[AI Guide] Failed to search places in MongoDB', error);
  }

  // Получаем общую информацию о городах из БД
  let citiesContext = '';
  try {
    const { db } = await connectToDatabase();
    const { ObjectId } = await import('mongodb');
    
    const cityIds = Object.keys(CITY_NAMES);
    const cities = await db.collection('towns').find({
      _id: { $in: cityIds.map(id => new ObjectId(id)) }
    }).toArray();
    
    if (cities.length > 0) {
      const citiesInfo = cities.map(city => {
        const places = city.items || city.places || city.Places || city.data || [];
        const placesCount = Array.isArray(places) ? places.length : 0;
        const cityId = city._id?.toString() || '';
        const cityName = CITY_NAMES[cityId] || city.name || city.Name || city.meta?.name || 'Неизвестный город';
        
        return `- ${cityName}: ${placesCount} мест в базе данных`;
      }).join('\n');
      
      citiesContext = `\n\nДОСТУПНЫЕ ГОРОДА В БАЗЕ ДАННЫХ:\n${citiesInfo}`;
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
    ...(dbPlacesContext ? [{ role: 'system' as const, content: dbPlacesContext }] : []),
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

