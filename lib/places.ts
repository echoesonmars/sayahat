import type { Db } from 'mongodb';
import { Coordinates, haversineDistance } from './geo';

export type PlaceRecord = {
  _id?: string;
  name?: string;
  city?: string;
  lat?: number;
  lng?: number;
  tags?: string[];
  description?: string;
};

type NearbyPlace = PlaceRecord & { distanceKm?: number };

export async function getNearbyPlacesFromDb(db: Db, coords: Coordinates | null, limit = 5) {
  const allPlaces: NearbyPlace[] = [];

  // Получаем места из коллекции places
  try {
    const cursor = db.collection<PlaceRecord>('places').find({}).limit(200);
    const documents = await cursor.toArray();

    const enriched: NearbyPlace[] = documents.map((doc) => {
      if (coords && typeof doc.lat === 'number' && typeof doc.lng === 'number') {
        return {
          ...doc,
          distanceKm: Number(haversineDistance(coords, { lat: doc.lat, lng: doc.lng }).toFixed(1)),
        };
      }
      return doc;
    });

    allPlaces.push(...enriched);
  } catch (error) {
    console.warn('[getNearbyPlacesFromDb] Failed to fetch from places collection', error);
  }

  // Получаем места из коллекции towns
  try {
    const towns = await db.collection('towns').find({}).toArray();

    for (const town of towns) {
      const places = town.places || [];
      const cityName = town.name || 'Неизвестный город';

      for (const place of places) {
        if (!place || typeof place !== 'object') continue;
        if (typeof place.lat !== 'number' || typeof place.lon !== 'number') continue;

        const placeRecord: NearbyPlace = {
          _id: place.id,
          name: place.name || 'Без названия',
          city: cityName,
          lat: place.lat,
          lng: place.lon,
          tags: place.category || [],
          description: place.tags?.name || place.tags?.['addr:place'] || undefined,
        };

        if (coords) {
          placeRecord.distanceKm = Number(
            haversineDistance(coords, { lat: place.lat, lng: place.lon }).toFixed(1),
          );
        }

        allPlaces.push(placeRecord);
      }
    }
  } catch (error) {
    console.warn('[getNearbyPlacesFromDb] Failed to fetch from towns collection', error);
  }

  if (!allPlaces.length) return [];

  // Сортируем по расстоянию, если есть координаты
  const sorted = coords
    ? allPlaces
        .filter((place) => typeof place.distanceKm === 'number')
        .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
    : allPlaces;

  return sorted.slice(0, limit);
}

export function buildPlacesContextFromDocs(coords: Coordinates | null, places: NearbyPlace[]) {
  if (!places.length) return null;

  const header = coords
    ? `Маршрут планируется от координат ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(
        4,
      )}. Ниже актуальные места из базы:`
    : 'Ниже данные о популярных местах из базы:';

  const list = places
    .map((place, index) => {
      const distanceText =
        typeof place.distanceKm === 'number' ? ` · ${place.distanceKm} км` : '';
      const tagsText =
        place.tags && place.tags.length ? ` · ${place.tags.slice(0, 3).join(', ')}` : '';
      return `${index + 1}. ${place.name ?? 'Без названия'} (${place.city ?? 'город'})${distanceText}${tagsText}`;
    })
    .join('\n');

  return `${header}\n${list}\nИспользуй эти факты, когда предлагаешь маршруты, и создавай origin только из координат пользователя.`;
}

