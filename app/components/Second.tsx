"use client";

import { FlipWords } from "@/components/ui/flip-words";
import { TextAnimate } from "@/components/ui/text-animate";
import { BlurFade } from "@/components/ui/blur-fade";

const flipWords = ["маршруты", "AI-гид", "бронирования", "безопасность"];

const pillars = [
  {
    title: "Один маршрут-хаб",
    copy: "Планируйте путь по регионам, добавляйте остановки и делитесь ими с друзьями или гидами.",
    badge: "маршруты",
  },
  {
    title: "Проверенный маркетплейс",
    copy: "Выбирайте жильё, транспорт и экскурсии у верифицированных партнёров с прозрачной ценой.",
    badge: "сервисы",
  },
  {
    title: "Цифровой персонал",
    copy: "ИИ подсказывает сезон, климат и риски, чтобы путешествие было комфортным для всей компании.",
    badge: "AI",
  },
];

const metrics = [
  { value: "56", label: "регионов с контентом" },
  { value: "1200+", label: "маршрутов в базе" },
  { value: "24/7", label: "поддержка команды" },
];

const differentiators = [
  {
    title: "Синхронизированные данные",
    description: "Карты, события, погода и лимиты бронирований обновляются каждую неделю.",
  },
  {
    title: "Полевые инсайты",
    description: "Работаем с локальными гидами и тревел-креаторами, чтобы добавить «живые» подсказки.",
  },
  {
    title: "Сбор обратной связи",
    description: "После поездки пользователь видит аналитику и рекомендации на будущее.",
  },
];

export function Second() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-5xl text-center">
        <BlurFade inView>
          <p className="mx-auto inline-flex rounded-full bg-[#00D592] px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white">
            <TextAnimate animation="slideUp" by="word">
              что такое sayahat
            </TextAnimate>
          </p>
        </BlurFade>
        <BlurFade delay={0.1} inView>
          <h2 className="mt-6 font-tapestry text-5xl sm:text-6xl tracking-[-0.08em] text-[#0F2B1F]">
            <TextAnimate animation="slideUp" by="word">
              Путешествия, которые собираются сами
            </TextAnimate>
          </h2>
        </BlurFade>
        <BlurFade delay={0.2} inView>
          <p className="mt-6 text-lg tracking-[-0.03em] text-[#4A4A4A]">
            Sayahat объединяет <FlipWords words={flipWords} /> в одном пространстве. Мы закрываем главную боль туризма —
            раздробленные сервисы и устаревшие данные.
          </p>
        </BlurFade>
      </div>

      <div className="mx-auto mt-14 grid max-w-6xl gap-6 md:grid-cols-3">
        {pillars.map((pillar, index) => (
          <BlurFade
            key={pillar.title}
            inView
            delay={0.05 * index}
            className="rounded-[28px] border border-[#006948]/15 bg-white p-6 shadow-[0_25px_70px_rgba(0,0,0,0.07)]"
          >
            <span className="text-xs uppercase tracking-[0.4em] text-[#00D592]">{pillar.badge}</span>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.07em] text-[#111]">{pillar.title}</h3>
            <p className="mt-3 text-sm tracking-[-0.02em] text-[#5A5A5A]">{pillar.copy}</p>
          </BlurFade>
        ))}
      </div>

      <div className="mx-auto mt-14 flex max-w-6xl flex-col gap-6 lg:flex-row">
        <BlurFade inView className="flex-1 rounded-[32px] bg-gradient-to-br from-[#006948] via-[#008A6A] to-[#00D592] p-8 text-white">
          <p className="text-xs uppercase tracking-[0.35em] text-white/80">почему нас выбирают</p>
          <h3 className="mt-4 text-3xl font-semibold tracking-[-0.07em]">Каждый маршрут — как продуманный продукт</h3>
          <p className="mt-4 text-sm text-white/80">
            Мы собираем аналитику по регионам, поведению туристов и доступности сервисов, чтобы выдавать актуальные рекомендации.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-white/20 bg-white/10 p-4 text-center">
                <p className="text-3xl font-semibold">{metric.value}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/70">{metric.label}</p>
              </div>
            ))}
          </div>
        </BlurFade>
        <div className="flex-1 space-y-5">
          {differentiators.map((item, index) => (
            <BlurFade
              key={item.title}
              inView
              delay={0.05 * index}
              className="rounded-[28px] border border-[#006948]/15 bg-white p-6"
            >
              <p className="text-xs uppercase tracking-[0.35em] text-[#00D592]">фокус</p>
              <h4 className="mt-3 text-xl font-semibold tracking-[-0.06em] text-[#111]">{item.title}</h4>
              <p className="mt-2 text-sm tracking-[-0.02em] text-[#5A5A5A]">{item.description}</p>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}