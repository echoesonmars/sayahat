export default function BookingPage() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-xs uppercase tracking-[0.4em] text-[#00D592]">раздел переехал</p>
      <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-[-0.08em] text-[#006948]">
        Все о бронированиях вынесено на лендинг
      </h1>
      <p className="mt-3 text-base text-[#4A4A4A]">
        Пролистайте главную страницу до блока «Бронирования», чтобы узнать про тарифы, процесс и способы оплаты.
      </p>
      <a
        href="/#booking"
        className="mt-6 inline-flex items-center justify-center rounded-full bg-[#006948] px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:-translate-y-0.5"
      >
        Перейти к бронированиям
      </a>
    </main>
  );
}


