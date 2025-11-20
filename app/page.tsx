import { HeroSec } from "./components/HeroSection";
import { Second } from "./components/Second";
import KazakhstanMap from "./components/KazakhstanMap";
import { BlurFade } from "@/components/ui/blur-fade";
import { TextAnimate } from "@/components/ui/text-animate";

const guideHighlights = [
  {
    title: "Живые рекомендации",
    description:
      "ИИ анализирует сезон, бюджет и интересы, чтобы предложить города, гастрономию и мероприятия, которые вы точно не пропустите.",
    tag: "персонально",
  },
  {
    title: "Маршрут за секунды",
    description:
      "Соберите оптимальный маршрут по регионам Казахстана, учитывая время в пути, климат и события, которые проходят поблизости.",
    tag: "умный маршрут",
  },
  {
    title: "Локальный контекст",
    description:
      "Получайте важные советы от местных жителей: от правил поведения у святынь до подсказок по национальной кухне.",
    tag: "местные инсайды",
  },
  {
    title: "Встроенный перевод",
    description:
      "Общайтесь с провайдерами услуг на казахском и русском напрямую в чате — ИИ переведёт и сохранит историю переписок.",
    tag: "двухъязычность",
  },
];

const workflow = [
  {
    step: "1. Опишите интересы",
    detail: "Любите пустыни, эко-туры или городские фестивали? Скажите ИИ-гиду, и он настроит выдачу.",
  },
  {
    step: "2. Получите черновик",
    detail: "Вы увидите набор блоков: транспорт, отели, активности и места для фото на каждый день.",
  },
  {
    step: "3. Отредактируйте",
    detail: "Перетаскивайте дни, меняйте длительность, добавляйте друзей и отслеживайте бюджет в реальном времени.",
  },
];

const corridors = [
  {
    title: "Золотой маршрут",
    description:
      "Астана → Бурабай → Кокшетау. Лучший выбор для первых путешествий: быстрый транспорт и развитая инфраструктура.",
    badges: ["3 дня", "семейно"],
  },
  {
    title: "Южный драйв",
    description:
      "Шымкент → Туркестан → Сарыагаш. Комбинируйте древние города и термальные курорты в одном отпуске.",
    badges: ["5 дней", "история"],
  },
  {
    title: "Алтайские вершины",
    description:
      "Усть-Каменогорск → Риддер → Катон-Карагай. Трекинги, маралы и панорамы для любителей природы.",
    badges: ["7 дней", "outdoor"],
  },
];

const stats = [
  { value: "56 регионов", label: "доступно в путеводителе" },
  { value: "1200+", label: "поездок построено в 2024" },
  { value: "4.9 ★", label: "оценка пользователей" },
];

const safetyLayers = [
  {
    title: "Онлайн-мониторинг",
    description:
      "Мы отслеживаем погодные окна, дорожные ограничения и сообщения МЧС, чтобы предупредить о рисках заранее.",
    icon: "🛰️",
  },
  {
    title: "Проверенные партнёры",
    description:
      "Гиды и трансферы проходят верификацию документов и страхования, а рейтинг обновляется после каждой поездки.",
    icon: "🛡️",
  },
  {
    title: "SOS-сценарии",
    description:
      "Поделитесь маршрутом с близкими, включите трекинг, и система подскажет, как действовать при потере связи.",
    icon: "📍",
  },
];

const emergencyChecklist = [
  "Скачайте офлайн-карту региона и маршрут от Sayahat.",
  "Добавьте контакты экстренных служб в заметку и закрепите на экране.",
  "Проверьте страховку и условия покрытия активностей.",
  "Сообщите координаты и ETA человеку, который останется в городе.",
];

const contacts = [
  { label: "Единый номер службы спасения", value: "112" },
  { label: "Туристская полиция (Астана/Алматы)", value: "+7 (7172) 71-60-60" },
  { label: "Call-центр Sayahat 24/7", value: "+7 (707) 000-45-45" },
];

const bookingPerks = [
  {
    title: "Одна корзина для всего",
    description:
      "Отели, гестхаусы, транспорт, экскурсии и события — оплачивайте одной транзакцией, а система распределит платежи между поставщиками.",
  },
  {
    title: "Прозрачные цены",
    description:
      "Мы показываем комиссии, налоги и валюту оплаты до подтверждения. Конвертация выполняется по курсу Kaspi на момент оплаты.",
  },
  {
    title: "Гибкие отмены",
    description:
      "Выбирайте тарифы с частичным или полным возвратом. Напоминания о дедлайнах приходят в SMS и мессенджеры.",
  },
];

const steps = [
  {
    title: "Подбор",
    detail: "Уточните даты,人数 и предпочтения — алгоритм покажет доступные партнёрские варианты.",
  },
  {
    title: "Подтверждение",
    detail: "Sayahat проверяет наличие и блокирует квоту. Вам остаётся подтвердить оплату по ссылке.",
  },
  {
    title: "Документы",
    detail: "Мы отправим ваучеры, билеты и краткую памятку по каждому сервису на почту и в Telegram.",
  },
];

const values = [
  {
    title: "Продуктовая смелость",
    description:
      "Мы пробуем новые форматы путешествий и объединяем сервисы, которые раньше жили по отдельности.",
  },
  {
    title: "Локальная экспертиза",
    description:
      "Работаем напрямую с гидами, ремесленниками и региональными акиматами, чтобы маршруты были живыми.",
  },
  {
    title: "Забота о людях",
    description:
      "Доступная информация на трёх языках, честные цены и поддержка 24/7 — базовые принципы Sayahat.",
  },
];

const milestones = [
  { year: "2025", text: "Запустили AI-гид, карту и единый кабинет бронирований" },
];

export default function Home() {
  return (
    <main className="space-y-28">
      <div id="hero">
        <HeroSec />
      </div>

      <div id="features">
        <Second />
      </div>

      <section id="ai-guide" className="px-4 sm:px-6 lg:px-8">
        <BlurFade inView>
          <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-br from-[#E6FFF4] via-white to-white p-8 sm:p-12 shadow-[0_0_60px_rgba(0,105,72,0.08)]">
            <TextAnimate
              as="p"
              animation="slideUp"
              by="word"
              className="text-xs uppercase tracking-[0.3em] text-[#006948]"
            >
              ai-помощник
            </TextAnimate>
            <TextAnimate
              as="h2"
              animation="slideUp"
              by="word"
              delay={0.2}
              className="mt-4 font-tapestry text-4xl sm:text-6xl tracking-[-0.08em] text-[#006948]"
            >
              ИИ-Гид для путешествий по Казахстану
            </TextAnimate>
            <TextAnimate
              as="p"
              animation="slideUp"
              by="word"
              delay={0.4}
              className="mt-5 text-lg sm:text-xl tracking-[-0.03em] text-[#3E3E3E]"
            >
              Ваш личный эксперт, который отвечает на вопросы, собирает поездки по регионам и делится подсказками о культуре,
              безопасности и транспорте.
            </TextAnimate>
            <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                {
                  eyebrow: "всегда на связи",
                  copy: "Ответ в течение 3 секунд в чате, голосом или в Telegram-боте.",
                },
                {
                  eyebrow: "безопасная база",
                  copy: "Мы обучаем модель на данных локальных гидов и партнеров, обновляя советы каждую неделю.",
                },
              ].map((item) => (
                <BlurFade
                  inView
                  key={item.eyebrow}
                  className="rounded-2xl border border-[#006948]/10 bg-white p-5"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#00D592]">{item.eyebrow}</p>
                  <p className="mt-3 text-lg font-semibold tracking-[-0.06em] text-[#111]">{item.copy}</p>
                </BlurFade>
              ))}
            </div>
          </div>
        </BlurFade>

        <div className="mx-auto mt-12 max-w-6xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-[#00D592]">что внутри</p>
              <h3 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-[-0.07em] text-[#111]">
                Возможности ИИ-гидов
              </h3>
            </div>
            <a
              className="inline-flex items-center justify-center rounded-full border border-[#006948] px-6 py-3 text-sm font-semibold tracking-[-0.04em] text-[#006948] transition hover:bg-[#006948] hover:text-white"
              href="/booking"
            >
              Забронировать консультацию
            </a>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {guideHighlights.map((item, index) => (
              <BlurFade
                inView
                delay={index * 0.05}
                key={item.title}
                className="flex h-full flex-col rounded-3xl border border-[#006948]/10 bg-white/70 p-6 backdrop-blur"
              >
                <span className="text-xs uppercase tracking-[0.3em] text-[#00D592]">{item.tag}</span>
                <h4 className="mt-4 text-2xl font-semibold tracking-[-0.07em] text-[#111]">{item.title}</h4>
                <p className="mt-3 flex-1 text-base tracking-[-0.03em] text-[#4A4A4A]">{item.description}</p>
                <span className="mt-4 text-sm font-semibold text-[#006948]">Доступно 24/7</span>
              </BlurFade>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-5xl rounded-[32px] border border-[#006948]/10 bg-[#F8FFFB] p-6 sm:p-12">
          <p className="text-sm uppercase tracking-[0.35em] text-[#006948]">как это работает</p>
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
            {workflow.map((step, index) => (
              <BlurFade
                inView
                delay={index * 0.04}
                key={step.step}
                className="rounded-2xl bg-white p-6 shadow-[0_15px_40px_rgba(0,0,0,0.05)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[#00D592]">{step.step}</p>
                <p className="mt-4 text-base tracking-[-0.04em] text-[#383838]">{step.detail}</p>
              </BlurFade>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#4F4F4F] tracking-[-0.02em]">
              ИИ фиксирует ваши предпочтения, чтобы следующая поездка подстраивалась автоматически.
            </p>
            <a
              href="/ai-guide?demo=true"
              className="inline-flex items-center justify-center rounded-full bg-[#006948] px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            >
              Запросить демо
            </a>
          </div>
        </div>
      </section>

      <section id="map" className="px-4 sm:px-6 lg:px-10">
        <BlurFade inView>
          <div className="mx-auto max-w-6xl rounded-[40px] bg-gradient-to-br from-[#006948] via-[#008A6A] to-[#00D592] p-8 text-white shadow-[0_40px_90px_rgba(0,0,0,0.25)]">
            <h1 className="text-xs uppercase tracking-[0.4em] text-white/80">интерактивная карта</h1>
            <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <TextAnimate
                  as="h3"
                  animation="slideUp"
                  by="word"
                  className="font-tapestry text-5xl sm:text-6xl tracking-[-0.08em]"
                >
                  Карта Казахстана
                </TextAnimate>
                <p className="mt-5 text-lg tracking-[-0.03em] text-white/80">
                  Изучайте регионы, события и инфраструктуру в одном полотне. Наводите на область, чтобы увидеть гидов, топ-локации и полезные ссылки.
                </p>
              </div>
              <a
                href="/ai-guide"
                className="inline-flex items-center justify-center rounded-full bg-white/10 px-6 py-3 text-sm font-semibold tracking-[0.2em] text-white transition hover:bg-white hover:text-[#006948]"
              >
                Использовать с AI-гидом
              </a>
            </div>
          </div>
        </BlurFade>

        <div className="mx-auto mt-12 max-w-6xl overflow-hidden rounded-[32px] border border-[#006948]/10 bg-white p-4 sm:p-8">
          <div className="rounded-3xl border border-dashed border-[#006948]/20 bg-[#F6FFFB] p-4 sm:p-6">
            <KazakhstanMap />
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-6xl flex flex-col gap-10 lg:flex-row">
          <div className="flex-1 rounded-[28px] border border-[#006948]/10 bg-white p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.4em] text-[#00D592]">популярные коридоры</p>
            <h3 className="mt-4 text-3xl font-semibold tracking-[-0.07em] text-[#111]">
              Маршруты, собранные нашим комьюнити
            </h3>
            <div className="mt-8 space-y-6">
              {corridors.map((route, index) => (
                <BlurFade
                  inView
                  delay={index * 0.05}
                  key={route.title}
                  className="rounded-2xl border border-[#006948]/10 p-5 transition hover:-translate-y-1 hover:bg-[#F8FFFB]"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {route.badges.map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full bg-[#E8FFF6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#006948]"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                  <h4 className="mt-4 text-2xl font-semibold tracking-[-0.07em] text-[#111]">{route.title}</h4>
                  <p className="mt-2 text-base tracking-[-0.03em] text-[#4F4F4F]">{route.description}</p>
                </BlurFade>
              ))}
            </div>
          </div>
          <div className="w-full max-w-lg rounded-[28px] border border-[#006948]/10 bg-gradient-to-b from-white to-[#F3FFF9] p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.4em] text-[#00D592]">цифры сервиса</p>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {stats.map((item) => (
                <BlurFade inView key={item.value} className="rounded-2xl border border-[#006948]/10 bg-white p-5 text-center">
                  <p className="text-2xl font-semibold tracking-[-0.05em] text-[#006948]">{item.value}</p>
                  <p className="mt-2 text-sm tracking-[-0.02em] text-[#5A5A5A]">{item.label}</p>
                </BlurFade>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-[#006948]/20 bg-white/80 p-6 backdrop-blur">
              <p className="text-sm uppercase tracking-[0.35em] text-[#006948]">планы 2025</p>
              <ul className="mt-4 list-disc space-y-3 pl-5 text-sm tracking-[-0.02em] text-[#3E3E3E]">
                <li>Оффлайн доступ к карте через мобильное приложение.</li>
                <li>3D-режим для городов Алматы, Астана, Шымкент.</li>
                <li>Интеграция с навигаторами и маршрутными картами.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="safety" className="px-4 sm:px-6 lg:px-10">
        <BlurFade inView>
          <div className="mx-auto max-w-6xl rounded-[36px] border border-[#006948]/15 bg-white px-6 py-12 sm:px-10 shadow-[0_40px_80px_rgba(0,0,0,0.08)]">
            <p className="text-xs uppercase tracking-[0.4em] text-[#00D592]">безопасность</p>
            <div className="mt-6 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
              <div>
                <h3 className="font-tapestry text-5xl sm:text-6xl tracking-[-0.08em] text-[#006948]">Путешествуйте уверенно</h3>
                <p className="mt-4 text-lg tracking-[-0.03em] text-[#4A4A4A]">
                  Платформа объединяет проверенные данные от МЧС, сервисов мониторинга дорог, авиакомпаний и местных гидов, чтобы каждая поездка по Казахстану оставалась комфортной.
                </p>
              </div>
              <div className="rounded-3xl bg-[#006948] p-6 text-white">
                <p className="text-sm uppercase tracking-[0.35em] text-white/70">режим тревоги</p>
                <p className="mt-4 text-2xl font-semibold tracking-[-0.05em]">
                  Включите уведомления, и мы отправим push и SMS, если в регионе появятся ограничения.
                </p>
                <a
                  href="/booking"
                  className="mt-6 inline-flex items-center justify-center rounded-full bg-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-[#006948]"
                >
                  Настроить оповещения
                </a>
              </div>
            </div>
          </div>
        </BlurFade>

        <div className="mx-auto mt-12 max-w-6xl grid gap-6 lg:grid-cols-3">
          {safetyLayers.map((layer, index) => (
            <BlurFade
              inView
              delay={index * 0.05}
              key={layer.title}
              className="rounded-[28px] border border-[#006948]/15 bg-white/80 p-6 backdrop-blur"
            >
              <div className="text-4xl">{layer.icon}</div>
              <h4 className="mt-4 text-2xl font-semibold tracking-[-0.07em] text-[#111]">{layer.title}</h4>
              <p className="mt-2 text-sm tracking-[-0.03em] text-[#4F4F4F]">{layer.description}</p>
            </BlurFade>
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-6xl rounded-[32px] border border-[#006948]/10 bg-[#F8FFFB] p-6 sm:p-10">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-[#00D592]">чек-лист перед стартом</p>
              <h4 className="mt-4 text-3xl font-semibold tracking-[-0.07em] text-[#111]">Подготовьтесь за 5 минут</h4>
              <ul className="mt-6 space-y-4 text-base tracking-[-0.03em] text-[#4A4A4A]">
                {emergencyChecklist.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-[#006948]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[28px] border border-[#006948]/20 bg-white p-6">
              <p className="text-xs uppercase tracking-[0.35em] text-[#006948]">горячая линия</p>
              <div className="mt-6 space-y-5">
                {contacts.map((contact) => (
                  <div key={contact.label}>
                    <p className="text-sm text-[#7A7A7A] tracking-[-0.02em]">{contact.label}</p>
                    <p className="text-2xl font-semibold tracking-[-0.04em] text-[#111]">{contact.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-xs uppercase tracking-[0.3em] text-[#7A7A7A]">
                Работает на русском, казахском и английском
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="booking" className="px-4 sm:px-6 lg:px-10">
        <BlurFade inView>
          <div className="mx-auto max-w-6xl rounded-[36px] bg-gradient-to-br from-white via-[#F9FFFB] to-[#E7FFF4] p-8 shadow-[0_40px_80px_rgba(0,0,0,0.08)]">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs uppercase tracking-[0.35em] text-[#00D592]">бронирования</p>
                <h3 className="mt-4 font-tapestry text-5xl sm:text-6xl tracking-[-0.08em] text-[#006948]">
                  Управляйте поездками как продуктом
                </h3>
                <p className="mt-6 text-lg tracking-[-0.03em] text-[#4A4A4A]">
                  Sayahat аккумулирует лучших локальных партнёров, объединяет в одну оплату и помогает удерживать бюджет.
                </p>
              </div>
              <a
                href="/booking?start"
                className="inline-flex items-center justify-center rounded-full bg-[#006948] px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:-translate-y-0.5"
              >
                Оставить заявку
              </a>
            </div>
          </div>
        </BlurFade>

        <div className="mx-auto mt-12 max-w-6xl grid gap-6 lg:grid-cols-3">
          {bookingPerks.map((perk, index) => (
            <BlurFade
              inView
              delay={index * 0.05}
              key={perk.title}
              className="rounded-[28px] border border-[#006948]/10 bg-white p-6 shadow-sm"
            >
              <h4 className="text-2xl font-semibold tracking-[-0.07em] text-[#111]">{perk.title}</h4>
              <p className="mt-3 text-base tracking-[-0.03em] text-[#4F4F4F]">{perk.description}</p>
            </BlurFade>
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-6xl rounded-[32px] border border-[#006948]/10 bg-white p-6 sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-[#00D592]">процесс</p>
              <h4 className="mt-3 text-3xl font-semibold tracking-[-0.07em] text-[#111]">3 шага до подтверждения</h4>
            </div>
            <div className="flex flex-wrap justify-start gap-4">
              {["kaspi pay", "halyk", "apple pay"].map((option) => (
                <span
                  key={option}
                  className="rounded-full border border-[#006948]/30 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#006948]"
                >
                  {option}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <BlurFade
                inView
                delay={index * 0.05}
                key={step.title}
                className="rounded-2xl border border-[#006948]/15 bg-[#F8FFFB] p-6"
              >
                <p className="text-xs uppercase tracking-[0.4em] text-[#00D592]">шаг {index + 1}</p>
                <h5 className="mt-3 text-xl font-semibold tracking-[-0.06em] text-[#111]">{step.title}</h5>
                <p className="mt-2 text-sm tracking-[-0.03em] text-[#4F4F4F]">{step.detail}</p>
              </BlurFade>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-4 rounded-[24px] border border-dashed border-[#006948]/30 bg-white/60 p-6 text-sm tracking-[-0.02em] text-[#4A4A4A] sm:flex-row sm:items-center sm:justify-between">
            <p>После оплаты мы фиксируем бронь в CRM и отправляем статус в ваш личный кабинет.</p>
            <a href="/ai-guide" className="text-[#006948] underline-offset-4 hover:underline">
              Связать с планом поездки
            </a>
          </div>
        </div>
      </section>

      <section id="about" className="px-4 sm:px-6 lg:px-10">
        <BlurFade inView>
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-[#00D592]">о нас</p>
            <h3 className="mt-5 font-tapestry text-5xl sm:text-6xl tracking-[-0.08em] text-[#006948]">
              Мы строим суперсервис путешествий по Казахстану
            </h3>
            <p className="mt-6 text-lg tracking-[-0.03em] text-[#4A4A4A]">
              Sayahat соединяет цифровые продукты с локальными историями, помогая путешественникам чувствовать себя как дома, где бы они ни оказались.
            </p>
          </div>
        </BlurFade>

        <div className="mx-auto mt-12 max-w-6xl grid gap-6 lg:grid-cols-3">
          {values.map((value, index) => (
            <BlurFade
              inView
              delay={index * 0.05}
              key={value.title}
              className="rounded-[28px] border border-[#006948]/10 bg-white p-6 shadow-sm"
            >
              <p className="text-xs uppercase tracking-[0.4em] text-[#00D592]">ценность</p>
              <h4 className="mt-4 text-2xl font-semibold tracking-[-0.07em] text-[#111]">{value.title}</h4>
              <p className="mt-3 text-sm tracking-[-0.03em] text-[#4F4F4F]">{value.description}</p>
            </BlurFade>
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-5xl rounded-[32px] border border-[#006948]/10 bg-[#F8FFFB] p-8">
          <p className="text-xs uppercase tracking-[0.35em] text-[#00D592]">хронология</p>
          <div className="mt-6 space-y-6">
            {milestones.map((milestone, index) => (
              <BlurFade
                inView
                delay={index * 0.05}
                key={milestone.year}
                className="flex flex-col gap-3 rounded-[24px] border border-[#006948]/15 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-3xl font-semibold tracking-[-0.05em] text-[#006948]">{milestone.year}</span>
                <p className="text-sm tracking-[-0.03em] text-[#4A4A4A]">{milestone.text}</p>
              </BlurFade>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-12 mb-12 max-w-5xl rounded-[32px] bg-[#006948] p-8 text-white">
          <h4 className="text-3xl font-semibold tracking-[-0.07em]">Хотите стать партнёром?</h4>
          <p className="mt-3 text-base tracking-[-0.02em] text-white/80">
            Мы ищем гидов, тревел-дизайнеров, отельеров и представителей локальных сообществ. Расскажите о себе — и мы подключим вас к платформе.
          </p>
          <div className="mt-6 flex flex-col gap-4 sm:flex-row">
            <a
              href="mailto:hello@sayahat.kz"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold tracking-[0.3em] text-[#006948] transition hover:-translate-y-0.5"
            >
              Написать нам
            </a>
            <a
              href="/booking"
              className="inline-flex items-center justify-center rounded-full border border-white px-6 py-3 text-sm font-semibold tracking-[0.3em] text-white transition hover:bg-white/10"
            >
              Стать партнёром
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
