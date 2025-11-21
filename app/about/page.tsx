"use client";

import Image from "next/image";
import { BlurFade } from "@/components/ui/blur-fade";
import { TextAnimate } from "@/components/ui/text-animate";

const teamMembers = [
  {
    name: "Алимжан Жорабек",
    role: "Основатель & CEO",
    description: "Full-stack разработчик, UX/UI дизайнер",
    image: "/images/team1.jpg", // Замените на реальные пути к фотографиям
  },
  {
    name: "Сырым Молдахул",
    role: "Product Manager",
    description: "Отвечает за разработку и жизненный цикл продукта",
    image: "/images/team2.webp",
  },
  {
    name: "Алихан Аким",
    role: "QA-инженер",
    description: "Проверяет качество работы сервиса",
    image: "/images/team3.webp",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Team Section */}
      <section className="px-4 mt-[2rem] sm:px-6 lg:px-8 py-16 sm:py-24 bg-gradient-to-b from-white to-[#F8FFFB]">
        <div className="mx-auto max-w-6xl">
          <BlurFade inView>
            <div className="text-center mb-16">
              <TextAnimate
                as="p"
                animation="slideUp"
                by="word"
                className="text-xs uppercase tracking-[0.3em] text-[#006948]"
              >
                команда
              </TextAnimate>
              <TextAnimate
                as="h2"
                animation="slideUp"
                by="word"
                delay={0.2}
                className="mt-4 font-tapestry text-4xl sm:text-5xl lg:text-6xl tracking-[-0.08em] text-[#006948]"
              >
                Люди, стоящие за Sayahat
              </TextAnimate>
            </div>
          </BlurFade>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            {teamMembers.map((member, index) => (
              <BlurFade
                key={member.name}
                inView
                delay={0.3 + index * 0.1}
                className="flex flex-col items-center"
              >
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 mb-6">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#006948] to-[#00D592] opacity-20 blur-xl"></div>
                  <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-[#006948]/20 shadow-[0_20px_60px_rgba(0,105,72,0.15)]">
                    <Image
                      src={member.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&size=224&background=006948&color=fff&bold=true&font-size=0.5`}
                      alt={member.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </div>
                <TextAnimate
                  as="h3"
                  animation="slideUp"
                  by="word"
                  delay={0.4 + index * 0.1}
                  className="text-2xl sm:text-3xl font-semibold tracking-[-0.05em] text-[#006948] text-center"
                >
                  {member.name}
                </TextAnimate>
                <TextAnimate
                  as="p"
                  animation="slideUp"
                  by="word"
                  delay={0.5 + index * 0.1}
                  className="mt-2 text-sm uppercase tracking-[0.25em] text-[#00D592] font-semibold text-center"
                >
                  {member.role}
                </TextAnimate>
                <TextAnimate
                  as="p"
                  animation="slideUp"
                  by="word"
                  delay={0.6 + index * 0.1}
                  className="mt-4 text-base tracking-[-0.02em] text-[#4A4A4A] text-center max-w-xs"
                >
                  {member.description}
                </TextAnimate>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <BlurFade inView>
            <div className="text-center mb-16">
              <TextAnimate
                as="p"
                animation="slideUp"
                by="word"
                className="text-xs uppercase tracking-[0.3em] text-[#006948]"
              >
                наши ценности
              </TextAnimate>
              <TextAnimate
                as="h2"
                animation="slideUp"
                by="word"
                delay={0.2}
                className="mt-4 font-tapestry text-4xl sm:text-5xl lg:text-6xl tracking-[-0.08em] text-[#006948]"
              >
                Что движет нами
              </TextAnimate>
            </div>
          </BlurFade>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                title: "Инновации",
                description: "Мы постоянно ищем новые способы улучшить опыт путешествий, используя передовые технологии и креативные решения.",
              },
              {
                title: "Аутентичность",
                description: "Мы ценим подлинность и работаем напрямую с местными сообществами, чтобы сохранить уникальность каждого региона.",
              },
              {
                title: "Доступность",
                description: "Мы верим, что путешествия должны быть доступны каждому, независимо от бюджета или опыта.",
              },
            ].map((value, index) => (
              <BlurFade
                key={value.title}
                inView
                delay={0.3 + index * 0.1}
                className="rounded-3xl border border-[#006948]/10 bg-white p-6 sm:p-8 shadow-[0_0_40px_rgba(0,105,72,0.05)]"
              >
                <h3 className="text-2xl font-semibold tracking-[-0.07em] text-[#006948] mb-4">
                  {value.title}
                </h3>
                <p className="text-base tracking-[-0.03em] text-[#4A4A4A] leading-relaxed">
                  {value.description}
                </p>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24 bg-gradient-to-br from-[#006948] to-[#008A6A]">
        <div className="mx-auto max-w-4xl text-center">
          <BlurFade inView>
            <TextAnimate
              as="h2"
              animation="slideUp"
              by="word"
              className="font-tapestry text-4xl sm:text-5xl lg:text-6xl tracking-[-0.08em] text-white"
            >
              Присоединяйтесь к нашему путешествию
            </TextAnimate>
            <TextAnimate
              as="p"
              animation="slideUp"
              by="word"
              delay={0.2}
              className="mt-6 text-lg sm:text-xl tracking-[-0.03em] text-white/90 leading-relaxed"
            >
              У вас есть идеи, предложения или вы хотите стать частью команды? Мы всегда открыты для диалога.
            </TextAnimate>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:hello@sayahat.kz"
                className="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-sm font-semibold tracking-[0.3em] text-[#006948] transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                Связаться с нами
              </a>
              <a
                href="/#about"
                className="inline-flex items-center justify-center rounded-full border-2 border-white px-8 py-4 text-sm font-semibold tracking-[0.3em] text-white transition hover:bg-white/10"
              >
                Узнать больше
              </a>
            </div>
          </BlurFade>
        </div>
      </section>
    </main>
  );
}


