import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { haversineDistance } from '@/lib/geo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Маппинг ObjectId на названия городов
const CITY_NAMES: Record<string, string> = {
  '691c9b692f57d6e91156d18a': 'Шымкент',
  '691c9b892f57d6e91156d18b': 'Алматы',
  '691f5027819a19c6c6a57e12': 'Астана',
};

type PlaceFromTowns = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  category?: string[];
  tags?: {
    [key: string]: unknown;
  };
  price_kzt?: number;
  stars?: number;
  city?: string;
  distanceKm?: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, lat, lng, limit = 15 } = body;

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'Query is required', places: [] }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not configured', places: [] }, { status: 500 });
    }

    const { db } = await connectToDatabase();

    // Получаем все города
    const towns = await db.collection('towns').find({}).toArray();
    
    if (towns.length === 0) {
      return NextResponse.json({ count: 0, places: [] });
    }

    // Собираем все места
    const allPlaces: (PlaceFromTowns & { cityName: string; cityId: string })[] = [];

      for (const town of towns) {
        const places = town.items || town.places || town.Places || town.data || [];
        const cityId = town._id?.toString() || '';
        // Определяем название города по ObjectId или из полей документа
        const cityName = CITY_NAMES[cityId] || town.name || town.Name || town.meta?.name || 'Неизвестный город';

      if (!Array.isArray(places)) continue;

      for (const place of places) {
        if (!place || typeof place !== 'object') continue;

        const placeLat = place.lat || place.Lat || place.latitude || place.Latitude;
        const placeLon = place.lon || place.Lon || place.longitude || place.Longitude || place.lng || place.Lng;

        if (typeof placeLat !== 'number' || typeof placeLon !== 'number') continue;

        allPlaces.push({
          id: place.id || place._id?.toString() || `place_${cityId}_${allPlaces.length}`,
          name: place.name || place.Name || 'Без названия',
          lat: placeLat,
          lon: placeLon,
          category: place.category || place.Category || [],
          tags: place.tags || place.Tags || {},
          price_kzt: place.price_kzt,
          stars: place.stars,
          city: cityName,
          cityName,
          cityId,
        });
      }
    }

    // Парсим запрос для извлечения типа места и города
    const queryLower = query.toLowerCase();
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
    
    // Берем топ мест для GPT обработки с фильтрацией по расстоянию
    let topPlaces = allPlaces;
    const MAX_DISTANCE_KM = 30; // Максимальное расстояние 30 км
    
    if (lat && lng) {
      // Сначала вычисляем расстояние для всех мест
      const placesWithDistance = allPlaces.map((place) => ({
        ...place,
        distanceKm: Number(haversineDistance({ lat, lng }, { lat: place.lat, lng: place.lon }).toFixed(1)),
      }));
      
      // Фильтруем по максимальному расстоянию и сортируем
      topPlaces = placesWithDistance
        .filter((place) => place.distanceKm <= MAX_DISTANCE_KM)
        .sort((a, b) => (a.distanceKm || Infinity) - (b.distanceKm || Infinity))
        .slice(0, 100);
      
      console.log(`[GPT Search] Filtered places within ${MAX_DISTANCE_KM}km: ${topPlaces.length} places`);
      
      // Если после фильтрации осталось мало мест, расширяем радиус до 50 км
      if (topPlaces.length < 10) {
        topPlaces = placesWithDistance
          .filter((place) => place.distanceKm <= 50)
          .sort((a, b) => (a.distanceKm || Infinity) - (b.distanceKm || Infinity))
          .slice(0, 100);
        console.log(`[GPT Search] Expanded radius to 50km: ${topPlaces.length} places`);
      }
    } else {
      // Если нет координат, берем первые 100 случайных
      topPlaces = allPlaces.slice(0, 100);
    }
    
    // Если указан город, фильтруем места по городу ПЕРЕД формированием контекста
    if (mentionedCity) {
      topPlaces = topPlaces.filter(p => p.city === mentionedCity);
      console.log(`[GPT Search] Filtered by city "${mentionedCity}": ${topPlaces.length} places`);
    }
    
    // Формируем контекст для GPT ПОСЛЕ фильтрации по городу
    const placesContext = topPlaces.map((p) => {
      const tags = p.tags || {};
      const relevantTags: Record<string, unknown> = {};
      
      // Извлекаем важные теги для поиска
      const importantTagKeys = ['shop', 'amenity', 'tourism', 'leisure', 'name', 'addr:place', 'cuisine', 'brand'];
      for (const key of importantTagKeys) {
        if (tags[key]) {
          relevantTags[key] = tags[key];
        }
      }
      
      return {
        id: p.id,
        name: p.name,
        city: p.city,
        category: p.category || [],
        tags: relevantTags,
        distanceKm: p.distanceKm !== undefined ? `${p.distanceKm.toFixed(1)} км` : 'не указано',
        price_kzt: p.price_kzt,
        stars: p.stars,
      };
    });
    
    // Формируем более компактный контекст для GPT (первые 30 ближайших мест)
    // Ограничиваем до 30, чтобы GPT мог лучше обработать и выбрать разнообразные места
    const compactContext = placesContext.slice(0, 30);
    
    console.log(`[GPT Search] Sending ${compactContext.length} places to GPT, query: "${query}"`);
    if (compactContext.length > 0) {
      console.log(`[GPT Search] Distance range: ${compactContext[0].distanceKm} - ${compactContext[compactContext.length - 1].distanceKm}`);
      console.log(`[GPT Search] First 5 places:`, compactContext.slice(0, 5).map(p => ({ id: p.id, name: p.name, distance: p.distanceKm, city: p.city })));
    }
    
    if (lat && lng) {
      console.log(`[GPT Search] User location: ${lat}, ${lng}`);
    }
    
    // Формируем более структурированный промпт
    const placesList = compactContext.map((p, idx) => 
      `${idx + 1}. ID: ${p.id} | Название: ${p.name} | Город: ${p.city} | Расстояние: ${p.distanceKm} | Теги: ${JSON.stringify(p.tags)} | Категория: ${p.category.join(', ') || 'нет'}`
    ).join('\n');
    
    const gptPrompt = `Пользователь ищет: "${query}"
${lat && lng ? `Пользователь находится по координатам: ${lat}, ${lng}` : ''}
${mentionedCity ? `ВАЖНО: Пользователь указал город "${mentionedCity}" - выбирай ТОЛЬКО места из этого города.` : ''}

Доступные места (отсортированы по расстоянию, БЛИЖАЙШИЕ ПЕРВЫМИ):
${placesList}

КРИТИЧЕСКИ ВАЖНО:
1. ПРИОРИТЕТ №1: Расстояние - выбирай места с НАИМЕНЬШИМ distanceKm (первые в списке)
2. ПРИОРИТЕТ №2: Релевантность запросу "${query}" - ищи соответствие в:
   - Названии места (name)
   - Категории (category)
   - Тегах (tags): shop, amenity, tourism, leisure, cuisine
3. ПРИОРИТЕТ №3: Разнообразие - выбирай РАЗНЫЕ места, НЕ повторяй ID
4. Если указан город "${mentionedCity || 'любой'}" - выбирай ТОЛЬКО из этого города

Примеры соответствия:
- "ресторан" → ищи amenity:restaurant, amenity:cafe, cuisine в тегах
- "магазин" → ищи shop в тегах или category содержит "shopping"
- "музей" → ищи tourism:museum, amenity:museum в тегах
- "отель" → ищи tourism:hotel, amenity:lodging в тегах

Задача: Выбери 10-15 РАЗНЫХ ID мест (каждый ID уникален), которые:
1. БЛИЖАЙШИЕ к пользователю (начинай с первых номеров в списке)
2. Соответствуют запросу "${query}"
${mentionedCity ? `3. Находятся в городе "${mentionedCity}"` : ''}

Верни ТОЛЬКО JSON массив уникальных ID: ["id1", "id2", "id3", ...]
БЕЗ текста, БЕЗ объяснений - ТОЛЬКО массив ID.`;

    // Запрос к GPT
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Ты помощник для поиска БЛИЖАЙШИХ и РЕЛЕВАНТНЫХ мест.

СТРОГИЕ ПРАВИЛА:
1. ВСЕГДА выбирай места с НАИМЕНЬШИМ distanceKm - они ближайшие
2. Места в списке УЖЕ отсортированы по расстоянию - первые ближайшие
3. Ищи соответствие запросу в: name, category, tags (shop, amenity, tourism, leisure, cuisine)
4. НЕ возвращай одинаковые ID - каждый уникален
5. Выбирай РАЗНЫЕ места, не повторяйся
6. Если указан город - ТОЛЬКО места из этого города
7. Отвечай ТОЛЬКО JSON массивом: ["id1", "id2", "id3"]
8. БЕЗ текста, БЕЗ объяснений - ТОЛЬКО массив ID`,
          },
          { role: 'user', content: gptPrompt },
        ],
        temperature: 0.2, // Снижаем температуру для более точных результатов
        max_tokens: 800, // Увеличиваем для обработки большего количества мест
      }),
    });

    let selectedPlaces = topPlaces.slice(0, limit);

    if (gptResponse.ok) {
      try {
        const gptData = await gptResponse.json();
        const gptText = gptData.choices?.[0]?.message?.content?.trim();
        
        if (gptText) {
          // Извлекаем JSON массив
          const jsonMatch = gptText.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const selectedIds = JSON.parse(jsonMatch[0]);
            
            if (Array.isArray(selectedIds) && selectedIds.length > 0) {
              const idMap = new Map(topPlaces.map((p) => [p.id, p]));
              const gptSelected = selectedIds
                .map((id: string) => idMap.get(id))
                .filter((p): p is typeof topPlaces[0] => p !== undefined);
              
              if (gptSelected.length > 0) {
                // Проверяем, что GPT выбрал разные места
                const uniquePlaces = Array.from(new Map(gptSelected.map(p => [p.id, p])).values());
                
                if (uniquePlaces.length !== gptSelected.length) {
                  console.warn(`[GPT Search] GPT returned ${gptSelected.length - uniquePlaces.length} duplicate places, removed`);
                }
                
                selectedPlaces = uniquePlaces.slice(0, limit);
                console.log('[GPT Search] GPT selected:', selectedPlaces.length, 'unique places');
                
                // Если GPT выбрал меньше 5 мест, добавляем ближайшие из топ-списка
                if (selectedPlaces.length < 5 && topPlaces.length > selectedPlaces.length) {
                  const selectedIdsSet = new Set(selectedPlaces.map(p => p.id));
                  const additionalPlaces = topPlaces
                    .filter(p => !selectedIdsSet.has(p.id))
                    .slice(0, limit - selectedPlaces.length);
                  selectedPlaces = [...selectedPlaces, ...additionalPlaces].slice(0, limit);
                  console.log('[GPT Search] Added', additionalPlaces.length, 'nearest places to reach limit');
                }
              } else {
                console.warn('[GPT Search] GPT returned empty selection, using nearest places');
                selectedPlaces = topPlaces.slice(0, limit);
              }
            } else {
              console.warn('[GPT Search] GPT returned invalid IDs, using nearest places');
              selectedPlaces = topPlaces.slice(0, limit);
            }
          } else {
            console.warn('[GPT Search] No JSON array found in GPT response, using nearest places');
            selectedPlaces = topPlaces.slice(0, limit);
          }
        } else {
          console.warn('[GPT Search] GPT returned empty text, using nearest places');
          selectedPlaces = topPlaces.slice(0, limit);
        }
      } catch (parseError) {
        console.warn('[GPT Search] Failed to parse GPT response, using nearest places:', parseError);
        // Используем ближайшие места как fallback
        selectedPlaces = topPlaces.slice(0, limit);
      }
    } else {
      console.warn('[GPT Search] GPT request failed, using nearest places');
      // Используем ближайшие места как fallback
      selectedPlaces = topPlaces.slice(0, limit);
    }

    // Формируем результат
    const result = selectedPlaces.map((place) => {
      const resultPlace: {
        id: string;
        name: string;
        lat: number;
        lng: number;
        city: string;
        cityId: string;
        category: string[];
        tags: Record<string, unknown>;
        price_kzt?: number;
        stars?: number;
        distanceKm?: number;
      } = {
        id: place.id,
        name: place.name,
        lat: place.lat,
        lng: place.lon,
        city: place.cityName,
        cityId: place.cityId,
        category: Array.isArray(place.category) ? place.category : [],
        tags: place.tags || {},
        price_kzt: place.price_kzt,
        stars: place.stars,
      };

      if (lat && lng && place.distanceKm) {
        resultPlace.distanceKm = place.distanceKm;
      } else if (lat && lng) {
        resultPlace.distanceKm = Number(
          haversineDistance({ lat, lng }, { lat: place.lat, lng: place.lon }).toFixed(1)
        );
      }

      return resultPlace;
    });

    // Вычисляем средний прайс
    const prices = result
      .map((p) => p.price_kzt)
      .filter((p): p is number => typeof p === 'number' && p > 0);
    const avgPrice = prices.length > 0
      ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      : undefined;

    return NextResponse.json({
      count: result.length,
      total: allPlaces.length,
      places: result,
      avgPrice,
    });
  } catch (error) {
    console.error('[API /places/gpt-search] error', error);
    return NextResponse.json(
      { error: 'Unable to search places with GPT', count: 0, places: [] },
      { status: 500 }
    );
  }
}

