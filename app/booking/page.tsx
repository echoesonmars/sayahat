"use client";

import { useState, useEffect } from "react";
import { BlurFade } from "@/components/ui/blur-fade";
import { TextAnimate } from "@/components/ui/text-animate";
import { useSession } from "next-auth/react";
import { Hotel, Train, Plane, Car, Bus, Calendar, MapPin, Star, ArrowRight, Route, Clock, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RouteInstruction } from "@/lib/geo";

interface Plan {
  _id: string;
  title: string;
  date?: string;
  description?: string;
  locations?: Array<{
    name: string;
    lat?: number;
    lng?: number;
    type?: string;
  }>;
}

interface BookingItem {
  id: string;
  name: string;
  category: string;
  description: string;
  rating: number;
  price: string;
  location: string;
  image?: string;
}

interface ReadyTrip {
  id: string;
  title: string;
  city: string;
  description: string;
  duration: string;
  rating: number;
  locations: Array<{
    name: string;
    type: string;
    lat: number;
    lng: number;
  }>;
  route: RouteInstruction;
}

const bookingCategories = [
  { id: "hotels", name: "Отели", icon: Hotel, color: "from-blue-500 to-blue-600" },
  { id: "motels", name: "Мотели", icon: Car, color: "from-purple-500 to-purple-600" },
  { id: "trains", name: "Поезда", icon: Train, color: "from-green-500 to-green-600" },
  { id: "flights", name: "Авиа", icon: Plane, color: "from-orange-500 to-orange-600" },
  { id: "taxis", name: "Такси", icon: Car, color: "from-yellow-500 to-yellow-600" },
  { id: "buses", name: "Автобусы", icon: Bus, color: "from-red-500 to-red-600" },
];

// Выдуманные данные для рекомендаций
const recommendedItems: Record<string, BookingItem[]> = {
  hotels: [
    {
      id: "1",
      name: "Rixos Almaty",
      category: "Отель",
      description: "5-звездочный отель в центре Алматы с видом на горы. Включает спа-центр, бассейн и ресторан.",
      rating: 4.8,
      price: "от 25,000 ₸/ночь",
      location: "Алматы, проспект Абая",
    },
    {
      id: "2",
      name: "Hilton Astana",
      category: "Отель",
      description: "Современный отель в деловом центре Астаны. Близко к достопримечательностям и торговым центрам.",
      rating: 4.7,
      price: "от 30,000 ₸/ночь",
      location: "Астана, проспект Кабанбай батыра",
    },
    {
      id: "3",
      name: "Grand Hotel Shymkent",
      category: "Отель",
      description: "Комфортабельный отель в историческом центре Шымкента. Идеально для туристов.",
      rating: 4.6,
      price: "от 18,000 ₸/ночь",
      location: "Шымкент, улица Байтурсынова",
    },
  ],
  motels: [
    {
      id: "4",
      name: "Roadside Inn",
      category: "Мотель",
      description: "Удобный мотель на трассе Алматы-Астана. Бесплатная парковка и Wi-Fi.",
      rating: 4.2,
      price: "от 8,000 ₸/ночь",
      location: "Трасса А1, км 250",
    },
    {
      id: "5",
      name: "Traveler's Rest",
      category: "Мотель",
      description: "Комфортные номера для путешественников. Ресторан и магазин на территории.",
      rating: 4.0,
      price: "от 7,500 ₸/ночь",
      location: "Трасса М36, км 180",
    },
  ],
  trains: [
    {
      id: "6",
      name: "Talgo Алматы-Астана",
      category: "Поезд",
      description: "Скоростной поезд Talgo. Комфортабельные вагоны, ресторан, Wi-Fi. Время в пути: 12 часов.",
      rating: 4.5,
      price: "от 5,000 ₸",
      location: "Алматы → Астана",
    },
    {
      id: "7",
      name: "Жана Арка",
      category: "Поезд",
      description: "Современный поезд с купе и плацкартом. Удобное расписание и комфортные условия.",
      rating: 4.3,
      price: "от 3,500 ₸",
      location: "Алматы → Шымкент",
    },
  ],
  flights: [
    {
      id: "8",
      name: "Air Astana",
      category: "Авиа",
      description: "Прямой рейс Алматы-Астана. Время в пути: 1 час 30 минут. Включен багаж до 20 кг.",
      rating: 4.7,
      price: "от 25,000 ₸",
      location: "Алматы → Астана",
    },
    {
      id: "9",
      name: "SCAT Airlines",
      category: "Авиа",
      description: "Экономичный перелет по Казахстану. Регулярные рейсы в основные города.",
      rating: 4.4,
      price: "от 18,000 ₸",
      location: "Внутренние рейсы",
    },
  ],
  taxis: [
    {
      id: "10",
      name: "Yandex Taxi",
      category: "Такси",
      description: "Удобное такси по всему Казахстану. Фиксированные тарифы, оплата картой или наличными.",
      rating: 4.6,
      price: "от 500 ₸/км",
      location: "По всему Казахстану",
    },
    {
      id: "11",
      name: "Uber",
      category: "Такси",
      description: "Междугородние поездки на комфортабельных автомобилях. Безопасно и надежно.",
      rating: 4.5,
      price: "от 600 ₸/км",
      location: "Крупные города",
    },
  ],
  buses: [
    {
      id: "12",
      name: "Автобус Алматы-Астана",
      category: "Автобус",
      description: "Комфортабельные автобусы с кондиционером. Регулярные рейсы, удобное расписание.",
      rating: 4.2,
      price: "от 3,000 ₸",
      location: "Алматы → Астана",
    },
    {
      id: "13",
      name: "Междугородние автобусы",
      category: "Автобус",
      description: "Экономичный способ путешествия между городами. Прямые рейсы и пересадки.",
      rating: 4.0,
      price: "от 2,500 ₸",
      location: "Междугородние маршруты",
    },
  ],
};

// 10 готовых трипов по разным городам Казахстана
const readyTrips: ReadyTrip[] = [
  {
    id: "1",
    title: "Исторический Шымкент",
    city: "Шымкент",
    description: "Погрузитесь в историю древнего города: цитадель, этноаул, горы и традиционная кухня",
    duration: "1 день",
    rating: 4.8,
    locations: [
      { name: "Цитадель Шымкента", type: "достопримечательность", lat: 42.3188, lng: 69.5969 },
      { name: "Этноаул Каскасу", type: "этно", lat: 42.3676, lng: 69.9151 },
      { name: "Горы Каратау", type: "природа", lat: 42.4500, lng: 69.8000 },
      { name: "Ресторан Алаш", type: "кафе", lat: 42.3200, lng: 69.6000 },
    ],
    route: {
      origin: { lat: 42.3188, lng: 69.5969 },
      destination: { lat: 42.3200, lng: 69.6000 },
      via: [
        { lat: 42.3676, lng: 69.9151 },
        { lat: 42.4500, lng: 69.8000 },
      ],
    },
  },
  {
    id: "2",
    title: "Алматы: Город и Горы",
    city: "Алматы",
    description: "Классический маршрут: Кок-Тобе, Медеу, горы и уютные кафе в центре",
    duration: "1 день",
    rating: 4.9,
    locations: [
      { name: "Кок-Тобе", type: "достопримечательность", lat: 43.238949, lng: 76.889709 },
      { name: "Медеу", type: "спорт", lat: 43.2263, lng: 77.0501 },
      { name: "Горное ущелье", type: "природа", lat: 43.2000, lng: 77.1000 },
      { name: "Кафе Арбат", type: "кафе", lat: 43.2380, lng: 76.9450 },
    ],
    route: {
      origin: { lat: 43.238949, lng: 76.889709 },
      destination: { lat: 43.2380, lng: 76.9450 },
      via: [
        { lat: 43.2263, lng: 77.0501 },
        { lat: 43.2000, lng: 77.1000 },
      ],
    },
  },
  {
    id: "3",
    title: "Современная Астана",
    city: "Астана",
    description: "Столица Казахстана: Байтерек, Хан Шатыр, музеи и рестораны",
    duration: "1 день",
    rating: 4.7,
    locations: [
      { name: "Байтерек", type: "достопримечательность", lat: 51.1256, lng: 71.4306 },
      { name: "Хан Шатыр", type: "торговый центр", lat: 51.1500, lng: 71.4000 },
      { name: "Музей Первого Президента", type: "музей", lat: 51.1600, lng: 71.4200 },
      { name: "Ресторан Астана", type: "кафе", lat: 51.1300, lng: 71.4400 },
    ],
    route: {
      origin: { lat: 51.1256, lng: 71.4306 },
      destination: { lat: 51.1300, lng: 71.4400 },
      via: [
        { lat: 51.1500, lng: 71.4000 },
        { lat: 51.1600, lng: 71.4200 },
      ],
    },
  },
  {
    id: "4",
    title: "Туркестан: Древняя Столица",
    city: "Туркестан",
    description: "Мавзолей Ходжи Ахмеда Ясави, древние руины и традиционные ремесла",
    duration: "1 день",
    rating: 4.6,
    locations: [
      { name: "Мавзолей Ходжи Ахмеда Ясави", type: "достопримечательность", lat: 43.2975, lng: 68.2517 },
      { name: "Древние руины Отрар", type: "история", lat: 42.8500, lng: 68.3000 },
      { name: "Мастерская ремесленников", type: "ремесла", lat: 43.3000, lng: 68.2500 },
      { name: "Чайхана Старый Город", type: "кафе", lat: 43.2950, lng: 68.2550 },
    ],
    route: {
      origin: { lat: 43.2975, lng: 68.2517 },
      destination: { lat: 43.2950, lng: 68.2550 },
      via: [
        { lat: 42.8500, lng: 68.3000 },
        { lat: 43.3000, lng: 68.2500 },
      ],
    },
  },
  {
    id: "5",
    title: "Алтайские Вершины",
    city: "Усть-Каменогорск",
    description: "Горные походы, озера, водопады и база отдыха в горах",
    duration: "2 дня",
    rating: 4.9,
    locations: [
      { name: "Гора Белуха", type: "природа", lat: 49.8000, lng: 86.6000 },
      { name: "Озеро Маркаколь", type: "природа", lat: 48.7000, lng: 85.8000 },
      { name: "Водопад Кокколь", type: "природа", lat: 49.2000, lng: 86.3000 },
      { name: "База отдыха Алтай", type: "отель", lat: 49.9000, lng: 82.6000 },
    ],
    route: {
      origin: { lat: 49.8000, lng: 86.6000 },
      destination: { lat: 49.9000, lng: 82.6000 },
      via: [
        { lat: 48.7000, lng: 85.8000 },
        { lat: 49.2000, lng: 86.3000 },
      ],
    },
  },
  {
    id: "6",
    title: "Караганда: Индустриальное Наследие",
    city: "Караганда",
    description: "Музеи, памятники, парки и современные кафе в центре города",
    duration: "1 день",
    rating: 4.5,
    locations: [
      { name: "Музей истории Караганды", type: "музей", lat: 49.8014, lng: 73.1043 },
      { name: "Парк Победы", type: "парк", lat: 49.8100, lng: 73.1200 },
      { name: "Памятник Шахтерам", type: "достопримечательность", lat: 49.8000, lng: 73.1100 },
      { name: "Кафе Центральное", type: "кафе", lat: 49.8020, lng: 73.1050 },
    ],
    route: {
      origin: { lat: 49.8014, lng: 73.1043 },
      destination: { lat: 49.8020, lng: 73.1050 },
      via: [
        { lat: 49.8100, lng: 73.1200 },
        { lat: 49.8000, lng: 73.1100 },
      ],
    },
  },
  {
    id: "7",
    title: "Актобе: Река и Парки",
    city: "Актобе",
    description: "Прогулки по набережной, парки, музеи и местная кухня",
    duration: "1 день",
    rating: 4.4,
    locations: [
      { name: "Набережная Илека", type: "парк", lat: 50.2833, lng: 57.1667 },
      { name: "Парк Победы", type: "парк", lat: 50.2900, lng: 57.1700 },
      { name: "Краеведческий музей", type: "музей", lat: 50.2800, lng: 57.1600 },
      { name: "Ресторан Актобе", type: "кафе", lat: 50.2850, lng: 57.1650 },
    ],
    route: {
      origin: { lat: 50.2833, lng: 57.1667 },
      destination: { lat: 50.2850, lng: 57.1650 },
      via: [
        { lat: 50.2900, lng: 57.1700 },
        { lat: 50.2800, lng: 57.1600 },
      ],
    },
  },
  {
    id: "8",
    title: "Павлодар: Иртыш и Культура",
    city: "Павлодар",
    description: "Набережная Иртыша, театры, музеи и уютные кафе",
    duration: "1 день",
    rating: 4.5,
    locations: [
      { name: "Набережная Иртыша", type: "парк", lat: 52.2833, lng: 76.9667 },
      { name: "Драматический театр", type: "культура", lat: 52.2900, lng: 76.9700 },
      { name: "Краеведческий музей", type: "музей", lat: 52.2800, lng: 76.9600 },
      { name: "Кафе на Иртыше", type: "кафе", lat: 52.2850, lng: 76.9650 },
    ],
    route: {
      origin: { lat: 52.2833, lng: 76.9667 },
      destination: { lat: 52.2850, lng: 76.9650 },
      via: [
        { lat: 52.2900, lng: 76.9700 },
        { lat: 52.2800, lng: 76.9600 },
      ],
    },
  },
  {
    id: "9",
    title: "Тараз: Древний Шелковый Путь",
    city: "Тараз",
    description: "Древние памятники, мавзолеи, базары и традиционная кухня",
    duration: "1 день",
    rating: 4.6,
    locations: [
      { name: "Мавзолей Карахана", type: "достопримечательность", lat: 42.9000, lng: 71.3667 },
      { name: "Древний Тараз", type: "история", lat: 42.8800, lng: 71.3500 },
      { name: "Центральный базар", type: "рынок", lat: 42.9200, lng: 71.3800 },
      { name: "Ресторан Тараз", type: "кафе", lat: 42.9100, lng: 71.3700 },
    ],
    route: {
      origin: { lat: 42.9000, lng: 71.3667 },
      destination: { lat: 42.9100, lng: 71.3700 },
      via: [
        { lat: 42.8800, lng: 71.3500 },
        { lat: 42.9200, lng: 71.3800 },
      ],
    },
  },
  {
    id: "10",
    title: "Костанай: Степи и Озера",
    city: "Костанай",
    description: "Озера, парки, музеи и современные развлечения",
    duration: "1 день",
    rating: 4.4,
    locations: [
      { name: "Озеро Алаколь", type: "природа", lat: 53.2167, lng: 63.6333 },
      { name: "Парк Победы", type: "парк", lat: 53.2200, lng: 63.6400 },
      { name: "Краеведческий музей", type: "музей", lat: 53.2100, lng: 63.6200 },
      { name: "Кафе Костанай", type: "кафе", lat: 53.2150, lng: 63.6300 },
    ],
    route: {
      origin: { lat: 53.2167, lng: 63.6333 },
      destination: { lat: 53.2150, lng: 63.6300 },
      via: [
        { lat: 53.2200, lng: 63.6400 },
        { lat: 53.2100, lng: 63.6200 },
      ],
    },
  },
];

export default function BookingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("hotels");
  const [tripSearchQuery, setTripSearchQuery] = useState<string>("");

  useEffect(() => {
    async function fetchPlans() {
      if (!session) {
        setIsLoadingPlans(false);
        return;
      }
      try {
        const response = await fetch("/api/plans");
        if (response.ok) {
          const data = await response.json();
          setPlans(data.plans || []);
        }
      } catch (error) {
        console.error("Failed to fetch plans", error);
      } finally {
        setIsLoadingPlans(false);
      }
    }
    fetchPlans();
  }, [session]);

  // Проверяем, есть ли в планах бронируемые элементы
  const hasBookableItems = (plan: Plan) => {
    if (!plan.locations || plan.locations.length === 0) return false;
    // Проверяем, есть ли отели, транспорт и т.д. в описании или локациях
    const bookableKeywords = ["отель", "hotel", "гостиница", "транспорт", "поезд", "самолет", "автобус", "такси"];
    const planText = `${plan.title} ${plan.description || ""} ${plan.locations.map((l) => l.name).join(" ")}`.toLowerCase();
    return bookableKeywords.some((keyword) => planText.includes(keyword));
  };

  const handleBook = (item: BookingItem) => {
    // Здесь можно добавить логику бронирования
    alert(`Бронирование ${item.name} будет доступно в ближайшее время!`);
  };

  const handleUseTrip = (trip: ReadyTrip) => {
    // Сохраняем маршрут в localStorage и переходим на AI-гид с открытым маршрутом
    if (typeof window !== "undefined") {
      localStorage.setItem("readyTripRoute", JSON.stringify(trip.route));
      router.push(`/ai-guide?tab=templates&trip=${trip.id}`);
    }
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="px-4 mt-[6rem] sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <BlurFade inView>
            <div className="text-center">
              <TextAnimate
                as="p"
                animation="slideUp"
                by="word"
                className="text-xs uppercase tracking-[0.3em] text-[#006948]"
              >
                бронирования
              </TextAnimate>
              <TextAnimate
                as="h1"
                animation="slideUp"
                by="word"
                delay={0.2}
                className="mt-4 font-tapestry text-4xl sm:text-6xl lg:text-7xl tracking-[-0.08em] text-[#006948]"
              >
                Управляйте поездками как продуктом
              </TextAnimate>
              <TextAnimate
                as="p"
                animation="slideUp"
                by="word"
                delay={0.4}
                className="mt-6 text-lg sm:text-xl tracking-[-0.03em] text-[#4A4A4A] max-w-3xl mx-auto"
              >
                Sayahat аккумулирует лучших локальных партнёров, объединяет в одну оплату и помогает удерживать бюджет.
              </TextAnimate>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* Available Bookings from Plans */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <BlurFade inView>
            <div className="mb-12">
              <TextAnimate
                as="p"
                animation="slideUp"
                by="word"
                className="text-xs uppercase tracking-[0.3em] text-[#006948]"
              >
                доступные брони
              </TextAnimate>
              <TextAnimate
                as="h2"
                animation="slideUp"
                by="word"
                delay={0.2}
                className="mt-4 font-tapestry text-3xl sm:text-4xl lg:text-5xl tracking-[-0.08em] text-[#006948]"
              >
                По вашим планам
              </TextAnimate>
              <TextAnimate
                as="p"
                animation="slideUp"
                by="word"
                delay={0.4}
                className="mt-4 text-base sm:text-lg tracking-[-0.03em] text-[#4A4A4A] max-w-2xl"
              >
                Бронируйте отели, транспорт и услуги прямо из ваших сохраненных планов путешествий.
              </TextAnimate>
            </div>
          </BlurFade>

          {session ? (
            isLoadingPlans ? (
              <BlurFade inView delay={0.3}>
                <div className="rounded-3xl border border-[#006948]/20 bg-[#F8FFFB] p-12 text-center">
                  <p className="text-[#4A4A4A]">Загрузка планов...</p>
                </div>
              </BlurFade>
            ) : plans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans
                  .filter(hasBookableItems)
                  .map((plan, index) => (
                    <BlurFade key={plan._id} inView delay={0.3 + index * 0.05}>
                      <div className="rounded-3xl border border-[#006948]/20 bg-white p-6 shadow-[0_0_40px_rgba(0,105,72,0.08)] flex flex-col">
                        <div className="flex items-start gap-3 mb-4">
                          <Calendar className="w-5 h-5 text-[#006948] flex-shrink-0 mt-1" />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-semibold tracking-[-0.05em] text-[#006948] truncate">
                              {plan.title}
                            </h3>
                            {plan.date && (
                              <p className="text-sm text-[#7A7A7A] mt-1">{plan.date}</p>
                            )}
                          </div>
                        </div>
                        {plan.description && (
                          <p className="text-sm text-[#4A4A4A] mb-4 line-clamp-2">{plan.description}</p>
                        )}
                        {plan.locations && plan.locations.length > 0 && (
                          <div className="mb-4 flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-[#7A7A7A] flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-[#4A4A4A] truncate">
                                {plan.locations.slice(0, 2).map((l) => l.name).join(", ")}
                                {plan.locations.length > 2 && ` +${plan.locations.length - 2}`}
                              </p>
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => handleBook({ id: plan._id, name: plan.title, category: "План", description: plan.description || "", rating: 0, price: "", location: "" })}
                          className="mt-auto w-full rounded-full bg-[#006948] hover:bg-[#008A6A] px-6 py-3 text-white text-sm font-semibold tracking-[0.2em] transition hover:-translate-y-0.5 hover:shadow-lg flex items-center justify-center gap-2"
                        >
                          <span>Забронировать</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </BlurFade>
                  ))}
              </div>
            ) : (
              <BlurFade inView delay={0.3}>
                <div className="rounded-3xl border border-[#006948]/20 bg-[#F8FFFB] p-12 text-center">
                  <Calendar className="w-12 h-12 text-[#006948] mx-auto mb-4" />
                  <p className="text-lg font-semibold text-[#006948] mb-2">Нет планов с бронируемыми элементами</p>
                  <p className="text-sm text-[#4A4A4A] mb-6">
                    Создайте план путешествия в AI-гиде, и здесь появятся доступные бронирования
                  </p>
                  <Link
                    href="/ai-guide"
                    className="inline-flex items-center justify-center rounded-full bg-[#006948] px-6 py-3 text-sm font-semibold tracking-[0.3em] text-white transition hover:-translate-y-0.5"
                  >
                    Создать план
                  </Link>
                </div>
              </BlurFade>
            )
          ) : (
            <BlurFade inView delay={0.3}>
              <div className="rounded-3xl border border-[#006948]/20 bg-[#F8FFFB] p-12 text-center">
                <Calendar className="w-12 h-12 text-[#006948] mx-auto mb-4" />
                <p className="text-lg font-semibold text-[#006948] mb-2">Войдите для доступа к бронированиям</p>
                <p className="text-sm text-[#4A4A4A] mb-6">
                  Войдите в аккаунт, чтобы видеть доступные бронирования из ваших планов
                </p>
                <Link
                  href="/auth/signin"
                  className="inline-flex items-center justify-center rounded-full bg-[#006948] px-6 py-3 text-sm font-semibold tracking-[0.3em] text-white transition hover:-translate-y-0.5"
                >
                  Войти
                </Link>
              </div>
            </BlurFade>
          )}
        </div>
      </section>

      {/* Sayahat Recommends */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 bg-gradient-to-b from-white to-[#F8FFFB]">
        <div className="mx-auto max-w-6xl">
          <BlurFade inView>
            <div className="mb-12">
              <TextAnimate
                as="p"
                animation="slideUp"
                by="word"
                className="text-xs uppercase tracking-[0.3em] text-[#006948]"
              >
                рекомендации
              </TextAnimate>
              <TextAnimate
                as="h2"
                animation="slideUp"
                by="word"
                delay={0.2}
                className="mt-4 font-tapestry text-3xl sm:text-4xl lg:text-5xl tracking-[-0.08em] text-[#006948]"
              >
                Sayahat рекомендует
              </TextAnimate>
              <TextAnimate
                as="p"
                animation="slideUp"
                by="word"
                delay={0.4}
                className="mt-4 text-base sm:text-lg tracking-[-0.03em] text-[#4A4A4A] max-w-2xl"
              >
                Лучшие варианты для вашего путешествия по Казахстану. Проверенные партнеры и выгодные предложения.
              </TextAnimate>
            </div>
          </BlurFade>

          {/* Category Tabs */}
          <BlurFade inView delay={0.3}>
            <div className="mb-8 flex flex-wrap gap-3">
              {bookingCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold tracking-[0.2em] transition ${
                      selectedCategory === category.id
                        ? "bg-[#006948] text-white shadow-lg"
                        : "bg-white border border-[#006948]/20 text-[#006948] hover:border-[#006948]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{category.name}</span>
                  </button>
                );
              })}
            </div>
          </BlurFade>

          {/* Recommended Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendedItems[selectedCategory]?.map((item, index) => (
              <BlurFade key={item.id} inView delay={0.4 + index * 0.05}>
                <div className="rounded-3xl border border-[#006948]/20 bg-white p-6 shadow-[0_0_40px_rgba(0,105,72,0.08)] flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-semibold tracking-[-0.05em] text-[#006948] truncate">
                        {item.name}
                      </h3>
                      <p className="text-xs text-[#7A7A7A] mt-1">{item.category}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-semibold text-[#006948]">{item.rating}</span>
                    </div>
                  </div>
                  <p className="text-sm text-[#4A4A4A] mb-4 line-clamp-3 flex-1">{item.description}</p>
                  <div className="mb-4 flex items-center gap-2 text-xs text-[#7A7A7A]">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{item.location}</span>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-semibold text-[#006948]">{item.price}</span>
                  </div>
                  <button
                    onClick={() => handleBook(item)}
                    className="w-full rounded-full bg-[#006948] hover:bg-[#008A6A] px-6 py-3 text-white text-sm font-semibold tracking-[0.2em] transition hover:-translate-y-0.5 hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <span>Забронировать сейчас</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Ready Trips Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <BlurFade inView>
            <div className="mb-12">
              <TextAnimate
                as="p"
                animation="slideUp"
                by="word"
                className="text-xs uppercase tracking-[0.3em] text-[#006948]"
              >
                готовые трипы
              </TextAnimate>
              <TextAnimate
                as="h2"
                animation="slideUp"
                by="word"
                delay={0.2}
                className="mt-4 font-tapestry text-3xl sm:text-4xl lg:text-5xl tracking-[-0.08em] text-[#006948]"
              >
                Популярные маршруты по Казахстану
              </TextAnimate>
              <TextAnimate
                as="p"
                animation="slideUp"
                by="word"
                delay={0.4}
                className="mt-4 text-base sm:text-lg tracking-[-0.03em] text-[#4A4A4A] max-w-2xl"
              >
                Готовые маршруты по самым интересным городам. Откройте на карте и забронируйте все необходимое.
              </TextAnimate>
            </div>
          </BlurFade>

          {/* Поиск по маршрутам */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#7A7A7A]" />
              <input
                type="text"
                value={tripSearchQuery}
                onChange={(e) => setTripSearchQuery(e.target.value)}
                placeholder="Поиск по маршрутам, городам, описанию..."
                className="w-full pl-11 pr-4 py-3 rounded-full border border-[#006948]/20 bg-white text-[#0F2D1E] placeholder:text-[#93A39C] focus:outline-none focus:ring-2 focus:ring-[#006948] transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {readyTrips
              .filter((trip) => {
                if (!tripSearchQuery.trim()) return true;
                const query = tripSearchQuery.toLowerCase();
                return (
                  trip.title.toLowerCase().includes(query) ||
                  trip.city.toLowerCase().includes(query) ||
                  trip.description.toLowerCase().includes(query) ||
                  trip.locations.some((loc) => loc.name.toLowerCase().includes(query) || loc.type.toLowerCase().includes(query))
                );
              })
              .map((trip, index) => (
              <BlurFade key={trip.id} inView delay={0.3 + index * 0.05}>
                <div className="rounded-3xl border border-[#006948]/20 bg-white p-6 shadow-[0_0_40px_rgba(0,105,72,0.08)] flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-semibold tracking-[-0.05em] text-[#006948] truncate">
                        {trip.title}
                      </h3>
                      <p className="text-sm text-[#7A7A7A] mt-1 flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{trip.city}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-semibold text-[#006948]">{trip.rating}</span>
                    </div>
                  </div>
                  <p className="text-sm text-[#4A4A4A] mb-4 line-clamp-2 flex-1">{trip.description}</p>
                  <div className="mb-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-[#7A7A7A]">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{trip.duration}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#7A7A7A]">
                      <Route className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{trip.locations.length} локаций</span>
                    </div>
                  </div>
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {trip.locations.slice(0, 3).map((location, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 rounded-full bg-[#F8FFFB] border border-[#006948]/10 text-[#006948]"
                      >
                        {location.type}
                      </span>
                    ))}
                    {trip.locations.length > 3 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-[#F8FFFB] border border-[#006948]/10 text-[#006948]">
                        +{trip.locations.length - 3}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => handleUseTrip(trip)}
                      className="flex-1 rounded-full bg-[#006948] hover:bg-[#008A6A] px-4 py-2.5 text-white text-sm font-semibold tracking-[0.1em] transition hover:-translate-y-0.5 hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      <Route className="w-4 h-4" />
                      <span>Открыть маршрут</span>
                    </button>
                    <button
                      onClick={() => handleBook({ id: trip.id, name: trip.title, category: "Трип", description: trip.description, rating: trip.rating, price: "", location: trip.city })}
                      className="flex-shrink-0 rounded-full border-2 border-[#006948] hover:bg-[#006948] hover:text-white px-4 py-2.5 text-[#006948] text-sm font-semibold tracking-[0.1em] transition hover:-translate-y-0.5 flex items-center justify-center"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
