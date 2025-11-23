'use client';

import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

import { Circle, MapContainer, Marker, Popup, TileLayer, Polyline, useMap } from 'react-leaflet';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import L, { LatLngExpression } from 'leaflet';
import { Navigation, ZoomIn, ZoomOut, Locate } from 'lucide-react';
import type {} from 'leaflet-routing-machine';
import type {
  Coordinates,
  RouteInstruction,
  RouteStats,
} from '@/lib/geo';
import { DEFAULT_CENTER_COORDS, computeRouteStats } from '@/lib/geo';

// Тип для события routesfound (библиотека имеет неполные типы)
interface RoutesFoundEvent {
  routes?: Array<{
    coordinates?: L.LatLng[];
    summary?: {
      totalDistance?: number;
      totalTime?: number;
    };
  }>;
}

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
  onLocateClick?: () => void;
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

// Компонент с кнопками управления картой
function MapControls({ position, onLocateClick, hasDetails }: { position: LatLngExpression | null; onLocateClick?: () => void; hasDetails?: boolean }) {
  const map = useMap();
  const [isLocating, setIsLocating] = useState(false);

  const handleLocate = () => {
    if (onLocateClick) {
      onLocateClick();
    }
    
    if (typeof window !== 'undefined' && navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: LatLngExpression = [pos.coords.latitude, pos.coords.longitude];
          map.flyTo(loc, 15, { duration: 1.2 });
          setIsLocating(false);
        },
        () => {
          setIsLocating(false);
          // Если есть сохраненная позиция, центрируем на ней
          if (position) {
            map.flyTo(position, 15, { duration: 1.2 });
          }
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else if (position) {
      // Если геолокация недоступна, используем переданную позицию
      map.flyTo(position, 15, { duration: 1.2 });
    }
  };

  const handleZoomIn = () => {
    map.zoomIn();
  };

  const handleZoomOut = () => {
    map.zoomOut();
  };

  // Адаптируем позицию в зависимости от наличия нижних панелей
  // Используем более высокий отступ, чтобы кнопки не перекрывались с панелями
  const bottomOffset = hasDetails ? 'bottom-32 sm:bottom-40' : 'bottom-4 sm:bottom-6';

  return (
    <div className={`absolute ${bottomOffset} right-3 sm:right-4 z-[1000] flex flex-col gap-2 pointer-events-auto`}>
      {/* Кнопка определения локации */}
      <button
        type="button"
        onClick={handleLocate}
        disabled={isLocating}
        className="rounded-full bg-white/95 hover:bg-white border border-[#006948]/20 shadow-lg p-3 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Найти мою локацию"
      >
        {isLocating ? (
          <Navigation className="w-5 h-5 text-[#006948] animate-spin" />
        ) : (
          <Locate className="w-5 h-5 text-[#006948]" />
        )}
      </button>

      {/* Кнопки зума */}
      <div className="flex flex-col gap-2 rounded-full bg-white/95 border border-[#006948]/20 shadow-lg p-1">
        <button
          type="button"
          onClick={handleZoomIn}
          className="rounded-full bg-transparent hover:bg-[#006948]/10 p-2 transition-all duration-200 hover:scale-110 active:scale-95"
          title="Увеличить"
        >
          <ZoomIn className="w-4 h-4 text-[#006948]" />
        </button>
        <div className="h-px bg-[#006948]/20 mx-1" />
        <button
          type="button"
          onClick={handleZoomOut}
          className="rounded-full bg-transparent hover:bg-[#006948]/10 p-2 transition-all duration-200 hover:scale-110 active:scale-95"
          title="Уменьшить"
        >
          <ZoomOut className="w-4 h-4 text-[#006948]" />
        </button>
      </div>
    </div>
  );
}

// Компонент для построения маршрута по дорогам
function RoutingMachine({ waypoints, onRouteFound }: { waypoints: LatLngExpression[]; onRouteFound?: (coordinates: LatLngExpression[]) => void }) {
  const map = useMap();
  const routingControlRef = useRef<L.Routing.Control | null>(null);

  useEffect(() => {
    if (waypoints.length < 2) {
      console.log('[RoutingMachine] Недостаточно точек для маршрута:', waypoints.length);
      return;
    }

    let isCancelled = false;

    (async () => {
      try {
        await import('leaflet-routing-machine');
        if (isCancelled || !L.Routing) return;

        console.log('[RoutingMachine] 🚀 Начинаем построение маршрута');
        console.log('[RoutingMachine] Количество точек:', waypoints.length);
        console.log('[RoutingMachine] Точки:', waypoints);

        // Удаляем старый маршрут
        if (routingControlRef.current) {
          try {
            map.removeControl(routingControlRef.current);
            console.log('[RoutingMachine] Старый маршрут удален');
          } catch {
            console.warn('[RoutingMachine] Ошибка при удалении старого маршрута');
          }
          routingControlRef.current = null;
        }

        const routingWaypoints = waypoints.map((point) => L.Routing.waypoint(L.latLng(point)));
        console.log('[RoutingMachine] Waypoints для OSRM созданы:', routingWaypoints.length);

        const routingOptions: L.Routing.RoutingControlOptions = {
          waypoints: routingWaypoints,
          router: L.Routing.osrmv1({ 
            serviceUrl: 'https://router.project-osrm.org/route/v1',
            timeout: 15000, // 15 секунд таймаут
          }),
          lineOptions: {
            styles: [{ color: '#00A36C', weight: 6, opacity: 0.85 }],
            extendToWaypoints: true,
            missingRouteTolerance: 10,
          },
          addWaypoints: false,
          fitSelectedRoutes: false,
          show: false,
          routeWhileDragging: false,
          collapsible: false,
        };

        routingControlRef.current = L.Routing.control(routingOptions).addTo(map);
        console.log('[RoutingMachine] ✓ Контроль маршрута добавлен на карту, запрос к OSRM API...');

        // Обработка успешного построения
        routingControlRef.current.on('routesfound', (e: RoutesFoundEvent) => {
          if (isCancelled) return;
          const routes = e.routes;
          console.log('[RoutingMachine] ✓ ✓ ✓ МАРШРУТ ПО ДОРОГАМ ПОСТРОЕН!');
          console.log('[RoutingMachine] Количество маршрутов:', routes?.length || 0);
          if (routes && routes.length > 0) {
            const route = routes[0];
            console.log('[RoutingMachine] Координат в маршруте:', route.coordinates?.length || 0);
            console.log('[RoutingMachine] Дистанция:', route.summary?.totalDistance, 'метров');
            console.log('[RoutingMachine] Время:', route.summary?.totalTime, 'секунд');
            if (route.coordinates && onRouteFound) {
              const routeCoords: LatLngExpression[] = route.coordinates.map((coord: L.LatLng) => [coord.lat, coord.lng]);
              console.log('[RoutingMachine] Передаем координаты маршрута в компонент');
              onRouteFound(routeCoords);
            }
          }
        });

        // Обработка ошибок
        routingControlRef.current.on('routingerror', (e: L.Routing.RoutingErrorEvent) => {
          if (isCancelled) return;
          console.error('[RoutingMachine] ✗ ✗ ✗ ОШИБКА ПОСТРОЕНИЯ МАРШРУТА');
          console.error('[RoutingMachine] Сообщение:', e.error?.message);
          console.error('[RoutingMachine] Статус:', e.error?.status);
          console.error('[RoutingMachine] Полная ошибка:', e.error);
        });

      } catch (error) {
        console.error('[RoutingMachine] ✗ Ошибка загрузки библиотеки:', error);
      }
    })();

    return () => {
      isCancelled = true;
      if (routingControlRef.current) {
        try {
          map.removeControl(routingControlRef.current);
        } catch {
          // Игнорируем ошибки
        }
        routingControlRef.current = null;
      }
    };
  }, [waypoints, map, onRouteFound]);

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

export function DeviceLocationMap({ position, isLocating, hasError, routePlan, contacts = [], onLocateClick }: DeviceLocationMapProps) {
  const normalizedPosition = normalizeLatLng(position);
  const userCoords = latLngToCoords(normalizedPosition) ?? DEFAULT_CENTER_COORDS;
  const hasRoute = Boolean(routePlan && routePlan.destination);
  const [panelsVisible, setPanelsVisible] = useState(true);
  const [routePath, setRoutePath] = useState<LatLngExpression[]>([]);
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);

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

  // Сбрасываем состояние при изменении маршрута
  useEffect(() => {
    if (hasRoute) {
      setRoutePath([]);
      setIsRoutingLoading(true);
      // Таймаут на случай, если маршрут не построится
      const timeout = setTimeout(() => {
        setIsRoutingLoading(false);
      }, 15000); // 15 секунд максимум
      return () => clearTimeout(timeout);
    } else {
      setRoutePath([]);
      setIsRoutingLoading(false);
    }
  }, [hasRoute, routeAnimationKey]);

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
        <MapControls position={position} onLocateClick={onLocateClick} hasDetails={showDetails} />

        {hasRoute && routedWaypoints.length >= 2 && (
          <>
            <RoutingMachine 
              key={routeAnimationKey}
              waypoints={routedWaypoints}
              onRouteFound={(coordinates) => {
                console.log('[DeviceLocationMap] Координаты маршрута получены:', coordinates.length);
                setRoutePath(coordinates);
                setIsRoutingLoading(false);
              }}
            />
            {/* Показываем прямую линию пока строится маршрут или если он не построился */}
            {(isRoutingLoading || routePath.length === 0) && (
              <Polyline
                positions={routedWaypoints}
                pathOptions={{
                  color: '#00A36C',
                  weight: 4,
                  opacity: 0.4,
                  dashArray: '10 10',
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            )}
            {/* Показываем маршрут по дорогам когда он построен */}
            {routePath.length > 0 && (
              <Polyline
                positions={routePath}
                pathOptions={{
                  color: '#00A36C',
                  weight: 6,
                  opacity: 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            )}
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
        {/* Статус локации и маршрута */}
        <div className="rounded-full bg-white/95 px-3 sm:px-4 py-1.5 sm:py-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.25em] sm:tracking-[0.3em] text-[#006948] shadow-lg whitespace-nowrap">
          {isRoutingLoading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-[#00A36C] rounded-full animate-pulse"></span>
              строим маршрут по дорогам...
            </span>
          ) : hasError ? (
            'не удалось получить геоданные'
          ) : isLocating ? (
            'определяем координаты...'
          ) : routePath.length > 0 ? (
            '✓ маршрут построен'
          ) : (
            'локация найдена'
          )}
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
              let hintText: string;
              if (typeof hint === 'string') {
                hintText = hint;
              } else if (hint && typeof hint === 'object' && 'instruction' in hint) {
                hintText = String((hint as { instruction: string }).instruction);
              } else {
                hintText = String(hint);
              }
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

