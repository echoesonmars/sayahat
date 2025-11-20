'use client';

import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

import { Circle, MapContainer, Marker, Popup, TileLayer, Polyline, useMap } from 'react-leaflet';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import L, { LatLngExpression } from 'leaflet';
import type {} from 'leaflet-routing-machine';
import type {
  Coordinates,
  RouteInstruction,
  RouteStats,
} from '@/lib/geo';
import { DEFAULT_CENTER_COORDS, computeRouteStats } from '@/lib/geo';

type WindowWithLeaflet = Window & { L: typeof L };

type ContactLocation = {
  id: string;
  name: string;
  location: { lat: number; lng: number; timestamp: string };
};

type DeviceLocationMapProps = {
  position: LatLngExpression | null;
  isLocating: boolean;
  hasError: boolean;
  routePlan?: RouteInstruction | null;
  contacts?: ContactLocation[];
};

const defaultIcon = L.divIcon({
  className: '',
  html: `
    <span style="
      width:42px;
      height:42px;
      display:flex;
      align-items:center;
      justify-content:center;
      border-radius:50%;
      background:radial-gradient(circle at 30% 30%, #ffffff 0%, #d8fff1 60%, #00a36c 100%);
      box-shadow:0 10px 25px rgba(0,163,108,0.35);
      border:2px solid #ffffff;
    ">
      <span style="
        width:12px;
        height:12px;
        border-radius:50%;
        background:#006948;
        box-shadow:0 0 0 6px rgba(0,163,108,0.2);
        display:block;
      "></span>
    </span>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  popupAnchor: [0, -24],
});

const DEFAULT_CENTER: LatLngExpression = [DEFAULT_CENTER_COORDS.lat, DEFAULT_CENTER_COORDS.lng];
const MARKER_COLORS = ['#00A36C', '#F59E0B', '#2563EB', '#EF4444', '#7C3AED'];

function MapRelocator({ position }: { position: LatLngExpression | null }) {
  const map = useMap();
  const hasUserMovedRef = useRef(false);
  const initialPositionSetRef = useRef(false);

  useEffect(() => {
    // Устанавливаем начальную позицию только один раз
    if (position && !initialPositionSetRef.current) {
      map.flyTo(position, 13, { duration: 1.2 });
      initialPositionSetRef.current = true;
    }
  }, [map, position]);

  useEffect(() => {
    // Проверяем, мобильное ли устройство
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    
    // Отслеживаем перемещение карты пользователем (только на мобильных)
    if (!isMobile) return;

    const handleDragStart = () => {
      hasUserMovedRef.current = true;
    };

    const handleMoveEnd = () => {
      // Флаг остается true, чтобы карта не возвращалась автоматически
    };

    map.on('dragstart', handleDragStart);
    map.on('moveend', handleMoveEnd);

    return () => {
      map.off('dragstart', handleDragStart);
      map.off('moveend', handleMoveEnd);
    };
  }, [map]);

  // На мобильных устройствах не возвращаем карту автоматически после того, как пользователь её переместил
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (!isMobile) return; // На десктопе работаем как обычно
    
    if (position && hasUserMovedRef.current) {
      // Не перемещаем карту, если пользователь уже её переместил
      return;
    }
  }, [map, position]);

  return null;
}

type RoutingControl = L.Routing.Control;
type RoutingControlOptionsWithMarker = L.Routing.RoutingControlOptions & {
  createMarker?: (index: number, waypoint: L.Routing.Waypoint, total: number) => L.Marker | null;
};

function RoutingMachine({ waypoints }: { waypoints: LatLngExpression[] }) {
  const map = useMap();
  const routingControlRef = useRef<RoutingControl | null>(null);

  useEffect(() => {
    return () => {
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }
    };
  }, [map]);

  useEffect(() => {
    if (waypoints.length < 2) return;

    if (typeof window !== 'undefined') {
      (window as WindowWithLeaflet).L = L;
    }

    let isCancelled = false;

    (async () => {
      await import('leaflet-routing-machine');
      if (isCancelled || !L.Routing) return;

      const routingWaypoints: L.Routing.Waypoint[] = waypoints.map((point) => L.Routing.waypoint(L.latLng(point)));

      const routingOptions: RoutingControlOptionsWithMarker = {
        waypoints: routingWaypoints,
        router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1' }),
        lineOptions: {
          styles: [{ color: '#00A36C', weight: 5, opacity: 0.85 }],
          extendToWaypoints: true,
          missingRouteTolerance: 10,
        },
        addWaypoints: false,
        fitSelectedRoutes: false,
        show: false,
        routeWhileDragging: false,
        collapsible: true,
        createMarker: () => null,
      };

      if (!routingControlRef.current) {
        routingControlRef.current = L.Routing.control(routingOptions).addTo(map);
        return;
      }

      routingControlRef.current.getPlan().setWaypoints(routingWaypoints);
    })();

    return () => {
      isCancelled = true;
    };
  }, [map, waypoints]);

  return null;
}


function normalizeLatLng(position: LatLngExpression | null): LatLngExpression | null {
  if (!position) return null;
  if (Array.isArray(position)) return position;
  const candidate = position as { lat?: number; lng?: number };
  if (typeof candidate.lat === 'number' && typeof candidate.lng === 'number') {
    return [candidate.lat, candidate.lng];
  }
  return null;
}

function latLngToCoords(value: LatLngExpression | null): Coordinates | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    const [lat, lng] = value;
    return { lat, lng };
  }
  const anyValue = value as { lat?: number; lng?: number };
  if (typeof anyValue.lat === 'number' && typeof anyValue.lng === 'number') {
    return { lat: anyValue.lat, lng: anyValue.lng };
  }
  return null;
}

function coordsEqual(a: Coordinates | null, b: Coordinates | null) {
  if (!a || !b) return false;
  return Number(a.lat.toFixed(5)) === Number(b.lat.toFixed(5)) && Number(a.lng.toFixed(5)) === Number(b.lng.toFixed(5));
}

function formatDistance(km: number | undefined) {
  if (typeof km !== 'number' || Number.isNaN(km)) return '—';
  return `${km.toFixed(1)} км`;
}

function formatDuration(hours: number | undefined) {
  if (typeof hours !== 'number' || Number.isNaN(hours)) return '—';
  if (hours < 1) {
    return `${Math.round(hours * 60)} мин`;
  }
  return `${hours.toFixed(1)} ч`;
}

function createWaypointIcon(label: string, color: string) {
  return L.divIcon({
    className: '',
    html: `
      <span style="
        width:32px;
        height:32px;
        display:flex;
        align-items:center;
        justify-content:center;
        border-radius:50%;
        background:${color};
        color:#fff;
        font-weight:600;
        font-size:13px;
        box-shadow:0 10px 25px rgba(0,0,0,0.2);
        border:2px solid #fff;
      ">
        ${label}
      </span>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -28],
  });
}

function createContactIcon() {
  return L.divIcon({
    className: '',
    html: `
      <span style="
        width:36px;
        height:36px;
        display:flex;
        align-items:center;
        justify-content:center;
        border-radius:50%;
        background:radial-gradient(circle at 30% 30%, #ffffff 0%, #fff4e6 60%, #f59e0b 100%);
        box-shadow:0 10px 25px rgba(245,158,11,0.35);
        border:2px solid #ffffff;
      ">
        <span style="
          width:14px;
          height:14px;
          border-radius:50%;
          background:#f59e0b;
          box-shadow:0 0 0 6px rgba(245,158,11,0.2);
          display:block;
        "></span>
      </span>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

export function DeviceLocationMap({ position, isLocating, hasError, routePlan, contacts = [] }: DeviceLocationMapProps) {
  const normalizedPosition = normalizeLatLng(position);
  const userCoords = latLngToCoords(normalizedPosition) ?? DEFAULT_CENTER_COORDS;
  const hasRoute = Boolean(routePlan && routePlan.destination);
  const [panelsVisible, setPanelsVisible] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setPanelsVisible(false);
    }
  }, []);

  const togglePanels = () => setPanelsVisible((prev) => !prev);

  const routeCoordinates = useMemo<Coordinates[]>(() => {
    if (!hasRoute) return [];
    const coordsList: Coordinates[] = [];
    const origin = userCoords;
    coordsList.push(origin);

    const viaPoints = routePlan?.via?.filter((stop): stop is Coordinates => Boolean(stop?.lat && stop?.lng));
    if (viaPoints?.length) {
      coordsList.push(...viaPoints);
    }

    const destination = routePlan?.destination ?? origin;
    if (!coordsEqual(origin, destination)) {
      coordsList.push(destination);
    }

    return coordsList;
  }, [hasRoute, routePlan, userCoords]);

  const routedWaypoints = useMemo<LatLngExpression[]>(() => {
    if (!routeCoordinates.length) return [];
    return routeCoordinates.map((coords) => [coords.lat, coords.lng]);
  }, [routeCoordinates]);

  const routeStats = useMemo<RouteStats | null>(() => {
    if (routeCoordinates.length < 2) return null;
    return computeRouteStats(routeCoordinates);
  }, [routeCoordinates]);

  const nextLeg = routeStats?.segments[0];
  const totalDistanceLabel = formatDistance(routeStats?.totalKm);
  const totalDurationLabel = formatDuration(routeStats?.totalHours);
  const nextDistanceLabel = formatDistance(nextLeg?.distanceKm);
  const nextDurationLabel = formatDuration(nextLeg?.durationHours);

  const routeAnimationKey = hasRoute ? JSON.stringify(routePlan) : 'no-route';
  const showHints = panelsVisible && Boolean(routePlan?.hints?.length);
  const showDetails = panelsVisible && Boolean(routePlan?.note || routeStats);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-[#006948]/15 bg-[#F4FFFA] shadow-[0_25px_80px_rgba(0,105,72,0.08)] min-h-[420px] sm:min-h-[520px] lg:min-h-[360px]">
      <MapContainer
        center={normalizedPosition ?? routedWaypoints[0] ?? DEFAULT_CENTER}
        zoom={normalizedPosition ? 13 : 6}
        scrollWheelZoom
        className="h-full w-full grayscale-[0.05] contrast-[1.05] saturate-[1.05]"
        zoomControl={false}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        <MapRelocator position={position} />

        {hasRoute && routedWaypoints.length >= 2 && (
          <>
            <RoutingMachine waypoints={routedWaypoints} />
            <Polyline
              positions={routedWaypoints}
              pathOptions={{
                color: '#00C77F',
                weight: 4,
                opacity: 0.45,
                dashArray: '8 10',
                lineCap: 'round',
              }}
            />
          </>
        )}

        {hasRoute &&
          routedWaypoints.map((point, index) => {
            const color = MARKER_COLORS[index % MARKER_COLORS.length];
            const label = String.fromCharCode(65 + index);
            const icon = createWaypointIcon(label, color);
            const isLast = index === routedWaypoints.length - 1;
            const title = isLast ? 'Финиш маршрута' : index === 0 ? 'Старт маршрута' : `Точка ${label}`;
            return (
              <Marker key={`waypoint-${label}`} position={point} icon={icon}>
                <Popup>
                  <span className="font-semibold">{title}</span>
                  <br />
                  Координаты: {routeCoordinates[index]?.lat.toFixed(3)}, {routeCoordinates[index]?.lng.toFixed(3)}
                </Popup>
              </Marker>
            );
          })}

        {normalizedPosition && (
          <>
            <Marker position={normalizedPosition} icon={defaultIcon}>
              <Popup>
                <span className="font-semibold">Вы здесь</span>
                <br />
                {hasRoute ? 'Маршрут обновлён с учётом вашей точки.' : 'Постройте маршрут, чтобы увидеть путь от вашей точки.'}
              </Popup>
            </Marker>
            <Circle center={normalizedPosition} radius={900} pathOptions={{ color: '#00d592', fillOpacity: 0.12 }} />
          </>
        )}

        {contacts.map((contact) => {
          if (!contact.location) return null;
          const contactPosition: LatLngExpression = [contact.location.lat, contact.location.lng];
          const timestamp = new Date(contact.location.timestamp).toLocaleString('ru-RU', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });
          return (
            <Marker key={contact.id} position={contactPosition} icon={createContactIcon()}>
              <Popup>
                <span className="font-semibold">{contact.name}</span>
                <br />
                <span className="text-xs text-gray-600">Обновлено: {timestamp}</span>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#002b18]/20 via-transparent to-transparent mix-blend-multiply" />

      {/* Верхняя панель с кнопками и статусом */}
      <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 z-[1000] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
        {/* Статус локации */}
        <div className="rounded-full bg-white/95 px-3 sm:px-4 py-1.5 sm:py-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.25em] sm:tracking-[0.3em] text-[#006948] shadow-lg whitespace-nowrap">
          {hasError ? 'не удалось получить геоданные' : isLocating ? 'определяем координаты...' : 'локация найдена'}
        </div>

        {/* Кнопка показать/скрыть панели */}
        <button
          type="button"
          onClick={togglePanels}
          className="rounded-full border border-white/60 bg-white/90 px-3 sm:px-4 py-1.5 sm:py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.25em] sm:tracking-[0.3em] text-[#006948] shadow-md transition hover:bg-white whitespace-nowrap flex-shrink-0"
        >
          {panelsVisible ? 'Скрыть панели' : 'Показать панели'}
        </button>
      </div>

      {hasRoute && (
        <motion.div
          key={routeAnimationKey}
          className="pointer-events-none absolute left-0 top-0 h-1 bg-gradient-to-r from-[#00D592] via-[#00A36C] to-[#00724E]"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ transformOrigin: 'left center' }}
        />
      )}

      {showHints ? (
        <div className="absolute left-3 sm:left-4 right-3 sm:right-4 top-16 sm:top-20 lg:top-24 lg:right-4 lg:left-auto lg:w-[260px] z-[999] rounded-2xl border border-[#006948]/10 bg-white/90 p-3 sm:p-4 text-sm text-[#0F2D1E] shadow-lg backdrop-blur">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.35em] text-[#00A36C]">подсказки</p>
          <ul className="mt-2 space-y-2 list-disc pl-4 text-[#0F2D1E]">
            {routePlan?.hints?.map((hint, index) => {
              // Поддерживаем как строки, так и объекты
              const hintText = typeof hint === 'string' ? hint : (hint?.instruction || String(hint));
              return (
                <li key={`hint-${index}`} className="text-[11px] sm:text-xs leading-relaxed break-words">
                  {hintText}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {showDetails && (
        <div className="absolute left-3 sm:left-4 right-3 sm:right-4 bottom-3 sm:bottom-4 z-[999] flex flex-col gap-3 sm:flex-row lg:right-4">
          {routePlan?.note && (
            <div className="rounded-2xl border border-[#006948]/15 bg-white/85 p-3 sm:p-4 text-sm text-[#0F2D1E] shadow-lg backdrop-blur sm:flex-1">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.35em] text-[#00A36C]">комментарий</p>
              <p className="mt-2 text-[12px] sm:text-sm leading-snug text-[#08331F] break-words">{routePlan.note}</p>
            </div>
          )}

          {routeStats && (
            <div className="rounded-2xl border border-white/60 bg-white/85 p-3 sm:p-4 text-[#0F2D1E] shadow-[0_20px_45px_rgba(0,0,0,0.12)] backdrop-blur sm:flex-1">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.35em] text-[#00A36C]">следующая точка</p>
              <p className="mt-2 text-xl sm:text-2xl font-semibold tracking-[-0.05em]">
                {nextDistanceLabel} · {nextDurationLabel}
              </p>
              <p className="mt-3 text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.35em] text-[#7A8C85]">маршрут целиком</p>
              <p className="mt-1 text-xs sm:text-sm font-semibold tracking-[-0.03em] text-[#08331F]">
                {totalDistanceLabel} · {totalDurationLabel}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

