export type Coordinates = {
  lat: number;
  lng: number;
};

export type RouteHint = string | { instruction: string; distance?: number; time?: number; sign?: number };

export type RouteInstruction = {
  origin?: Coordinates;
  destination: Coordinates;
  via?: Coordinates[];
  note?: string;
  hints?: RouteHint[];
};

export type RouteSegmentStat = {
  fromIndex: number;
  toIndex: number;
  distanceKm: number;
  durationHours: number;
};

export type RouteStats = {
  totalKm: number;
  totalHours: number;
  segments: RouteSegmentStat[];
};

export const DEFAULT_CENTER_COORDS: Coordinates = { lat: 51.128, lng: 71.43 };
export const DEFAULT_DESTINATION_COORDS: Coordinates = { lat: 43.238949, lng: 76.889709 };
export const DEFAULT_TRAVEL_SPEED_KMH = 70;

type Place = {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  tags: string[];
};

const SAMPLE_PLACES: Place[] = [
  {
    id: 'almaty-1',
    name: 'Кок-Тобе',
    city: 'Алматы',
    lat: 43.238949,
    lng: 76.889709,
    tags: ['панорамы', 'канатка', 'городской отдых'],
  },
  {
    id: 'almaty-2',
    name: 'Медеу',
    city: 'Алматы',
    lat: 43.2263,
    lng: 77.0501,
    tags: ['спорт', 'природа'],
  },
  {
    id: 'shymkent-1',
    name: 'Цитадель Шымкента',
    city: 'Шымкент',
    lat: 42.3188,
    lng: 69.5969,
    tags: ['история', 'музей'],
  },
  {
    id: 'shymkent-2',
    name: 'Этноаул Каскасу',
    city: 'Шымкент',
    lat: 42.3676,
    lng: 69.9151,
    tags: ['этно', 'природа', 'семейный отдых'],
  },
];

export function isValidCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== 'object') return false;
  const maybe = value as { lat?: unknown; lng?: unknown };
  return typeof maybe.lat === 'number' && typeof maybe.lng === 'number';
}

export function haversineDistance(a: Coordinates, b: Coordinates) {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const c = 2 * Math.asin(Math.sqrt(sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng));
  return R * c;
}

export function findNearbyPlaces(coords: Coordinates, limit = 3) {
  return SAMPLE_PLACES.map((place) => ({
    place,
    distance: haversineDistance(coords, { lat: place.lat, lng: place.lng }),
  }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(({ place, distance }) => ({
      id: place.id,
      name: place.name,
      city: place.city,
      tags: place.tags,
      distanceKm: Number(distance.toFixed(1)),
    }));
}

export function buildNearbyPlacesContext(coords: Coordinates | null) {
  if (!coords) return null;
  const nearby = findNearbyPlaces(coords);
  if (!nearby.length) return null;

  const list = nearby
    .map(
      (item, index) =>
        `${index + 1}. ${item.name} (${item.city}) · ${item.distanceKm} км · ${item.tags.slice(0, 3).join(', ')}`,
    )
    .join('\n');

  return `У пользователя включен доступ к геолокации. Координаты: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(
    4,
  )}. Эта точка считается стартом (origin) любого маршрута; не выдумывай отдельную точку А. В радиусе оказались места:\n${list}\nИспользуй их в подсказках или сравнениях, если уместно.`;
}

export function computeRouteStats(points: Coordinates[], speedKmh: number = DEFAULT_TRAVEL_SPEED_KMH): RouteStats | null {
  if (!points || points.length < 2) return null;

  const segments: RouteSegmentStat[] = [];
  let totalKm = 0;

  for (let i = 0; i < points.length - 1; i += 1) {
    const distance = haversineDistance(points[i], points[i + 1]);
    const durationHours = Math.max(distance / speedKmh, 1 / 60); // minimum 1 minute
    totalKm += distance;
    segments.push({
      fromIndex: i,
      toIndex: i + 1,
      distanceKm: Number(distance.toFixed(1)),
      durationHours: Number(durationHours.toFixed(2)),
    });
  }

  return {
    totalKm: Number(totalKm.toFixed(1)),
    totalHours: Number((totalKm / speedKmh).toFixed(2)),
    segments,
  };
}

