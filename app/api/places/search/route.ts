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
    shop?: string;
    name?: string;
    'addr:place'?: string;
    'addr:housenumber'?: string;
    opening_hours?: string;
    phone?: string;
    website?: string;
    email?: string;
  };
  price_kzt?: number;
  stars?: number;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const cityId = searchParams.get('cityId'); // Опционально: ID города (Шымкент или Алматы)
    const lat = searchParams.get('lat') ? Number(searchParams.get('lat')) : null;
    const lng = searchParams.get('lng') ? Number(searchParams.get('lng')) : null;
    const limit = Number(searchParams.get('limit')) || 50;
    const category = searchParams.get('category'); // Опционально: фильтр по категории

    const { db } = await connectToDatabase();

    console.log('[Places Search] Query:', { query, cityId, lat, lng, limit, category });

    // Получаем города из коллекции towns
    const { ObjectId } = await import('mongodb');
    const townsQuery: { _id?: typeof ObjectId.prototype } = {};
    if (cityId) {
      if (ObjectId.isValid(cityId)) {
        townsQuery._id = new ObjectId(cityId);
      }
    }

    const towns = await db.collection('towns').find(townsQuery).toArray();
    console.log('[Places Search] Found towns:', towns.length);
    
    if (towns.length > 0) {
      const firstTown = towns[0];
      const places = firstTown.items || firstTown.places || firstTown.Places || firstTown.data || [];
      console.log('[Places Search] First town structure:', {
        _id: firstTown._id?.toString(),
        name: firstTown.name || firstTown.meta?.name,
        hasItems: !!firstTown.items,
        hasPlacesField: !!firstTown.places,
        placesFound: !!places,
        placesType: Array.isArray(places) ? 'array' : typeof places,
        placesLength: Array.isArray(places) ? places.length : 'N/A',
        firstPlaceSample: Array.isArray(places) && places.length > 0 
          ? {
              keys: Object.keys(places[0] || {}),
              name: places[0]?.name || places[0]?.Name,
              hasCoords: !!(places[0]?.lat || places[0]?.Lat || places[0]?.lon || places[0]?.Lon),
            }
          : 'N/A',
      });
    }

    if (!towns.length) {
      console.log('[Places Search] No towns found');
      return NextResponse.json({ count: 0, places: [], debug: 'No towns found' });
    }

    // Собираем все места из всех городов
    const allPlaces: (PlaceFromTowns & { cityName: string; cityId: string })[] = [];

    for (const town of towns) {
      // Пробуем разные варианты названия поля, включая items
      const places = town.items || town.places || town.Places || town.data || [];
      const cityId = town._id?.toString() || '';
      // Определяем название города по ObjectId или из полей документа
      const cityName = CITY_NAMES[cityId] || town.name || town.Name || town.meta?.name || 'Неизвестный город';

      console.log(`[Places Search] Processing town: ${cityName}, places count: ${Array.isArray(places) ? places.length : 'not array'}`);

      if (!Array.isArray(places)) {
        console.log(`[Places Search] Town ${cityName} has no places array, skipping`);
        continue;
      }

      for (const place of places) {
        if (!place || typeof place !== 'object') {
          console.log('[Places Search] Skipping invalid place:', typeof place);
          continue;
        }

        // Проверяем соответствие поисковому запросу (если запрос не пустой)
        if (query && query.trim()) {
          const searchLower = query.toLowerCase().trim();
          const placeName = (place.name || place.Name || '').toLowerCase();
          const nameMatch = placeName.includes(searchLower);
          
          const placeCategory = place.category || place.Category || [];
          const categoryMatch = Array.isArray(placeCategory)
            ? placeCategory.some((cat: string) => String(cat).toLowerCase().includes(searchLower))
            : false;
          
          const placeTags = place.tags || place.Tags || {};
          let tagsMatch = false;
          if (placeTags && typeof placeTags === 'object') {
            // Проверяем все значения в тегах
            tagsMatch = Object.values(placeTags).some((val: unknown) => {
              if (val === null || val === undefined) return false;
              return String(val).toLowerCase().includes(searchLower);
            });
            
            // Также проверяем ключи тегов
            if (!tagsMatch) {
              tagsMatch = Object.keys(placeTags).some((key: string) => 
                key.toLowerCase().includes(searchLower)
              );
            }
          }

          // Проверяем shop в тегах
          if (!tagsMatch && placeTags?.shop) {
            tagsMatch = String(placeTags.shop).toLowerCase().includes(searchLower);
          }

          if (!nameMatch && !categoryMatch && !tagsMatch) {
            continue;
          }
        }
        // Если запрос пустой, показываем все места

        // Фильтр по категории
        if (category) {
          const categoryLower = category.toLowerCase();
          const placeCategory = place.category || place.Category || [];
          const hasCategory = Array.isArray(placeCategory)
            ? placeCategory.some((cat: string) => String(cat).toLowerCase() === categoryLower)
            : false;
          if (!hasCategory) {
            continue;
          }
        }

        // Проверяем наличие координат (пробуем разные варианты названий)
        const placeLat = place.lat || place.Lat || place.latitude || place.Latitude;
        const placeLon = place.lon || place.Lon || place.longitude || place.Longitude || place.lng || place.Lng;
        
        if (typeof placeLat !== 'number' || typeof placeLon !== 'number') {
          console.log('[Places Search] Skipping place without valid coordinates:', {
            name: place.name || place.Name,
            lat: placeLat,
            lon: placeLon,
          });
          continue;
        }

        // Создаем ID для места, если его нет
        const placeId = place.id || place._id?.toString() || `place_${cityId}_${allPlaces.length}`;
        
        allPlaces.push({
          id: placeId,
          name: place.name || place.Name || 'Без названия',
          lat: placeLat,
          lon: placeLon,
          category: place.category || place.Category || [],
          tags: place.tags || place.Tags || {},
          price_kzt: place.price_kzt,
          stars: place.stars,
          cityName,
          cityId,
        });
      }
    }

    // Вычисляем расстояние, если есть координаты
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
      } = {
        id: place.id || `place_${place.cityId}_${Math.random().toString(36).substr(2, 9)}`,
        name: place.name || 'Без названия',
        lat: place.lat,
        lng: place.lon,
        city: place.cityName,
        cityId: place.cityId,
        category: Array.isArray(place.category) ? place.category : [],
        tags: place.tags || {},
        price_kzt: place.price_kzt,
        stars: place.stars,
      };

      if (lat !== null && lng !== null) {
        result.distanceKm = Number(
          haversineDistance({ lat, lng }, { lat: place.lat, lng: place.lon }).toFixed(1),
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

    // Ограничиваем количество результатов
    const limitedPlaces = enrichedPlaces.slice(0, limit);

    console.log('[Places Search] Final results:', {
      query: query || '(empty - showing all)',
      townsProcessed: towns.length,
      allPlacesBeforeFilter: allPlaces.length,
      enrichedPlaces: enrichedPlaces.length,
      limitedPlaces: limitedPlaces.length,
      sampleResult: limitedPlaces.length > 0 ? {
        id: limitedPlaces[0].id,
        name: limitedPlaces[0].name,
        city: limitedPlaces[0].city,
        category: limitedPlaces[0].category,
        hasTags: !!limitedPlaces[0].tags,
        hasCoords: !!(limitedPlaces[0].lat && limitedPlaces[0].lng),
      } : null,
    });

    return NextResponse.json({
      count: limitedPlaces.length,
      total: allPlaces.length,
      places: limitedPlaces,
      debug: process.env.NODE_ENV === 'development' ? {
        query,
        townsFound: towns.length,
        allPlacesCount: allPlaces.length,
        enrichedCount: enrichedPlaces.length,
      } : undefined,
    });
  } catch (error) {
    console.error('[API /places/search] error', error);
    return NextResponse.json({ error: 'Unable to search places', count: 0, places: [] }, { status: 500 });
  }
}

