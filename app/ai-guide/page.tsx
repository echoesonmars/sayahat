'use client';

export const dynamic = 'force-dynamic';

import { MapPinned, SendHorizonal, Search, FileText, Route, Calendar, Plus, Trash2, Star, Clock, Shield, AlertTriangle, Copy, Check, X, MessageSquare, List, Map } from 'lucide-react';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import type { LatLngExpression } from 'leaflet';
import nextDynamic from 'next/dynamic';
import type { Coordinates, RouteInstruction } from '@/lib/geo';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

// Динамический импорт DeviceLocationMap, чтобы избежать SSR проблем с window
const DeviceLocationMap = nextDynamic(() => import('./DeviceLocationMap').then(mod => ({ default: mod.DeviceLocationMap })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full min-h-[260px]">Загрузка карты...</div>
});

type Message = {
  id: string;
  author: 'user' | 'ai';
  text: string;
  timestamp: string;
};

const presetMessages: Message[] = [];

const quickPrompts = [
  'что сделать вечером поблизости',
  'обнови транспорт до алматы',
  'подскажи погоду на завтра',
  'мне нужен гид на субботу',
];

const chatTabs = [
  { id: 'plans', label: 'AI-гид', helper: 'Помощник', icon: MessageSquare },
  { id: 'shared', label: 'Мои планы', helper: 'Список маршрутов', icon: List },
  { id: 'notes', label: 'заметки', helper: 'Быстрые сводки, чеки, ваучеры', icon: FileText },
  { id: 'search', label: 'поиск мест', helper: 'Поиск интересных локации', icon: Search },
  { id: 'safety', label: 'Безопасность', helper: 'Код безопасности и SOS', icon: Shield },
  { id: 'templates', label: 'готовые маршруты', helper: 'Популярные планы за последний месяц', icon: Map },
];

const messageVariants: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.28, ease: 'easeOut' } },
  exit: { opacity: 0, y: -12, scale: 0.96, transition: { duration: 0.2, ease: 'easeIn' } },
};

const typingDotVariants: Variants = {
  animate: (index: number) => ({
    opacity: [0.3, 1, 0.3],
    y: [0, -2, 0],
    transition: {
      duration: 0.9,
      delay: index * 0.12,
      repeat: Infinity,
      repeatType: 'loop',
      ease: 'easeInOut',
    },
  }),
};

function sanitizeAIResponse(text: string) {
  if (!text) return '';
  let cleaned = text;
  cleaned = cleaned.replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, ''));
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*(.*?)\*/g, '$1');
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
  cleaned = cleaned.replace(/^\s*[-+]\s+/gm, '• ');
  cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, (match) => `${match.trim()} `);
  cleaned = cleaned.replace(/\r/g, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

function extractCoords(position: LatLngExpression | null) {
  if (!position) return null;
  if (Array.isArray(position)) {
    const [lat, lng] = position;
    if (typeof lat === 'number' && typeof lng === 'number') {
      return { lat, lng };
    }
    return null;
  }
  if (typeof position === 'object' && position !== null) {
    if ('lat' in position && 'lng' in position) {
      const lat = (position as { lat: number }).lat;
      const lng = (position as { lng: number }).lng;
      if (typeof lat === 'number' && typeof lng === 'number') {
        return { lat, lng };
      }
    }
  }
  return null;
}

function isCoordinate(value: unknown): value is Coordinates {
  if (!value || typeof value !== 'object') return false;
  const maybe = value as { lat?: unknown; lng?: unknown };
  return typeof maybe.lat === 'number' && typeof maybe.lng === 'number';
}

function parseRouteInstruction(rawText: string) {
  if (!rawText) {
    return { text: rawText, plan: null as RouteInstruction | null };
  }

  const routeMatch = rawText.match(/<route>([\s\S]*?)<\/route>/i);
  if (!routeMatch) {
    return { text: rawText, plan: null as RouteInstruction | null };
  }

  const [fullMatch, jsonPayload] = routeMatch;
  let plan: RouteInstruction | null = null;

  try {
    const parsed = JSON.parse(jsonPayload.trim());
    if (parsed && typeof parsed === 'object' && isCoordinate(parsed.destination)) {
      const viaList = Array.isArray(parsed.via)
        ? parsed.via.filter(isCoordinate)
        : undefined;
      const hints = Array.isArray(parsed.hints)
        ? parsed.hints.filter((hint: unknown) => typeof hint === 'string' && hint.trim().length > 0).slice(0, 5)
        : undefined;
      plan = {
        destination: parsed.destination,
        origin: isCoordinate(parsed.origin) ? parsed.origin : undefined,
        via: viaList,
        note: typeof parsed.note === 'string' ? parsed.note : undefined,
        hints,
      };
    }
  } catch (error) {
    console.warn('Failed to parse route instruction', error);
  }

  const text = rawText.replace(fullMatch, '').trim();
  return { text, plan };
}

type ParsedPlan = {
  title: string;
  date?: string;
  description?: string;
  locations?: Array<{ name: string; lat?: number; lng?: number }>;
  route?: RouteInstruction;
};

type ParsedNote = {
  title: string;
  content?: string;
  type?: 'receipt' | 'voucher' | 'note';
};

function parsePlanAndNote(rawText: string): { text: string; plan: ParsedPlan | null; note: ParsedNote | null } {
  if (!rawText) {
    return { text: rawText, plan: null, note: null };
  }

  let cleanedText = rawText;
  let parsedPlan: ParsedPlan | null = null;
  let parsedNote: ParsedNote | null = null;

  // Parse plan - более гибкое регулярное выражение
  const planMatch = rawText.match(/<plan>\s*([\s\S]*?)\s*<\/plan>/i);
  if (planMatch) {
    const [fullMatch, jsonPayload] = planMatch;
    try {
      // Очищаем JSON от возможных лишних символов
      const cleanedJson = jsonPayload.trim().replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
      const parsed = JSON.parse(cleanedJson);
      console.log('Parsed plan JSON:', parsed);
      if (parsed && typeof parsed === 'object' && typeof parsed.title === 'string' && parsed.title.trim().length > 0) {
        parsedPlan = {
          title: parsed.title.trim(),
          date: typeof parsed.date === 'string' ? parsed.date : undefined,
          description: typeof parsed.description === 'string' ? parsed.description : undefined,
          locations: Array.isArray(parsed.locations) ? parsed.locations : undefined,
          route: parsed.route && typeof parsed.route === 'object' ? parsed.route as RouteInstruction : undefined,
        };
        console.log('Successfully parsed plan:', parsedPlan);
      } else {
        console.warn('Plan missing title or invalid format:', parsed);
      }
    } catch (error) {
      console.warn('Failed to parse plan JSON:', jsonPayload, error);
    }
    cleanedText = cleanedText.replace(fullMatch, '').trim();
  } else {
    console.log('No <plan> tag found in response');
  }

  // Parse note - более гибкое регулярное выражение
  const noteMatch = rawText.match(/<note>\s*([\s\S]*?)\s*<\/note>/i);
  if (noteMatch) {
    const [fullMatch, jsonPayload] = noteMatch;
    try {
      // Очищаем JSON от возможных лишних символов
      const cleanedJson = jsonPayload.trim().replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
      const parsed = JSON.parse(cleanedJson);
      console.log('Parsed note JSON:', parsed);
      if (parsed && typeof parsed === 'object' && typeof parsed.title === 'string' && parsed.title.trim().length > 0) {
        parsedNote = {
          title: parsed.title.trim(),
          content: typeof parsed.content === 'string' ? parsed.content : undefined,
          type: parsed.type === 'receipt' || parsed.type === 'voucher' ? parsed.type : 'note',
        };
        console.log('Successfully parsed note:', parsedNote);
      } else {
        console.warn('Note missing title or invalid format:', parsed);
      }
    } catch (error) {
      console.warn('Failed to parse note JSON:', jsonPayload, error);
    }
    cleanedText = cleanedText.replace(fullMatch, '').trim();
  } else {
    console.log('No <note> tag found in response');
  }

  return { text: cleanedText, plan: parsedPlan, note: parsedNote };
}

// Tab Content Components
function PlansTab({
  messages,
  inputValue,
  setInputValue,
  showPrompts,
  isGenerating,
  chatError,
  handleSend,
  handlePromptClick,
  quickPrompts,
}: {
  messages: Message[];
  inputValue: string;
  setInputValue: (value: string) => void;
  showPrompts: boolean;
  isGenerating: boolean;
  chatError: string | null;
  handleSend: (e: React.FormEvent<HTMLFormElement>) => void;
  handlePromptClick: (prompt: string) => void;
  quickPrompts: string[];
}) {
  const sendButtonVariants: Variants = useMemo(
    () => ({
      hover: { scale: 1.05, boxShadow: '0 12px 30px rgba(0, 199, 127, 0.4)' },
      tap: { scale: 0.92 },
      idle: { scale: 1 },
    }),
    [],
  );

  return (
    <>
      <div className="mt-3 flex-1 space-y-4 overflow-y-auto pr-2 lg:min-h-0">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              variants={messageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={`flex ${message.author === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] tracking-[-0.03em] rounded-2xl border px-4 py-3 text-left text-sm leading-relaxed shadow-sm ${
                  message.author === 'user'
                    ? 'border-[#006948]/20 bg-gradient-to-br from-[#E8FFF4] to-white text-[#0F2D1E]'
                    : 'border-[#006948]/10 bg-white text-[#3F4A46]'
                }`}
              >
                <p>{message.text}</p>
                <span className="mt-2 block text-[11px] tracking-[-0.07em] text-[#8B8B8B]">
                  {message.timestamp}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              key="ai-typing"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex justify-start"
            >
              <div className="flex items-center gap-2 rounded-2xl border border-[#006948]/10 bg-white px-4 py-3 text-[#3F4A46] shadow-sm">
                <span className="text-xs font tracking-[0.-0.07em] text-[#00A36C]">Sayahat</span>
                <div className="flex" aria-label="AI typing" role="status">
                  {[0, 1, 2].map((dot) => (
                    <motion.span
                      key={dot}
                      className="h-2 w-2 rounded-full bg-[#00A36C]"
                      variants={typingDotVariants}
                      custom={dot}
                      animate="animate"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3">
        {showPrompts && (
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handlePromptClick(prompt)}
                className="rounded-xl border border-dashed border-[#006948]/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#006948] transition hover:border-[#00A36C] hover:text-[#00A36C]"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={handleSend}
          className="mt-4 flex items-center gap-3 rounded-xl border border-[#006948]/20 bg-white px-4 py-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Опишите задачу на ближайший час"
            className="flex-1 bg-transparent text-sm text-[#0F2D1E] tracking-[-0.07em] placeholder:text-[#93A39C] focus:outline-none"
            disabled={isGenerating}
          />
          <motion.button
            type="submit"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#00A36C] text-white transition hover:bg-[#00c77f] disabled:opacity-60"
            aria-label="Отправить сообщение"
            disabled={isGenerating}
            variants={sendButtonVariants}
            initial="idle"
            whileHover="hover"
            whileTap="tap"
          >
            <SendHorizonal className={`h-4 w-4 ${isGenerating ? 'animate-pulse' : ''}`} />
          </motion.button>
        </form>
        {chatError && (
          <p className="mt-2 text-xs text-[#C5221F]" role="status" aria-live="polite">
            {chatError}
          </p>
        )}
      </div>
    </>
  );
}

function SharedPlansTab({ refreshTrigger, onRouteBuild }: { refreshTrigger?: number; onRouteBuild?: (route: RouteInstruction) => void }) {
  const [savedPlans, setSavedPlans] = useState<Array<{ _id: string; title: string; date: string; locations?: Array<unknown> }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanDate, setNewPlanDate] = useState('');
  const [newPlanDescription, setNewPlanDescription] = useState('');
  const [newPlanLocations, setNewPlanLocations] = useState<Array<{ name: string; lat?: number; lng?: number }>>([]);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationLat, setNewLocationLat] = useState('');
  const [newLocationLng, setNewLocationLng] = useState('');

  useEffect(() => {
    let isMounted = true;
    
    async function fetchPlans() {
      try {
        // Добавляем таймаут для запроса
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд таймаут
        
        const response = await fetch('/api/plans', {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!isMounted) return;
        
        if (response.ok) {
          const data = await response.json();
          setSavedPlans(data.plans || []);
        } else {
          const data = await response.json().catch(() => ({ plans: [] }));
          console.error('Failed to fetch plans:', data.error || 'Unknown error');
          setSavedPlans([]);
        }
      } catch (error: unknown) {
        if (!isMounted) return;
        
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn('Request timeout for plans');
        } else {
          console.error('Failed to fetch plans', error);
        }
        setSavedPlans([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    
    fetchPlans();
    
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  async function handleDeletePlan(id: string) {
    try {
      const response = await fetch(`/api/plans?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        setSavedPlans((prev) => prev.filter((plan) => plan._id !== id));
      }
    } catch (error) {
      console.error('Failed to delete plan', error);
    }
  }

  function handleAddLocation() {
    if (!newLocationName.trim()) return;
    
    const location = {
      name: newLocationName.trim(),
      lat: newLocationLat ? parseFloat(newLocationLat) : undefined,
      lng: newLocationLng ? parseFloat(newLocationLng) : undefined,
    };
    
    setNewPlanLocations((prev) => [...prev, location]);
    setNewLocationName('');
    setNewLocationLat('');
    setNewLocationLng('');
  }

  function handleRemoveLocation(index: number) {
    setNewPlanLocations((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleAddPlan() {
    if (!newPlanTitle.trim()) return;

    const planData = {
      title: newPlanTitle.trim(),
      date: newPlanDate || new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }),
      description: newPlanDescription,
      locations: newPlanLocations,
    };

    try {
      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData),
      });

      if (response.ok) {
        const data = await response.json();
        const newPlan = {
          _id: data.id,
          title: newPlanTitle,
          date: planData.date,
          locations: newPlanLocations,
        };
        setSavedPlans((prev) => [newPlan, ...prev]);
        setNewPlanTitle('');
        setNewPlanDate('');
        setNewPlanDescription('');
        setNewPlanLocations([]);
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Failed to create plan', error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#006948] border-t-transparent" />
        <p className="mt-4 text-sm text-[#7A7A7A]">Загрузка планов...</p>
      </div>
    );
  }

  return (
    <div className="mt-3 flex-1 space-y-3 overflow-y-auto pr-2 lg:min-h-0">
      {!showAddForm ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#006948]/30 bg-white px-4 py-3 text-sm font-medium text-[#006948] transition hover:border-[#00A36C] hover:bg-[#F4FFFA]"
        >
          <Plus className="h-4 w-4" />
          Добавить план
        </button>
      ) : (
        <div className="rounded-xl border border-[#006948]/20 bg-white p-4 space-y-3">
          <input
            type="text"
            value={newPlanTitle}
            onChange={(e) => setNewPlanTitle(e.target.value)}
            placeholder="Название плана *"
            className="w-full rounded-lg border border-[#006948]/20 px-3 py-2 text-sm text-[#0F2D1E] placeholder:text-[#93A39C] focus:border-[#00A36C] focus:outline-none"
          />
          <input
            type="text"
            value={newPlanDate}
            onChange={(e) => setNewPlanDate(e.target.value)}
            placeholder="Дата (например: 15 дек 2024)"
            className="w-full rounded-lg border border-[#006948]/20 px-3 py-2 text-sm text-[#0F2D1E] placeholder:text-[#93A39C] focus:border-[#00A36C] focus:outline-none"
          />
          <textarea
            value={newPlanDescription}
            onChange={(e) => setNewPlanDescription(e.target.value)}
            placeholder="Описание плана (необязательно)"
            rows={3}
            className="w-full rounded-lg border border-[#006948]/20 px-3 py-2 text-sm text-[#0F2D1E] placeholder:text-[#93A39C] focus:border-[#00A36C] focus:outline-none"
          />
          
          <div className="border-t border-[#006948]/10 pt-3">
            <p className="text-xs font-medium text-[#006948] mb-2">Локации (необязательно)</p>
            <div className="space-y-2">
              {newPlanLocations.map((loc, index) => (
                <div key={index} className="flex items-center gap-2 rounded-lg border border-[#006948]/10 bg-[#F4FFFA] p-2">
                  <span className="flex-1 text-sm text-[#0F2D1E]">{loc.name}</span>
                  {loc.lat && loc.lng && (
                    <span className="text-xs text-[#7A7A7A]">{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveLocation(index)}
                    className="rounded p-1 text-[#7A7A7A] hover:bg-[#006948]/10 hover:text-[#006948]"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  placeholder="Название локации"
                  className="flex-1 rounded-lg border border-[#006948]/20 px-3 py-2 text-xs text-[#0F2D1E] placeholder:text-[#93A39C] focus:border-[#00A36C] focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLocation();
                    }
                  }}
                />
                <input
                  type="number"
                  step="any"
                  value={newLocationLat}
                  onChange={(e) => setNewLocationLat(e.target.value)}
                  placeholder="Широта"
                  className="w-24 rounded-lg border border-[#006948]/20 px-2 py-2 text-xs text-[#0F2D1E] placeholder:text-[#93A39C] focus:border-[#00A36C] focus:outline-none"
                />
                <input
                  type="number"
                  step="any"
                  value={newLocationLng}
                  onChange={(e) => setNewLocationLng(e.target.value)}
                  placeholder="Долгота"
                  className="w-24 rounded-lg border border-[#006948]/20 px-2 py-2 text-xs text-[#0F2D1E] placeholder:text-[#93A39C] focus:border-[#00A36C] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddLocation}
                  className="rounded-lg border border-[#006948]/20 bg-white px-3 py-2 text-xs font-medium text-[#006948] transition hover:bg-[#F4FFFA]"
                >
                  Добавить
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleAddPlan}
              className="flex-1 rounded-lg bg-[#00A36C] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#00c77f]"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewPlanTitle('');
                setNewPlanDate('');
                setNewPlanDescription('');
                setNewPlanLocations([]);
              }}
              className="flex-1 rounded-lg border border-[#006948]/20 px-4 py-2 text-sm font-medium text-[#006948] transition hover:bg-[#F4FFFA]"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
      {savedPlans.length === 0 && !showAddForm && (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <Route className="h-12 w-12 text-[#006948]/30" />
          <p className="mt-4 text-sm text-[#7A7A7A]">У вас пока нет сохранённых планов</p>
          <p className="mt-1 text-xs text-[#93A39C]">Создайте план вручную или через AI-гид</p>
        </div>
      )}
      {savedPlans.length > 0 && (
        <AnimatePresence>
          {savedPlans.map((plan) => (
            (() => {
              // Проверяем, есть ли места с координатами
              const locationsWithCoords = (plan.locations || []).filter((loc: any) => 
                loc && typeof loc === 'object' && typeof loc.lat === 'number' && typeof loc.lng === 'number'
              );
              const canOpenOnMap = locationsWithCoords.length > 0;

              return (
                <motion.div
                  key={plan._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-xl border border-[#006948]/10 bg-white p-4 shadow-sm transition hover:border-[#006948]/20 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold tracking-[-0.03em] text-[#0F2D1E]">{plan.title}</h3>
                      {(plan as any).description && (
                        <p className="mt-1 text-xs text-[#7A7A7A] line-clamp-2">{(plan as any).description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-4 text-xs text-[#7A7A7A]">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {plan.date || 'Без даты'}
                        </span>
                        {plan.locations && (
                          <span className="flex items-center gap-1">
                            <MapPinned className="h-3 w-3" />
                            {plan.locations.length} локаций
                            {canOpenOnMap && ` (${locationsWithCoords.length} с координатами)`}
                          </span>
                        )}
                      </div>
                      {canOpenOnMap && (
                        <button
                          type="button"
                          onClick={() => {
                            // Строим маршрут из всех мест плана
                            const firstLocation = locationsWithCoords[0] as { lat: number; lng: number; name?: string };
                            const lastLocation = locationsWithCoords[locationsWithCoords.length - 1] as { lat: number; lng: number; name?: string };
                            
                            // Если есть несколько мест, используем первое как начало, последнее как конец, остальные как via
                            const viaPoints = locationsWithCoords.slice(1, -1).map((loc: any) => ({
                              lat: loc.lat,
                              lng: loc.lng,
                            }));

                            if (onRouteBuild) {
                              const route: RouteInstruction = {
                                origin: { lat: firstLocation.lat, lng: firstLocation.lng },
                                destination: { lat: lastLocation.lat, lng: lastLocation.lng },
                                via: viaPoints.length > 0 ? viaPoints : undefined,
                                note: `Маршрут: ${plan.title}`,
                                hints: locationsWithCoords.map((loc: any, index: number) => ({
                                  instruction: `${index + 1}. ${loc.name || 'Место'}`,
                                  distance: 0,
                                  time: 0,
                                  sign: 0,
                                })),
                              };
                              onRouteBuild(route);
                            }
                          }}
                          className="mt-3 w-full rounded-lg bg-[#006948] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#008A6A] flex items-center justify-center gap-2"
                        >
                          <MapPinned className="h-3 w-3" />
                          Открыть на карте
                        </button>
                      )}
                      {!canOpenOnMap && plan.locations && (plan.locations as any[]).length > 0 && (
                        <p className="mt-2 text-xs text-[#93A39C] italic">
                          ⚠️ У мест в этом плане нет координат. Попросите AI-гид добавить координаты.
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePlan(plan._id)}
                      className="ml-2 rounded-lg p-2 text-[#7A7A7A] transition hover:bg-[#F4FFFA] hover:text-[#006948]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })()
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}

function NotesTab({ refreshTrigger }: { refreshTrigger?: number }) {
  const [notes, setNotes] = useState<Array<{ _id: string; title: string; content?: string; type: 'receipt' | 'voucher' | 'note'; createdAt: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteType, setNewNoteType] = useState<'receipt' | 'voucher' | 'note'>('note');
  const [selectedNote, setSelectedNote] = useState<{ _id: string; title: string; content?: string; type: 'receipt' | 'voucher' | 'note'; createdAt: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    async function fetchNotes() {
      try {
        // Добавляем таймаут для запроса
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 секунд таймаут
        
        const response = await fetch('/api/notes', {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!isMounted) return;
        
        if (response.ok) {
          const data = await response.json();
          setNotes(data.notes || []);
        } else {
          const data = await response.json().catch(() => ({ notes: [] }));
          console.error('Failed to fetch notes:', data.error || 'Unknown error');
          setNotes([]);
        }
      } catch (error: unknown) {
        if (!isMounted) return;
        
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn('Request timeout for notes');
        } else {
          console.error('Failed to fetch notes', error);
        }
        setNotes([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }
    
    fetchNotes();
    
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  async function handleDeleteNote(id: string) {
    try {
      const response = await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        setNotes((prev) => prev.filter((note) => note._id !== id));
      }
    } catch (error) {
      console.error('Failed to delete note', error);
    }
  }

  async function handleAddNote() {
    if (!newNoteTitle.trim()) return;

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newNoteTitle,
          content: newNoteContent,
          type: newNoteType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newNote = {
          _id: data.id,
          title: newNoteTitle,
          content: newNoteContent,
          type: newNoteType,
          createdAt: new Date().toISOString(),
        };
        setNotes((prev) => [newNote, ...prev]);
        setNewNoteTitle('');
        setNewNoteContent('');
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Failed to create note', error);
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'receipt':
        return '🧾';
      case 'voucher':
        return '🎫';
      default:
        return '📝';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#006948] border-t-transparent" />
        <p className="mt-4 text-sm text-[#7A7A7A]">Загрузка заметок...</p>
      </div>
    );
  }

  return (
    <div className="mt-3 flex-1 space-y-3 overflow-y-auto pr-2 lg:min-h-0">
      {!showAddForm ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#006948]/30 bg-white px-4 py-3 text-sm font-medium text-[#006948] transition hover:border-[#00A36C] hover:bg-[#F4FFFA]"
        >
          <Plus className="h-4 w-4" />
          Добавить заметку
        </button>
      ) : (
        <div className="rounded-xl border border-[#006948]/20 bg-white p-4">
          <input
            type="text"
            value={newNoteTitle}
            onChange={(e) => setNewNoteTitle(e.target.value)}
            placeholder="Заголовок заметки"
            className="w-full rounded-lg border border-[#006948]/20 px-3 py-2 text-sm text-[#0F2D1E] placeholder:text-[#93A39C] focus:border-[#00A36C] focus:outline-none"
          />
          <textarea
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            placeholder="Содержимое заметки (необязательно)"
            rows={3}
            className="mt-2 w-full rounded-lg border border-[#006948]/20 px-3 py-2 text-sm text-[#0F2D1E] placeholder:text-[#93A39C] focus:border-[#00A36C] focus:outline-none"
          />
          <select
            value={newNoteType}
            onChange={(e) => setNewNoteType(e.target.value as 'receipt' | 'voucher' | 'note')}
            className="mt-2 w-full rounded-lg border border-[#006948]/20 px-3 py-2 text-sm text-[#0F2D1E] focus:border-[#00A36C] focus:outline-none"
          >
            <option value="note">Заметка</option>
            <option value="receipt">Чек</option>
            <option value="voucher">Ваучер</option>
          </select>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleAddNote}
              className="flex-1 rounded-lg bg-[#00A36C] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#00c77f]"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewNoteTitle('');
                setNewNoteContent('');
              }}
              className="flex-1 rounded-lg border border-[#006948]/20 px-4 py-2 text-sm font-medium text-[#006948] transition hover:bg-[#F4FFFA]"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
      {notes.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <FileText className="h-12 w-12 text-[#006948]/30" />
          <p className="mt-4 text-sm text-[#7A7A7A]">Нет сохранённых заметок</p>
        </div>
      ) : (
        <AnimatePresence>
          {notes.map((note) => (
            <motion.div
              key={note._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl border border-[#006948]/10 bg-white p-4 shadow-sm transition hover:border-[#006948]/20 hover:shadow-md cursor-pointer"
              onClick={() => setSelectedNote(note)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl">{getTypeIcon(note.type)}</span>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold tracking-[-0.03em] text-[#0F2D1E]">{note.title}</h3>
                    {note.content && (
                      <p className="mt-1 text-xs text-[#93A39C] line-clamp-2">{note.content}</p>
                    )}
                    <p className="mt-1 text-xs text-[#7A7A7A]">{formatDate(note.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {note.content && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNote(note);
                      }}
                      className="rounded-lg p-2 text-[#7A7A7A] transition hover:bg-[#F4FFFA] hover:text-[#006948]"
                      title="Открыть заметку"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNote(note._id);
                    }}
                    className="rounded-lg p-2 text-[#7A7A7A] transition hover:bg-[#F4FFFA] hover:text-[#006948]"
                    title="Удалить заметку"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {/* Модальное окно для просмотра заметки */}
      {selectedNote && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedNote(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl border border-[#006948]/20 bg-white shadow-xl"
          >
            <div className="border-b border-[#006948]/10 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <span className="text-4xl">{getTypeIcon(selectedNote.type)}</span>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#0F2D1E]">
                      {selectedNote.title}
                    </h2>
                    <p className="mt-1 text-sm text-[#7A7A7A]">
                      {formatDate(selectedNote.createdAt)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNote(null)}
                  className="rounded-lg p-2 text-[#7A7A7A] transition hover:bg-[#F4FFFA] hover:text-[#006948]"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              {selectedNote.content ? (
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-[#0F2D1E] leading-relaxed">
                    {selectedNote.content}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-16 w-16 text-[#006948]/30" />
                  <p className="mt-4 text-sm text-[#7A7A7A]">Содержимое заметки отсутствует</p>
                </div>
              )}
            </div>
            <div className="border-t border-[#006948]/10 p-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  handleDeleteNote(selectedNote._id);
                  setSelectedNote(null);
                }}
                className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                Удалить
              </button>
              <button
                type="button"
                onClick={() => setSelectedNote(null)}
                className="rounded-lg bg-[#00A36C] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#00c77f]"
              >
                Закрыть
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function SafetyTab({ onContactsChange }: { onContactsChange?: (contacts: Array<{
  id: string;
  name: string;
  location: { lat: number; lng: number; timestamp: string } | null;
}>) => void }) {
  const [safetyCode, setSafetyCode] = useState<string | null>(null);
  const [isLoadingCode, setIsLoadingCode] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [contacts, setContacts] = useState<Array<{
    _id: string;
    isOwner: boolean;
    otherUser: { id: string; name: string; email: string; code: string } | null;
    createdAt: string;
    lastLocation: { lat: number; lng: number; timestamp: string } | null;
  }>>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sosAlerts, setSosAlerts] = useState<Array<{
    _id: string;
    fromUser: { id: string; name: string; email: string } | null;
    location: { lat: number; lng: number } | null;
    timestamp: string;
    message: string;
    status: string;
  }>>([]);

  // Получаем уникальный код пользователя
  useEffect(() => {
    async function fetchSafetyCode() {
      try {
        const response = await fetch('/api/safety/code');
        if (response.ok) {
          const data = await response.json();
          setSafetyCode(data.code);
        }
      } catch (error) {
        console.error('Failed to fetch safety code', error);
      } finally {
        setIsLoadingCode(false);
      }
    }
    fetchSafetyCode();
  }, []);

  // Получаем список контактов
  useEffect(() => {
    let isMounted = true;
    
    async function fetchContacts() {
      try {
        // Добавляем таймаут для запроса
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('/api/safety/contacts', {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!isMounted) return;
        
        if (response.ok) {
          const data = await response.json();
          const fetchedContacts = data.contacts || [];
          setContacts(fetchedContacts);
          
          // Передаем контакты с местоположениями в родительский компонент
          if (onContactsChange) {
            const contactsWithLocation = fetchedContacts
              .filter((c: typeof fetchedContacts[0]) => !c.isOwner && c.lastLocation)
              .map((c: typeof fetchedContacts[0]) => ({
                id: c._id,
                name: c.otherUser?.name || 'Неизвестный',
                location: c.lastLocation,
              }));
            onContactsChange(contactsWithLocation);
          }
        }
      } catch (error: unknown) {
        if (!isMounted) return;
        
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn('Request timeout for contacts');
        } else {
          console.error('Failed to fetch contacts', error);
        }
      } finally {
        if (isMounted) {
          setIsLoadingContacts(false);
        }
      }
    }
    
    fetchContacts();
    
    // Обновляем контакты каждые 10 секунд для получения актуального местоположения
    const interval = setInterval(fetchContacts, 10000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [onContactsChange]);

  // Получаем SOS сигналы
  useEffect(() => {
    async function fetchSOSAlerts() {
      try {
        const response = await fetch('/api/safety/sos/list');
        if (response.ok) {
          const data = await response.json();
          setSosAlerts(data.alerts || []);
        }
      } catch (error) {
        console.error('Failed to fetch SOS alerts', error);
      }
    }
    fetchSOSAlerts();
    
    // Обновляем SOS сигналы каждые 5 секунд
    const interval = setInterval(fetchSOSAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  // Получаем местоположение и обновляем его
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      // Сначала быстро получаем из кеша
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(loc);

          // Отправляем местоположение на сервер
          try {
            await fetch('/api/safety/location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(loc),
            });
          } catch (error) {
            console.error('Failed to update location', error);
          }
        },
        () => {
          // Игнорируем ошибку, продолжаем с watchPosition
        },
        { enableHighAccuracy: false, timeout: 2000, maximumAge: 60_000 }
      );

      // Затем включаем отслеживание для обновлений
      const watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(loc);

          // Отправляем местоположение на сервер
          try {
            await fetch('/api/safety/location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(loc),
            });
          } catch (error) {
            console.error('Failed to update location', error);
          }
        },
        () => {
          console.warn('Geolocation error');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 30_000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const copyCode = () => {
    if (safetyCode) {
      if (typeof window !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(safetyCode);
      }
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleAddContact = async () => {
    if (!inputCode.trim() || inputCode.length !== 6) {
      alert('Введите 6-значный код');
      return;
    }

    setIsAddingContact(true);
    try {
      const response = await fetch('/api/safety/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inputCode.toUpperCase() }),
      });

      const data = await response.json();

      if (response.ok) {
        setInputCode('');
        // Немедленно обновляем список контактов
        try {
          const contactsResponse = await fetch('/api/safety/contacts');
          if (contactsResponse.ok) {
            const contactsData = await contactsResponse.json();
            const fetchedContacts = contactsData.contacts || [];
            setContacts(fetchedContacts);
            
            // Передаем контакты с местоположениями в родительский компонент
            if (onContactsChange) {
              const contactsWithLocation = fetchedContacts
                .filter((c: typeof fetchedContacts[0]) => !c.isOwner && c.lastLocation)
                .map((c: typeof fetchedContacts[0]) => ({
                  id: c._id,
                  name: c.otherUser?.name || 'Неизвестный',
                  location: c.lastLocation,
                }));
              onContactsChange(contactsWithLocation);
            }
          }
        } catch (err) {
          console.error('Failed to refresh contacts after add', err);
        }
        alert(`Контакт ${data.targetUserName} добавлен`);
      } else {
        alert(data.error || 'Ошибка при добавлении контакта');
      }
    } catch (error) {
      console.error('Failed to add contact', error);
      alert('Ошибка при добавлении контакта');
    } finally {
      setIsAddingContact(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Удалить этот контакт?')) return;

    try {
      const response = await fetch(`/api/safety/contacts?id=${contactId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setContacts((prev) => prev.filter((c) => c._id !== contactId));
      } else {
        alert('Ошибка при удалении контакта');
      }
    } catch (error) {
      console.error('Failed to delete contact', error);
      alert('Ошибка при удалении контакта');
    }
  };

  const handleSOS = async (contactId: string) => {
    if (!confirm('Отправить SOS сигнал?')) return;

    try {
      const response = await fetch('/api/safety/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          lat: userLocation?.lat,
          lng: userLocation?.lng,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('SOS сигнал отправлен!');
        // Здесь можно добавить звонок через tel: ссылку
        if (data.phoneNumber) {
          if (typeof window !== 'undefined') {
            window.location.href = `tel:${data.phoneNumber}`;
          }
        }
      } else {
        alert(data.error || 'Ошибка при отправке SOS');
      }
    } catch (error) {
      console.error('Failed to send SOS', error);
      alert('Ошибка при отправке SOS');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleMarkSOSRead = async (alertId: string) => {
    try {
      await fetch('/api/safety/sos/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      });
      setSosAlerts((prev) => prev.filter((a) => a._id !== alertId));
    } catch (error) {
      console.error('Failed to mark SOS as read', error);
    }
  };

  const openLocationOnMap = (lat: number, lng: number) => {
    if (typeof window !== 'undefined') {
      window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    }
  };

  return (
    <div className="mt-3 flex-1 space-y-4 overflow-y-auto px-2 sm:pr-2 lg:min-h-0">
      {/* SOS сигналы */}
      {sosAlerts.length > 0 && (
        <div className="rounded-xl border-2 border-red-500 bg-red-50 p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-red-600">SOS Сигналы</h3>
          </div>
          <div className="space-y-2">
            {sosAlerts.map((alert) => (
              <div key={alert._id} className="rounded-lg border border-red-200 bg-white p-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-600 break-words">
                      {alert.message}
                    </p>
                    <p className="text-xs text-[#7A7A7A] mt-1">
                      От: {alert.fromUser?.name || 'Неизвестный'}
                    </p>
                    {alert.location && (
                      <button
                        type="button"
                        onClick={() => openLocationOnMap(alert.location!.lat, alert.location!.lng)}
                        className="mt-2 text-xs text-[#006948] hover:underline flex items-center gap-1"
                      >
                        <MapPinned className="h-3 w-3 flex-shrink-0" />
                        Открыть на карте
                      </button>
                    )}
                    <p className="text-xs text-[#93A39C] mt-1">
                      {formatDate(alert.timestamp)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleMarkSOSRead(alert._id)}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 flex-shrink-0 self-start sm:self-auto"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Секция уникального кода */}
      <div className="rounded-xl border border-[#006948]/20 bg-white p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-5 w-5 text-[#006948] flex-shrink-0" />
          <h3 className="text-sm font-semibold text-[#0F2D1E]">Ваш уникальный код</h3>
        </div>
        {isLoadingCode ? (
          <div className="flex items-center justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#006948] border-t-transparent" />
          </div>
        ) : safetyCode ? (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex-1 rounded-lg border-2 border-[#006948] bg-[#F4FFFA] px-3 sm:px-4 py-3 text-center min-w-0">
              <span className="text-xl sm:text-2xl font-bold tracking-widest text-[#006948] break-all">{safetyCode}</span>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="rounded-lg border border-[#006948]/20 bg-white px-4 py-3 text-[#006948] transition hover:bg-[#F4FFFA] flex items-center justify-center flex-shrink-0"
            >
              {codeCopied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
            </button>
          </div>
        ) : (
          <p className="text-sm text-[#7A7A7A]">Ошибка загрузки кода</p>
        )}
        <p className="mt-2 text-xs text-[#93A39C]">
          Поделитесь этим кодом с близкими. Они смогут видеть ваше местоположение для безопасности.
        </p>
      </div>

      {/* Секция добавления контакта */}
      <div className="rounded-xl border border-[#006948]/20 bg-white p-3 sm:p-4">
        <h3 className="text-sm font-semibold text-[#0F2D1E] mb-3">Добавить контакт по коду</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="Введите 6-значный код"
            maxLength={6}
            className="flex-1 rounded-lg border border-[#006948]/20 px-3 py-2 text-sm text-[#0F2D1E] placeholder:text-[#93A39C] focus:border-[#00A36C] focus:outline-none uppercase tracking-widest min-w-0"
          />
          <button
            type="button"
            onClick={handleAddContact}
            disabled={isAddingContact || inputCode.length !== 6}
            className="rounded-lg bg-[#00A36C] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#00c77f] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {isAddingContact ? '...' : 'Добавить'}
          </button>
        </div>
      </div>

      {/* Список контактов */}
      <div className="rounded-xl border border-[#006948]/20 bg-white p-3 sm:p-4">
        <h3 className="text-sm font-semibold text-[#0F2D1E] mb-3">Мои контакты безопасности</h3>
        {isLoadingContacts ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#006948] border-t-transparent" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Shield className="h-12 w-12 text-[#006948]/30" />
            <p className="mt-4 text-sm text-[#7A7A7A]">Нет добавленных контактов</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {contacts.map((contact) => (
                <motion.div
                  key={contact._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-lg border border-[#006948]/10 bg-[#F4FFFA] p-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <span className="text-lg flex-shrink-0">{contact.isOwner ? '👁️' : '📍'}</span>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-[#0F2D1E] break-words">
                            {contact.otherUser?.name || 'Неизвестный'}
                          </h4>
                          <p className="text-xs text-[#7A7A7A] mt-1 break-words">
                            {contact.isOwner 
                              ? 'Может видеть ваше местоположение' 
                              : 'Вы можете видеть местоположение'}
                          </p>
                          {contact.lastLocation ? (
                            <div className="mt-1">
                              <p className="text-xs text-[#93A39C] break-words">
                                Последнее обновление: {formatDate(contact.lastLocation.timestamp)}
                              </p>
                              <button
                                type="button"
                                onClick={() => openLocationOnMap(contact.lastLocation!.lat, contact.lastLocation!.lng)}
                                className="mt-1 text-xs text-[#006948] hover:underline flex items-center gap-1"
                              >
                                <MapPinned className="h-3 w-3 flex-shrink-0" />
                                Открыть на карте
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-[#93A39C] mt-1">
                              Местоположение пока не доступно
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 self-start sm:self-auto">
                      {!contact.isOwner && (
                        <button
                          type="button"
                          onClick={() => handleSOS(contact._id)}
                          className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-600 flex items-center gap-1 whitespace-nowrap"
                        >
                          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                          <span className="hidden sm:inline">SOS</span>
                        </button>
                      )}
                      {contact.isOwner && (
                        <button
                          type="button"
                          onClick={() => handleDeleteContact(contact._id)}
                          className="rounded-lg p-1.5 text-[#7A7A7A] transition hover:bg-red-50 hover:text-red-600 flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

const CATEGORIES = [
  { id: 'attraction', label: 'Достопримечательности', icon: '🏛️' },
  { id: 'nature', label: 'Природа', icon: '🌲' },
  { id: 'food', label: 'Еда и напитки', icon: '🍽️' },
  { id: 'hotels', label: 'Отели', icon: '🏨' },
  { id: 'shopping', label: 'Шоппинг', icon: '🛍️' },
  { id: 'transport', label: 'Транспорт', icon: '🚌' },
  { id: 'safety', label: 'Безопасность', icon: '🛡️' },
  { id: 'services', label: 'Услуги', icon: '🏦' },
];

const CITIES = [
  { id: 'all', label: 'Все города', icon: '🌍' },
  { id: 'Алматы', label: 'Алматы', icon: '🏙️' },
  { id: 'Шымкент', label: 'Шымкент', icon: '🏛️' },
  { id: 'Астана', label: 'Астана', icon: '🏗️' },
];

function SearchTab({ onRouteBuild }: { onRouteBuild?: (route: RouteInstruction) => void }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{
    id: string;
    name: string;
    city: string;
    category: string[];
    distanceKm?: number;
    lat: number;
    lng: number;
    tags?: Record<string, unknown>;
    price_kzt?: number;
    opening_hours?: string;
    phone?: string;
    website?: string;
    email?: string;
  }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [avgPrice, setAvgPrice] = useState<number | undefined>(undefined);

  const router = useRouter();

  // Получаем местоположение пользователя
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // Игнорируем ошибки геолокации
        },
      );
    }
  }, []);

  // Загрузка мест по категории или текстовому запросу
  useEffect(() => {
    if (!selectedCategory && !searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      setAvgPrice(undefined);
      return;
    }

    // Сбрасываем результаты при смене города
    if (selectedCategory) {
      setSearchResults([]);
    }

    setIsSearching(true);
    setSearchError(null);

    const fetchPlaces = async () => {
      try {
        let response: Response;
        
        if (selectedCategory) {
          // Поиск по категории
          const params = new URLSearchParams({
            category: selectedCategory,
            limit: '15',
          });

          // Добавляем фильтр по городу, если выбран
          if (selectedCity !== 'all') {
            // Для API нужно передать cityId, но мы можем фильтровать на клиенте или передать название города
            // Пока передаем как параметр, который API может использовать для фильтрации
            params.append('city', selectedCity);
          }

          if (userLocation) {
            params.append('lat', userLocation.lat.toString());
            params.append('lng', userLocation.lng.toString());
          }

          console.log('[SearchTab] Fetching category:', selectedCategory);

          response = await fetch(`/api/places/category?${params.toString()}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
        } else {
          // Поиск через GPT по текстовому запросу
          console.log('[SearchTab] Fetching GPT search:', searchQuery);

          response = await fetch('/api/places/gpt-search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: searchQuery.trim(),
              limit: 15,
              ...(userLocation && {
                lat: userLocation.lat,
                lng: userLocation.lng,
              }),
            }),
          });
        }

        if (!response.ok) {
          let errorMessage = 'Ошибка при загрузке мест';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            const errorText = await response.text();
            console.error('[SearchTab] Error response:', errorText);
          }
          setSearchError(errorMessage);
          setSearchResults([]);
          setIsSearching(false);
          return;
        }

        const data = await response.json();

        console.log('[SearchTab] Search response:', {
          ok: response.ok,
          category: data.category,
          placesCount: Array.isArray(data.places) ? data.places.length : 0,
          avgPrice: data.avgPrice,
        });

        if (response.ok && Array.isArray(data.places)) {
          setSearchResults(data.places);
          setAvgPrice(data.avgPrice);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error('[SearchTab] Fetch error:', error);
        if (error instanceof Error) {
          setSearchError(`Ошибка: ${error.message}`);
        } else {
          setSearchError('Произошла ошибка при загрузке мест');
        }
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(fetchPlaces, selectedCategory ? 0 : 500); // Debounce для текстового поиска
    return () => clearTimeout(timeoutId);
  }, [selectedCategory, selectedCity, searchQuery, userLocation]);

  const formatDistance = (distanceKm?: number) => {
    if (!distanceKm) return null;
    if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} м`;
    return `${distanceKm.toFixed(1)} км`;
  };

  const calculateMinutes = (distanceKm?: number) => {
    if (!distanceKm) return null;
    // Примерная скорость 50 км/ч для расчета времени
    const minutes = Math.round((distanceKm / 50) * 60);
    return minutes;
  };

  const [routeNotification, setRouteNotification] = useState<string | null>(null);

  const handleViewOnMap = (place: typeof searchResults[0]) => {
    // Переключаемся на вкладку с картой и центрируем на месте
    if (onRouteBuild && userLocation) {
      const route: RouteInstruction = {
        destination: {
          lat: place.lat,
          lng: place.lng,
        },
        origin: userLocation,
        note: `Просмотр места: ${place.name}`,
      };
      onRouteBuild(route);
      setRouteNotification(`Маршрут к "${place.name}" построен. Переключитесь на вкладку "AI-гид" чтобы увидеть карту.`);
      setTimeout(() => setRouteNotification(null), 5000);
    }
  };

  const handleBuildRoute = (place: typeof searchResults[0]) => {
    // Строим маршрут - старый маршрут автоматически заменяется новым
    if (onRouteBuild && userLocation) {
      const route: RouteInstruction = {
        destination: {
          lat: place.lat,
          lng: place.lng,
        },
        origin: userLocation,
        note: `Маршрут к: ${place.name}`,
      };
      // Заменяем старый маршрут новым
      onRouteBuild(route);
      setRouteNotification(`Маршрут к "${place.name}" построен. Переключитесь на вкладку "AI-гид" чтобы увидеть карту.`);
      setTimeout(() => setRouteNotification(null), 5000);
    }
  };

  const selectedCategoryLabel = CATEGORIES.find(c => c.id === selectedCategory)?.label;

  return (
    <div className="mt-3 flex-1 flex flex-col lg:min-h-0 h-full min-h-0 overflow-hidden">
      {/* Кнопка выбора категории */}
      <div className="mb-4 flex-shrink-0">
        <button
          type="button"
          onClick={() => setShowCategoryModal(true)}
          className="w-full rounded-xl border border-[#006948]/20 bg-white px-4 py-3 text-left transition hover:border-[#006948]/40 hover:bg-[#F4FFFA]/50 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{selectedCategory ? CATEGORIES.find(c => c.id === selectedCategory)?.icon : '📂'}</span>
            <div className="flex-1">
              <p className="text-xs text-[#7A7A7A]">Категория</p>
              <p className="text-sm font-medium text-[#0F2D1E]">
                {selectedCategoryLabel || 'Выберите категорию'}
              </p>
              {selectedCategory && selectedCity !== 'all' && (
                <p className="text-xs text-[#93A39C] mt-1">
                  {CITIES.find(c => c.id === selectedCity)?.label}
                </p>
              )}
            </div>
          </div>
          <svg className="h-5 w-5 text-[#7A7A7A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Поле поиска */}
        <div className="mt-3">
          <p className="text-xs text-[#7A7A7A] mb-2 text-center">или</p>
          <p className="text-xs text-[#7A7A7A] mb-2 text-center">поищите написав что вы хотите и где</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#93A39C] flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedCategory(null); // Сбрасываем категорию при вводе текста
              }}
              placeholder="Например: ресторан в Алматы, музей в Шымкенте..."
              className="w-full rounded-xl border border-[#006948]/20 bg-white px-10 py-3 text-sm text-[#0F2D1E] tracking-[-0.07em] placeholder:text-[#93A39C] focus:border-[#00A36C] focus:outline-none focus:ring-2 focus:ring-[#00A36C]/20"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#006948] border-t-transparent"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно выбора категорий */}
      <AnimatePresence>
        {showCategoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowCategoryModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-2xl border border-[#006948]/20 bg-white shadow-xl relative z-[10000]"
            >
            <div className="border-b border-[#006948]/10 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#0F2D1E]">
                  Выберите категорию
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="rounded-lg p-2 text-[#7A7A7A] transition hover:bg-[#F4FFFA] hover:text-[#006948]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {/* Выбор города */}
              <div className="mb-6">
                <p className="text-xs uppercase tracking-[0.3em] text-[#00A36C] mb-3">Выберите город</p>
                <div className="flex gap-2">
                  {CITIES.map((city) => (
                    <button
                      key={city.id}
                      type="button"
                      onClick={() => setSelectedCity(city.id)}
                      className={`flex-1 rounded-xl border p-3 text-center transition ${
                        selectedCity === city.id
                          ? 'border-[#006948] bg-[#F4FFFA] text-[#006948]'
                          : 'border-[#006948]/20 bg-white text-[#0F2D1E] hover:border-[#006948]/40 hover:bg-[#F4FFFA]/50'
                      }`}
                    >
                      <div className="text-2xl mb-1">{city.icon}</div>
                      <div className="text-xs font-medium tracking-[-0.02em]">{city.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Выбор категории */}
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[#00A36C] mb-3">Выберите категорию</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setSearchQuery(''); // Сбрасываем текстовый поиск
                        setShowCategoryModal(false);
                      }}
                      className={`rounded-xl border p-4 text-center transition ${
                        selectedCategory === cat.id
                          ? 'border-[#006948] bg-[#F4FFFA] text-[#006948]'
                          : 'border-[#006948]/20 bg-white text-[#0F2D1E] hover:border-[#006948]/40 hover:bg-[#F4FFFA]/50'
                      }`}
                    >
                      <div className="text-3xl mb-2">{cat.icon}</div>
                      <div className="text-xs font-medium tracking-[-0.02em]">{cat.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Результаты */}
      <div className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-2 sm:pr-2 min-h-0 pb-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        {routeNotification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-lg border border-[#006948]/20 bg-[#F4FFFA] p-3 text-sm text-[#006948]"
          >
            {routeNotification}
          </motion.div>
        )}
        {searchError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {searchError}
          </div>
        )}

        {!selectedCategory && !searchQuery.trim() ? (
          <div className="flex h-full flex-col items-center justify-center text-center py-8">
            <Search className="h-12 w-12 text-[#006948]/30" />
            <p className="mt-4 text-sm text-[#7A7A7A]">Выберите категорию или введите запрос</p>
            <p className="mt-2 text-xs text-[#93A39C]">GPT обработает запрос и найдет лучшие места</p>
          </div>
        ) : isSearching ? (
          <div className="flex h-full flex-col items-center justify-center text-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#006948] border-t-transparent"></div>
            <p className="mt-4 text-sm text-[#7A7A7A]">Ищем лучшие места...</p>
          </div>
        ) : searchResults.length === 0 && !searchError ? (
          <div className="flex h-full flex-col items-center justify-center text-center py-8">
            <Search className="h-12 w-12 text-[#006948]/30" />
            <p className="mt-4 text-sm text-[#7A7A7A]">Ничего не найдено</p>
            <p className="mt-2 text-xs text-[#93A39C]">Попробуйте другую категорию</p>
          </div>
        ) : searchResults.length > 0 ? (
          <>
            {avgPrice && (
              <div className="rounded-lg border border-[#006948]/10 bg-[#F4FFFA] p-3 text-center">
                <p className="text-xs text-[#7A7A7A]">Средний прайс в категории</p>
                <p className="text-lg font-semibold text-[#006948] mt-1">{avgPrice.toLocaleString()} ₸</p>
              </div>
            )}
            <AnimatePresence>
              {searchResults.map((result) => {
                const minutes = calculateMinutes(result.distanceKm);
                return (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-xl border border-[#006948]/10 bg-white p-4 shadow-sm transition hover:border-[#006948]/20 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-3">
                      <div>
                        <h3 className="text-base font-semibold tracking-[-0.03em] text-[#0F2D1E] break-words">
                          {result.name}
                        </h3>
                        {result.city && (
                          <p className="text-xs text-[#7A7A7A] mt-1">{result.city}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#7A7A7A]">
                        {result.distanceKm && (
                          <span className="flex items-center gap-1">
                            <MapPinned className="h-3 w-3" />
                            {formatDistance(result.distanceKm)}
                            {minutes && ` · ~${minutes} мин`}
                          </span>
                        )}
                        {result.price_kzt && (
                          <span className="text-[#006948] font-medium">
                            Средний прайс: {result.price_kzt.toLocaleString()} ₸
                          </span>
                        )}
                      </div>

                      {(() => {
                        const addrPlace = result.tags?.['addr:place'];
                        return typeof addrPlace === 'string' && addrPlace && (
                          <p className="text-xs text-[#93A39C] break-words">{addrPlace}</p>
                        );
                      })()}

                      <div className="flex flex-col sm:flex-row gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => handleViewOnMap(result)}
                          className="flex-1 rounded-lg border border-[#006948]/20 bg-white px-4 py-2 text-xs font-medium text-[#006948] transition hover:bg-[#F4FFFA]"
                        >
                          Посмотреть на карте
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBuildRoute(result)}
                          className="flex-1 rounded-lg bg-[#006948] px-4 py-2 text-xs font-medium text-white transition hover:bg-[#008A6A]"
                        >
                          Построить маршрут
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </>
        ) : null}
      </div>
    </div>
  );
}

function TemplatesTab() {
  const [templates] = useState<Array<{ id: string; title: string; description: string; rating: number; duration: string }>>([
    { id: '1', title: 'Классический Алматы', description: 'Обзорная экскурсия по главным достопримечательностям', rating: 4.8, duration: '4 часа' },
    { id: '2', title: 'Гастротур по Казахстану', description: 'Знакомство с национальной кухней', rating: 4.9, duration: '6 часов' },
    { id: '3', title: 'Исторический центр', description: 'Пешеходная экскурсия по старому городу', rating: 4.7, duration: '3 часа' },
  ]);

  return (
    <div className="mt-3 flex-1 space-y-3 overflow-y-auto pr-2 lg:min-h-0">
      {templates.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <Route className="h-12 w-12 text-[#006948]/30" />
          <p className="mt-4 text-sm text-[#7A7A7A]">Нет доступных шаблонов</p>
        </div>
      ) : (
        <AnimatePresence>
          {templates.map((template) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl border border-[#006948]/10 bg-white p-4 shadow-sm transition hover:border-[#006948]/20 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold tracking-[-0.03em] text-[#0F2D1E]">{template.title}</h3>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-[#FFD700] text-[#FFD700]" />
                      <span className="text-xs text-[#7A7A7A]">{template.rating}</span>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-[#7A7A7A]">{template.description}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-[#7A7A7A]">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {template.duration}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="ml-2 rounded-lg border border-[#006948]/20 bg-white px-3 py-1.5 text-xs font-medium text-[#006948] transition hover:bg-[#F4FFFA]"
                >
                  Использовать
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
}

function AIGuidePageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>(presetMessages);
  const [inputValue, setInputValue] = useState('');
  const [position, setPosition] = useState<LatLngExpression | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const [activeTab, setActiveTab] = useState(chatTabs[0].id);
  const [showPrompts, setShowPrompts] = useState(messages.length === 0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [routePlan, setRoutePlan] = useState<RouteInstruction | null>(null);
  const [routeKey, setRouteKey] = useState(0); // Ключ для принудительного обновления маршрута
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [safetyContacts, setSafetyContacts] = useState<Array<{
    id: string;
    name: string;
    location: { lat: number; lng: number; timestamp: string } | null;
  }>>([]);

  // Загружаем контакты безопасности независимо от активной вкладки
  useEffect(() => {
    let isMounted = true;
    
    async function fetchContacts() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('/api/safety/contacts', {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!isMounted) return;
        
        if (response.ok) {
          const data = await response.json();
          const fetchedContacts = data.contacts || [];
          
          // Фильтруем контакты с местоположениями (те, чье местоположение видно текущему пользователю)
          const contactsWithLocation = fetchedContacts
            .filter((c: typeof fetchedContacts[0]) => !c.isOwner && c.lastLocation)
            .map((c: typeof fetchedContacts[0]) => ({
              id: c._id,
              name: c.otherUser?.name || 'Неизвестный',
              location: c.lastLocation,
            }));
          
          setSafetyContacts(contactsWithLocation);
        }
      } catch (error: unknown) {
        if (!isMounted) return;
        
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn('Request timeout for safety contacts');
        } else {
          console.error('Failed to fetch safety contacts', error);
        }
      }
    }
    
    fetchContacts();
    
    // Обновляем контакты каждые 10 секунд для получения актуального местоположения
    const interval = setInterval(fetchContacts, 10000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Перенаправляем на страницу входа, если пользователь не авторизован
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  function generateId() {
    if (typeof crypto !== 'undefined') {
      if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
      if (typeof crypto.getRandomValues === 'function') {
        const array = new Uint16Array(8);
        crypto.getRandomValues(array);
        const toHex = (num: number) => num.toString(16).padStart(4, '0');
        return (
          toHex(array[0]) +
          toHex(array[1]) +
          '-' +
          toHex(array[2]) +
          '-' +
          toHex(array[3]) +
          '-' +
          toHex(array[4]) +
          '-' +
          toHex(array[5]) +
          toHex(array[6]) +
          toHex(array[7])
        );
      }
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGeoError(true);
      return;
    }

    setIsLocating(true);
    
    // Сначала пытаемся быстро получить местоположение из кеша
    navigator.geolocation.getCurrentPosition(
      (coords) => {
        setPosition([coords.coords.latitude, coords.coords.longitude]);
        setGeoError(false);
        setIsLocating(false);
      },
      () => {
        // Если кеш не помог, продолжаем с watchPosition
      },
      { enableHighAccuracy: false, timeout: 3000, maximumAge: 60_000 }
    );

    // Затем включаем отслеживание с более точными настройками
    const watcherId = navigator.geolocation.watchPosition(
      (coords) => {
        setPosition([coords.coords.latitude, coords.coords.longitude]);
        setGeoError(false);
        setIsLocating(false);
      },
      () => {
        setGeoError(true);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 10_000 },
    );

    return () => navigator.geolocation.clearWatch(watcherId);
  }, []);

  // Обработка URL параметров для построения маршрута
  useEffect(() => {
    const routeParam = searchParams.get('route');
    const destinationLat = searchParams.get('destinationLat');
    const destinationLng = searchParams.get('destinationLng');
    const destinationName = searchParams.get('destinationName');
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const nameParam = searchParams.get('name');

    if (routeParam === 'true' && destinationLat && destinationLng) {
      // Строим маршрут
      if (position) {
        const newRoute: RouteInstruction = {
          destination: {
            lat: Number(destinationLat),
            lng: Number(destinationLng),
          },
          origin: {
            lat: Array.isArray(position) ? position[0] : (position as { lat: number; lng: number }).lat,
            lng: Array.isArray(position) ? position[1] : (position as { lat: number; lng: number }).lng,
          },
          note: destinationName || 'Маршрут к выбранному месту',
        };
        setRoutePlan(newRoute);
        // Переключаемся на вкладку с картой
        setActiveTab('plans');
        // Очищаем параметры URL
        router.replace('/ai-guide');
      }
    } else if (latParam && lngParam) {
      // Показываем место на карте
      const mapPosition: LatLngExpression = [Number(latParam), Number(lngParam)];
      setPosition(mapPosition);
      setActiveTab('plans');
      // Очищаем параметры URL
      router.replace('/ai-guide');
    }
  }, [searchParams, position, router]);

  const activeHelper = chatTabs.find((tab) => tab.id === activeTab)?.helper;

  function handlePromptClick(prompt: string) {
    setInputValue(prompt);
  }

  // Функция для определения намерения пользователя и извлечения текста
  function detectUserIntent(text: string): { wantsPlan: boolean; wantsNote: boolean; content: string } {
    const lowerText = text.toLowerCase();
    // Расширенный список ключевых слов для планов
    const planKeywords = [
      'сохрани план', 'создай план', 'добавь план', 'запомни план', 
      'сохрани в планы', 'создать план', 'добавить план', 'сохрани как план',
      'создай маршрут', 'сохрани маршрут', 'добавь маршрут', 'план поездки',
      'план путешествия', 'маршрут поездки'
    ];
    // Расширенный список ключевых слов для заметок
    const noteKeywords = [
      'сохрани заметку', 'добавь в заметки', 'запомни это', 'сохрани чек', 
      'сохрани ваучер', 'добавить заметку', 'создать заметку', 'сохрани как заметку', 
      'запомни', 'сохрани информацию', 'добавь информацию', 'запиши',
      'сохрани данные', 'запомни данные'
    ];
    
    const wantsPlan = planKeywords.some(keyword => lowerText.includes(keyword));
    const wantsNote = noteKeywords.some(keyword => lowerText.includes(keyword));
    
    // Извлекаем текст после ключевого слова
    let content = text;
    if (wantsPlan) {
      const keyword = planKeywords.find(k => lowerText.includes(k));
      if (keyword) {
        const index = lowerText.indexOf(keyword) + keyword.length;
        content = text.substring(index).trim();
      }
    } else if (wantsNote) {
      const keyword = noteKeywords.find(k => lowerText.includes(k));
      if (keyword) {
        const index = lowerText.indexOf(keyword) + keyword.length;
        content = text.substring(index).trim();
      }
    }
    
    // Если контент пустой или слишком короткий, используем весь текст
    if (!content || content.length < 3) {
      content = text;
    }
    
    return { wantsPlan, wantsNote, content };
  }

  async function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || isGenerating) return;

    const timestamp = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    const userMessage: Message = {
      id: generateId(),
      author: 'user',
      text: trimmed,
      timestamp,
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInputValue('');
    setShowPrompts(false);
    setIsGenerating(true);
    setChatError(null);

    // Определяем намерение пользователя
    const { wantsPlan, wantsNote, content } = detectUserIntent(trimmed);
    
    // Если пользователь хочет сохранить план или заметку, сохраняем напрямую
    // Проверяем авторизацию
    if ((wantsPlan || wantsNote) && !session?.user) {
      const errorMessage: Message = {
        id: generateId(),
        author: 'ai',
        text: `⚠️ Для сохранения планов и заметок необходимо войти в систему. Пожалуйста, войдите или зарегистрируйтесь.`,
        timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsGenerating(false);
      return;
    }

    if (wantsPlan) {
      // Создаем план из текста пользователя
      const planTitle = content.length > 50 ? content.substring(0, 50) + '...' : content;
      const planData = {
        title: planTitle,
        date: new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }),
        description: content,
        locations: [],
      };
      
      try {
        const response = await fetch('/api/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(planData),
        });
        
        if (response.ok) {
          await response.json();
          const aiMessage: Message = {
            id: generateId(),
            author: 'ai',
            text: `✅ План "${planTitle}" успешно сохранен! Вы можете найти его во вкладке "Мои планы".`,
            timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, aiMessage]);
          setRefreshTrigger((prev) => prev + 1);
          setIsGenerating(false);
          return;
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          if (response.status === 401) {
            router.push('/auth/signin');
            return;
          }
          throw new Error(errorData.error || 'Failed to save plan');
        }
      } catch (error) {
        console.error('Failed to save plan', error);
        const errorMessage: Message = {
          id: generateId(),
          author: 'ai',
          text: `❌ Не удалось сохранить план. Попробуйте еще раз или создайте план вручную во вкладке "Мои планы".`,
          timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setIsGenerating(false);
        return;
      }
    } else if (wantsNote) {
      // Создаем заметку из текста пользователя
      const noteTitle = content.length > 50 ? content.substring(0, 50) + '...' : content;
      const noteType = trimmed.toLowerCase().includes('чек') ? 'receipt' : 
                      trimmed.toLowerCase().includes('ваучер') ? 'voucher' : 'note';
      
      const noteData = {
        title: noteTitle,
        content: content,
        type: noteType,
      };
      
      try {
        const response = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(noteData),
        });
        
        if (response.ok) {
          await response.json();
          const aiMessage: Message = {
            id: generateId(),
            author: 'ai',
            text: `✅ Заметка "${noteTitle}" успешно сохранена! Вы можете найти ее во вкладке "заметки".`,
            timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, aiMessage]);
          setRefreshTrigger((prev) => prev + 1);
          setIsGenerating(false);
          return;
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          if (response.status === 401) {
            router.push('/auth/signin');
            return;
          }
          throw new Error(errorData.error || 'Failed to save note');
        }
      } catch (error) {
        console.error('Failed to save note', error);
        const errorMessage: Message = {
          id: generateId(),
          author: 'ai',
          text: `❌ Не удалось сохранить заметку. Попробуйте еще раз или создайте заметку вручную во вкладке "заметки".`,
          timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setIsGenerating(false);
        return;
      }
    }
    
    // Если не план и не заметка, продолжаем обычный диалог с AI
    const enhancedPrompt = trimmed;

    const conversationHistory = nextMessages.slice(-6).map((message) => ({
      role: message.author === 'user' ? 'user' : 'assistant',
      content: message.text,
    }));
    const coordsPayload = extractCoords(position);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          history: conversationHistory,
          coords: coordsPayload,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reach AI guide');
      }

      const payload = (await response.json()) as { reply?: string };
      const rawAnswer =
        payload.reply?.trim() ??
        'Не удалось подготовить маршрут. Попробуйте уточнить детали или задайте другой вопрос.';
      
      // Debug: log raw answer to see what AI returns
      console.log('Raw AI answer:', rawAnswer);
      
      // Parse plan and note FIRST (before route, as route might be inside plan)
      const { text: textAfterPlanNote, plan: parsedPlan, note: parsedNote } = parsePlanAndNote(rawAnswer);
      
      // Parse route instruction from remaining text
      const { text: cleanedRaw, plan: routePlan } = parseRouteInstruction(textAfterPlanNote);
      
      // Debug: log parsed data
      if (parsedPlan) {
        console.log('Parsed plan:', parsedPlan);
      }
      if (parsedNote) {
        console.log('Parsed note:', parsedNote);
      }
      
      const aiMessage: Message = {
        id: generateId(),
        author: 'ai',
        text: sanitizeAIResponse(cleanedRaw),
        timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMessage]);
      
      // Set route plan if exists
      if (routePlan) {
        setRoutePlan(routePlan);
      }

      // Save plan if parsed from AI response
      if (parsedPlan) {
        try {
          console.log('Saving plan from AI response...', parsedPlan);
          
          // Если в плане есть места с координатами, строим маршрут автоматически
          if (parsedPlan.locations && Array.isArray(parsedPlan.locations) && parsedPlan.locations.length > 0) {
            const locationsWithCoords = parsedPlan.locations.filter((loc: any) => 
              loc && typeof loc === 'object' && typeof loc.lat === 'number' && typeof loc.lng === 'number'
            );
            
            if (locationsWithCoords.length > 0) {
              const firstLocation = locationsWithCoords[0] as { lat: number; lng: number; name?: string };
              const lastLocation = locationsWithCoords[locationsWithCoords.length - 1] as { lat: number; lng: number; name?: string };
              const viaPoints = locationsWithCoords.slice(1, -1).map((loc: any) => ({
                lat: loc.lat,
                lng: loc.lng,
              }));

              // Строим маршрут из мест плана
              // Используем текущее местоположение пользователя как начало, если доступно
              let origin: { lat: number; lng: number };
              if (position && Array.isArray(position) && position.length === 2) {
                origin = { lat: position[0], lng: position[1] };
              } else if (position && typeof position === 'object' && 'lat' in position && 'lng' in position) {
                origin = { lat: (position as any).lat, lng: (position as any).lng };
              } else {
                // Если нет текущего местоположения, используем первое место как начало
                origin = { lat: firstLocation.lat, lng: firstLocation.lng };
              }
              
              const planRoute: RouteInstruction = {
                origin,
                destination: { lat: lastLocation.lat, lng: lastLocation.lng },
                via: viaPoints.length > 0 ? viaPoints : undefined,
                note: `Маршрут: ${parsedPlan.title}`,
                hints: locationsWithCoords.map((loc: any, index: number) => ({
                  instruction: `${index + 1}. ${loc.name || 'Место'}`,
                  distance: 0,
                  time: 0,
                  sign: 0,
                })),
              };
              
              // Устанавливаем маршрут на карте
              setRoutePlan(planRoute);
              setRouteKey(prev => prev + 1);
              
              // Переключаемся на вкладку с картой для просмотра маршрута
              setActiveTab('plans');
              
              console.log('Route built from plan locations:', planRoute);
            }
          }
          
          const planResponse = await fetch('/api/plans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsedPlan),
          });
          
          if (planResponse.ok) {
            const planData = await planResponse.json();
            console.log('Plan saved successfully:', planData);
            setRefreshTrigger((prev) => prev + 1);
            
            const locationsCount = parsedPlan.locations?.length || 0;
            const locationsWithCoordsCount = parsedPlan.locations?.filter((loc: any) => 
              loc && typeof loc === 'object' && typeof loc.lat === 'number' && typeof loc.lng === 'number'
            ).length || 0;
            
            let saveMessageText = `✅ План "${parsedPlan.title}" сохранен!`;
            if (locationsWithCoordsCount > 0) {
              saveMessageText += ` Маршрут из ${locationsWithCoordsCount} мест открыт на карте.`;
            } else if (locationsCount > 0) {
              saveMessageText += ` В плане ${locationsCount} мест, но нет координат.`;
            }
            saveMessageText += ` Найти план можно во вкладке "Мои планы".`;
            
            const saveMessage: Message = {
              id: generateId(),
              author: 'ai',
              text: saveMessageText,
              timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages((prev) => [...prev, saveMessage]);
          } else {
            const errorData = await planResponse.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Failed to save plan - API error:', errorData);
          }
        } catch (error) {
          console.error('Failed to save plan', error);
        }
      }

      // Save note if parsed from AI response
      if (parsedNote) {
        try {
          console.log('Saving note from AI response...', parsedNote);
          const noteResponse = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsedNote),
          });
          
          if (noteResponse.ok) {
            const noteData = await noteResponse.json();
            console.log('Note saved successfully:', noteData);
            setRefreshTrigger((prev) => prev + 1);
            // Добавляем сообщение о сохранении
            const saveMessage: Message = {
              id: generateId(),
              author: 'ai',
              text: `✅ Заметка "${parsedNote.title}" сохранена! Найти ее можно во вкладке "заметки".`,
              timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages((prev) => [...prev, saveMessage]);
          } else {
            const errorData = await noteResponse.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Failed to save note - API error:', errorData);
          }
        } catch (error) {
          console.error('Failed to save note', error);
        }
      }
    } catch (error) {
      console.error(error);
      const fallbackMessage: Message = {
        id: generateId(),
        author: 'ai',
        text: 'Подключение к AI-гиду временно недоступно. Попробуйте ещё раз через минуту.',
        timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMessage]);
      setChatError('Не удалось получить ответ. Проверьте соединение и попробуйте снова.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#ffffff] pt-28 pb-6">
      <div className="flex w-full flex-col justify-center px-3 sm:px-5 lg:px-10 lg:h-[calc(100vh-170px)]">
        <section className="grid w-full gap-4 rounded-[32px] border border-[#006948]/10 bg-white/90 p-4 shadow-[0_28px_90px_rgba(0,105,72,0.08)] backdrop-blur lg:h-full lg:grid-cols-[3fr_2fr] lg:overflow-hidden">
          <div className="flex flex-col lg:h-full lg:min-h-0">
            {/* Dock версия для мобильных (только иконки) */}
            <div className="flex items-center justify-center gap-2 pb-2 lg:hidden overflow-visible relative z-10">
              {chatTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.id === activeTab;
                return (
                  <motion.button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className="group relative flex flex-col items-center flex-shrink-0 z-10"
                    whileHover={{ scale: 1.15, y: -8 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ scale: 1 }}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300 relative z-10 ${
                        isActive
                          ? 'bg-[#006948] text-white shadow-lg shadow-[#006948]/30'
                          : 'bg-white border border-[#006948]/20 text-[#006948] group-hover:bg-[#F4FFFA] group-hover:border-[#006948]/40'
                      }`}
                    >
                      <Icon className={`h-4 w-4 transition-all duration-300 ${isActive ? 'scale-110' : ''}`} />
                    </div>
                    <motion.span
                      className="absolute -bottom-6 whitespace-nowrap text-[10px] font-medium text-[#006948] opacity-0 transition-opacity duration-200 group-hover:opacity-100 pointer-events-none z-10"
                      initial={{ opacity: 0, y: -4 }}
                      whileHover={{ opacity: 1, y: 0 }}
                    >
                      {tab.label}
                    </motion.span>
                  </motion.button>
                );
              })}
            </div>

            {/* Старая версия для десктопа (с текстом) */}
            <div className="hidden lg:flex flex-wrap gap-2 pb-2">
              {chatTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-sm px-5 py-2 text-xs font-semibold uppercase tracking-[-0.07em] transition ${
                    tab.id === activeTab
                      ? 'bg-[#006948] text-white shadow-[0_12px_30px_rgba(0,105,72,0.35)]'
                      : 'border border-[#006948]/20 text-[#006948]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="mt-2 h-[60vh] overflow-hidden rounded-[24px] border border-[#006948]/15 bg-white p-4 lg:mt-4 lg:h-auto lg:flex-1 lg:overflow-hidden">
              <div className="flex h-full flex-col lg:min-h-0 overflow-hidden">
                <div className="flex items-center gap-2 text-xs tracking-[-0.05em] text-[#7A7A7A]">
                  <MapPinned className="h-4 w-4 text-[#00A36C]" />
                  <span className="tracking-[-0.07em] text-[#2A3C36]">{activeHelper}</span>
                </div>
                <AnimatePresence mode="wait">
                  {activeTab === 'plans' && (
                    <motion.div
                      key="plans"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                      className="flex h-full flex-col lg:min-h-0"
                    >
                      <PlansTab
                        messages={messages}
                        inputValue={inputValue}
                        setInputValue={setInputValue}
                        showPrompts={showPrompts}
                        isGenerating={isGenerating}
                        chatError={chatError}
                        handleSend={handleSend}
                        handlePromptClick={handlePromptClick}
                        quickPrompts={quickPrompts}
                      />
                    </motion.div>
                  )}
                  {activeTab === 'shared' && (
                    <motion.div
                      key="shared"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                      className="flex h-full flex-col lg:min-h-0"
                    >
                      <SharedPlansTab 
                        refreshTrigger={refreshTrigger}
                        onRouteBuild={(route) => {
                          setRoutePlan(route);
                          setRouteKey(prev => prev + 1);
                          // Переключаемся на вкладку с картой для просмотра маршрута
                          setActiveTab('plans');
                        }}
                      />
                    </motion.div>
                  )}
                  {activeTab === 'notes' && (
                    <motion.div
                      key="notes"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                      className="flex h-full flex-col lg:min-h-0"
                    >
                      <NotesTab refreshTrigger={refreshTrigger} />
                    </motion.div>
                  )}
                  {activeTab === 'safety' && (
                    <motion.div
                      key="safety"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                      className="flex h-full flex-col lg:min-h-0"
                    >
                      <SafetyTab onContactsChange={setSafetyContacts} />
                    </motion.div>
                  )}
                  {activeTab === 'search' && (
                    <motion.div
                      key="search"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                      className="flex h-full flex-col lg:min-h-0 overflow-hidden"
                    >
                      <SearchTab 
                        onRouteBuild={(route) => {
                          // Заменяем старый маршрут новым и обновляем ключ для принудительного обновления карты
                          setRoutePlan(route);
                          setRouteKey(prev => prev + 1); // Увеличиваем ключ, чтобы карта обновилась
                          // Остаемся на табе поиск мест
                        }}
                      />
                    </motion.div>
                  )}
                  {activeTab === 'templates' && (
                    <motion.div
                      key="templates"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                      className="flex h-full flex-col lg:min-h-0"
                    >
                      <TemplatesTab />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="min-h-[260px] rounded-xl border border-[#006948]/15 bg-white p-3 lg:flex-1 lg:min-h-0">
              <DeviceLocationMap
                key={`map-${routeKey}`}
                position={position}
                isLocating={isLocating}
                hasError={geoError}
                routePlan={routePlan}
                contacts={safetyContacts.filter(c => c.location !== null) as Array<{ id: string; name: string; location: { lat: number; lng: number; timestamp: string } }>}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function AIGuidePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#006948] border-t-transparent" />
      </div>
    }>
      <AIGuidePageContent />
    </Suspense>
  );
}
