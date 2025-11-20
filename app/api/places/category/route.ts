import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { haversineDistance } from '@/lib/geo';

export const runtime = 'nodejs';

// Маппинг ObjectId на названия городов
const CITY_NAMES: Record<string, string> = {
  '691c9b692f57d6e91156d18a': 'Шымкент',
  '691c9b892f57d6e91156d18b': 'Алматы',
  '691f5027819a19c6c6a57e12': 'Астана',
};

const CATEGORY_MAPPING: Record<string, Array<[string, string | null]>> = {
  attraction: [
    ['tourism', null],
    ['historic', null],
    ['leisure', 'theme_park'],
    ['leisure', 'park'],
    ['man_made', 'monument'],
  ],
  nature: [
    ['natural', null],
    ['leisure', 'nature_reserve'],
    ['leisure', 'park'],
  ],
  food: [
    ['amenity', 'restaurant'],
    ['amenity', 'cafe'],
    ['amenity', 'fast_food'],
    ['amenity', 'bar'],
    ['amenity', 'pub'],
  ],
  hotels: [
    ['tourism', 'hotel'],
    ['tourism', 'hostel'],
    ['tourism', 'guest_house'],
    ['tourism', 'motel'],
    ['amenity', 'lodging'],
  ],
  shopping: [
    ['shop', null],
    ['shop', 'mall'],
    ['shop', 'supermarket'],
    ['shop', 'convenience'],
    ['shop', 'souvenir'],
  ],
  transport: [
    ['aeroway', null],
    ['railway', null],
    ['public_transport', null],
    ['amenity', 'bus_station'],
    ['highway', 'bus_stop'],
    ['amenity', 'ferry_terminal'],
  ],
  safety: [
    ['amenity', 'hospital'],
    ['amenity', 'police'],
    ['amenity', 'pharmacy'],
    ['emergency', null],
    ['amenity', 'fire_station'],
  ],
  services: [
    ['amenity', 'bank'],
    ['amenity', 'atm'],
    ['amenity', 'post_office'],
    ['office', null],
  ],
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
  opening_hours?: string;
  phone?: string;
  website?: string;
  email?: string;
};

function matchesCategory(place: PlaceFromTowns, categoryKey: string): boolean {
  const categoryRules = CATEGORY_MAPPING[categoryKey];
  if (!categoryRules) return false;

  const placeTags = place.tags || {};
  const placeCategory = place.category || [];

  for (const [key, value] of categoryRules) {
    // Проверяем в тегах
    if (placeTags[key]) {
      if (value === null || placeTags[key] === value) {
        return true;
      }
    }
    // Проверяем в категориях
    if (placeCategory.includes(key) || placeCategory.includes(`${key}:${value}`)) {
      return true;
    }
  }

  return false;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const cityFilter = searchParams.get('city'); // Фильтр по городу
    const lat = searchParams.get('lat') ? Number(searchParams.get('lat')) : null;
    const lng = searchParams.get('lng') ? Number(searchParams.get('lng')) : null;
    const limit = Number(searchParams.get('limit')) || 50;

    if (!category || !CATEGORY_MAPPING[category]) {
      return NextResponse.json(
        { error: 'Invalid category', availableCategories: Object.keys(CATEGORY_MAPPING) },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    console.log('[Places Category] Query:', { category, lat, lng, limit });

    // Получаем все города
    const towns = await db.collection('towns').find({}).toArray();
    console.log('[Places Category] Found towns:', towns.length);

    if (towns.length === 0) {
      return NextResponse.json({ count: 0, places: [] });
    }

    // Собираем все места из всех городов, соответствующие категории
    const allPlaces: (PlaceFromTowns & { cityName: string; cityId: string })[] = [];

    for (const town of towns) {
      // Пробуем разные варианты названия поля, включая items
      const places = town.items || town.places || town.Places || town.data || [];
      const cityId = town._id?.toString() || '';
      // Определяем название города по ObjectId или из полей документа
      const cityName = CITY_NAMES[cityId] || town.name || town.Name || town.meta?.name || 'Неизвестный город';
      
      // Фильтруем по городу, если указан
      if (cityFilter && cityFilter !== 'all' && cityName !== cityFilter) {
        continue;
      }

      console.log(`[Places Category] Processing town: ${cityName}, places count: ${Array.isArray(places) ? places.length : 'not array'}`);

      if (!Array.isArray(places)) {
        console.log(`[Places Category] Town ${cityName} has no places array, skipping`);
        continue;
      }

      for (const place of places) {
        if (!place || typeof place !== 'object') {
          console.log('[Places Category] Skipping invalid place:', typeof place);
          continue;
        }

        const placeLat = place.lat || place.Lat || place.latitude || place.Latitude;
        const placeLon = place.lon || place.Lon || place.longitude || place.Longitude || place.lng || place.Lng;

        if (typeof placeLat !== 'number' || typeof placeLon !== 'number') {
          if (allPlaces.length < 3) {
            console.log('[Places Category] Skipping place without valid coordinates:', {
              name: place.name || place.Name,
              lat: placeLat,
              lon: placeLon,
              placeKeys: Object.keys(place),
            });
          }
          continue;
        }

        const normalizedPlace: PlaceFromTowns = {
          id: place.id || place._id?.toString() || `place_${cityId}_${allPlaces.length}`,
          name: place.name || place.Name || 'Без названия',
          lat: placeLat,
          lon: placeLon,
          category: place.category || place.Category || [],
          tags: place.tags || place.Tags || {},
          price_kzt: place.price_kzt,
          stars: place.stars,
          opening_hours: place.opening_hours,
          phone: place.phone,
          website: place.website,
          email: place.email,
        };

        if (matchesCategory(normalizedPlace, category)) {
          allPlaces.push({
            ...normalizedPlace,
            cityName,
            cityId,
          });
        }
      }
    }

    console.log('[Places Category] Filtered places:', allPlaces.length);
    if (allPlaces.length === 0 && towns.length > 0) {
      const firstTown = towns[0];
      const samplePlaces = firstTown.items || firstTown.places || firstTown.Places || firstTown.data || [];
      if (Array.isArray(samplePlaces) && samplePlaces.length > 0) {
        const samplePlace = samplePlaces[0];
        console.log('[Places Category] Sample place structure:', {
          keys: Object.keys(samplePlace || {}),
          name: samplePlace?.name || samplePlace?.Name,
          tags: samplePlace?.tags || samplePlace?.Tags,
          category: samplePlace?.category || samplePlace?.Category,
          matchesCategory: matchesCategory({
            id: samplePlace?.id || '',
            name: samplePlace?.name || samplePlace?.Name || '',
            lat: samplePlace?.lat || samplePlace?.Lat || 0,
            lon: samplePlace?.lon || samplePlace?.Lon || 0,
            category: samplePlace?.category || samplePlace?.Category || [],
            tags: samplePlace?.tags || samplePlace?.Tags || {},
          }, category),
        });
      }
    }

    // Вычисляем расстояние и обогащаем данные
    let enrichedPlaces = allPlaces.map((place) => {
      const result: {
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
        opening_hours?: string;
        phone?: string;
        website?: string;
        email?: string;
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
        opening_hours: place.opening_hours,
        phone: place.phone,
        website: place.website,
        email: place.email,
      };

      if (lat !== null && lng !== null) {
        result.distanceKm = Number(
          haversineDistance({ lat, lng }, { lat: place.lat, lng: place.lon }).toFixed(1)
        );
      }

      return result;
    });

    // Сортируем по расстоянию, если есть координаты
    if (lat !== null && lng !== null) {
      enrichedPlaces = enrichedPlaces
        .filter((place) => typeof place.distanceKm === 'number')
        .sort((a, b) => (a.distanceKm || Infinity) - (b.distanceKm || Infinity));
    }

    // Используем GPT для выбора лучших мест (если есть API ключ)
    let selectedPlaces = enrichedPlaces.slice(0, limit);
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey && enrichedPlaces.length > 10) {
      try {
        // Берем топ 30 для GPT обработки
        const topPlaces = enrichedPlaces.slice(0, 30);
        
        const gptPrompt = `Выбери 10-15 лучших мест из списка для категории "${category}". 
Учитывай: рейтинг (stars), цену (price_kzt), расстояние от пользователя, наличие контактов (phone, website).
Верни только JSON массив с id мест в порядке приоритета: ["id1", "id2", ...]

Места:
${JSON.stringify(
          topPlaces.map((p) => ({
            id: p.id,
            name: p.name,
            stars: p.stars,
            price_kzt: p.price_kzt,
            distanceKm: p.distanceKm,
            hasPhone: !!p.phone,
            hasWebsite: !!p.website,
            city: p.city,
          })),
          null,
          2
        )}`;

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
                content: 'Ты помощник для выбора лучших мест. Отвечай только валидным JSON массивом ID.',
              },
              { role: 'user', content: gptPrompt },
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
        });

        if (gptResponse.ok) {
          const gptData = await gptResponse.json();
          const gptText = gptData.choices?.[0]?.message?.content?.trim();
          
          if (gptText) {
            try {
              // Пытаемся извлечь JSON из ответа
              const jsonMatch = gptText.match(/\[.*\]/s);
              const selectedIds = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
              
              if (Array.isArray(selectedIds) && selectedIds.length > 0) {
                const idMap = new Map(enrichedPlaces.map((p) => [p.id, p]));
                const gptSelected = selectedIds
                  .map((id: string) => idMap.get(id))
                  .filter((p): p is typeof enrichedPlaces[0] => p !== undefined);
                
                if (gptSelected.length > 0) {
                  selectedPlaces = gptSelected.slice(0, limit);
                  console.log('[Places Category] GPT selected:', selectedPlaces.length);
                }
              }
            } catch (parseError) {
              console.warn('[Places Category] Failed to parse GPT response:', parseError);
            }
          }
        }
      } catch (gptError) {
        console.warn('[Places Category] GPT selection failed, using default:', gptError);
      }
    }

    // Вычисляем средний прайс для категории
    const prices = selectedPlaces
      .map((p) => p.price_kzt)
      .filter((p): p is number => typeof p === 'number' && p > 0);
    const avgPrice = prices.length > 0
      ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      : undefined;

    return NextResponse.json({
      count: selectedPlaces.length,
      total: enrichedPlaces.length,
      places: selectedPlaces,
      category,
      avgPrice,
    });
  } catch (error) {
    console.error('[API /places/category] error', error);
    return NextResponse.json(
      { error: 'Unable to fetch places by category', count: 0, places: [] },
      { status: 500 }
    );
  }
}

