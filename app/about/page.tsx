export default function AboutPage() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-xs uppercase tracking-[0.4em] text-[#00D592]">раздел переехал</p>
      <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-[-0.08em] text-[#006948]">
        История Sayahat теперь на главной странице
      </h1>
      <p className="mt-3 text-base text-[#4A4A4A]">
        В нижней части лендинга размещены наши ценности, таймлайн и партнёрский блок.
      </p>
      <a
        href="/#about"
        className="mt-6 inline-flex items-center justify-center rounded-full bg-[#006948] px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:-translate-y-0.5"
      >
        Перейти к блоку «О нас»
      </a>
    </main>
  );
}


