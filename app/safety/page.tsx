"use client";

import { useState, useEffect } from "react";
import { BlurFade } from "@/components/ui/blur-fade";
import { TextAnimate } from "@/components/ui/text-animate";
import { useSession } from "next-auth/react";
import { AlertCircle, Phone, MapPin, Users, Shield, Copy, Check, Plus, Trash2, Navigation, Stethoscope } from "lucide-react";
import Link from "next/link";

export default function SafetyPage() {
  const { data: session } = useSession();
  const [safetyCode, setSafetyCode] = useState<string>("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [contacts, setContacts] = useState<Array<{
    _id: string;
    isOwner: boolean;
    otherUser: { id: string; name: string; email: string; code: string } | null;
    createdAt: string;
    lastLocation: { lat: number; lng: number; timestamp: string } | null;
  }>>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Получаем уникальный код пользователя
  useEffect(() => {
    async function fetchSafetyCode() {
      try {
        const response = await fetch("/api/safety/code");
        if (response.ok) {
          const data = await response.json();
          setSafetyCode(data.code);
        }
      } catch (error) {
        console.error("Failed to fetch safety code", error);
      }
    }
    if (session) {
      fetchSafetyCode();
    }
  }, [session]);

  // Получаем список контактов
  useEffect(() => {
    async function fetchContacts() {
      if (!session) {
        return;
      }
      try {
        const response = await fetch("/api/safety/contacts");
        if (response.ok) {
          const data = await response.json();
          setContacts(data.contacts || []);
        }
      } catch (error) {
        console.error("Failed to fetch contacts", error);
      }
    }
    fetchContacts();
  }, [session]);

  // Отслеживание местоположения
  useEffect(() => {
    if (!session) return;

    const updateLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ lat: latitude, lng: longitude });

            // Отправляем на сервер
            fetch("/api/safety/location", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lat: latitude, lng: longitude }),
            }).catch(console.error);
          },
          (error) => {
            console.error("Location error:", error);
          }
        );
      }
    };

    updateLocation();
    const interval = setInterval(updateLocation, 30000); // Обновляем каждые 30 секунд

    return () => clearInterval(interval);
  }, [session]);

  const copyCode = () => {
    if (safetyCode) {
      navigator.clipboard.writeText(safetyCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleAddContact = async () => {
    if (!inputCode.trim() || inputCode.length !== 6) {
      alert("Введите 6-значный код");
      return;
    }

    setIsAddingContact(true);
    try {
      const response = await fetch("/api/safety/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inputCode.toUpperCase().trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setInputCode("");
        alert(`Контакт ${data.targetUserName || "добавлен"} успешно добавлен!`);
        // Обновляем список контактов
        const contactsResponse = await fetch("/api/safety/contacts");
        if (contactsResponse.ok) {
          const contactsData = await contactsResponse.json();
          setContacts(contactsData.contacts || []);
        }
      } else {
        alert(data.error || "Ошибка при добавлении контакта");
      }
    } catch (error) {
      console.error("Failed to add contact", error);
      alert("Ошибка при добавлении контакта");
    } finally {
      setIsAddingContact(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm("Удалить этот контакт?")) return;

    try {
      const response = await fetch(`/api/safety/contacts?id=${contactId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setContacts((prev) => prev.filter((c) => c._id !== contactId));
      } else {
        alert("Ошибка при удалении контакта");
      }
    } catch (error) {
      console.error("Failed to delete contact", error);
      alert("Ошибка при удалении контакта");
    }
  };

  const handleSOS = async (contactId: string) => {
    if (!confirm("Отправить SOS сигнал выбранному контакту?")) return;

    try {
      const response = await fetch("/api/safety/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          lat: userLocation?.lat,
          lng: userLocation?.lng,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("SOS сигнал отправлен! Ваш контакт получит уведомление с вашим местоположением.");
      } else {
        alert(data.error || "Ошибка при отправке SOS");
      }
    } catch (error) {
      console.error("Failed to send SOS", error);
      alert("Ошибка при отправке SOS");
    }
  };

  const emergencyContacts = [
    { label: "Единый номер службы спасения", value: "112" },
    { label: "Туристская полиция (Астана/Алматы)", value: "+7 (7172) 71-60-60" },
    { label: "Call-центр Sayahat 24/7", value: "+7 (707) 000-45-45" },
  ];

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
                безопасность
              </TextAnimate>
              <TextAnimate
                as="h1"
                animation="slideUp"
                by="word"
                delay={0.2}
                className="mt-4 font-tapestry text-4xl sm:text-6xl lg:text-7xl tracking-[-0.08em] text-[#006948]"
              >
                Путешествуйте уверенно
              </TextAnimate>
              <TextAnimate
                as="p"
                animation="slideUp"
                by="word"
                delay={0.4}
                className="mt-6 text-lg sm:text-xl tracking-[-0.03em] text-[#4A4A4A] max-w-3xl mx-auto"
              >
                Платформа объединяет проверенные данные от МЧС, сервисов мониторинга дорог, авиакомпаний и местных гидов, чтобы каждая поездка по Казахстану оставалась комфортной.
              </TextAnimate>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* AI Medic Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="mx-auto max-w-6xl">
          <BlurFade inView>
            <div className="rounded-3xl bg-gradient-to-br from-[#006948] via-[#008A6A] to-[#00D592] p-8 sm:p-12 text-white shadow-[0_40px_90px_rgba(0,0,0,0.25)]">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur">
                    <Stethoscope className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <TextAnimate
                    as="h2"
                    animation="slideUp"
                    by="word"
                    className="font-tapestry text-3xl sm:text-4xl lg:text-5xl tracking-[-0.08em] text-white"
                  >
                    ИИ-Медик
                  </TextAnimate>
                  <TextAnimate
                    as="p"
                    animation="slideUp"
                    by="word"
                    delay={0.2}
                    className="mt-4 text-lg sm:text-xl tracking-[-0.03em] text-white/90 leading-relaxed"
                  >
                    В экстренных ситуациях наш ИИ-помощник предоставит пошаговые инструкции по оказанию первой помощи, подскажет ближайшие медицинские учреждения и поможет связаться с экстренными службами.
                  </TextAnimate>
                  <div className="mt-6 flex flex-col sm:flex-row gap-4">
                    <Link
                      href="/safety/ai-medic"
                      className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold tracking-[0.3em] text-[#006948] transition hover:-translate-y-0.5 hover:shadow-lg whitespace-nowrap"
                    >
                      Открыть ИИ-Медик
                    </Link>
                    <a
                      href="tel:112"
                      className="inline-flex items-center justify-center rounded-full border-2 border-white px-6 py-3 text-sm font-semibold tracking-[0.3em] text-white transition hover:bg-white/10 whitespace-nowrap"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Вызвать 112
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* SOS Button Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <BlurFade inView delay={0.2}>
            <div className="text-center mb-12">
              <TextAnimate
                as="p"
                animation="slideUp"
                by="word"
                className="text-xs uppercase tracking-[0.3em] text-[#006948]"
              >
                экстренная помощь
              </TextAnimate>
              <TextAnimate
                as="h2"
                animation="slideUp"
                by="word"
                delay={0.2}
                className="mt-4 font-tapestry text-3xl sm:text-4xl lg:text-5xl tracking-[-0.08em] text-[#006948]"
              >
                SOS Сигнал
              </TextAnimate>
              <TextAnimate
                as="p"
                animation="slideUp"
                by="word"
                delay={0.4}
                className="mt-4 text-base sm:text-lg tracking-[-0.03em] text-[#4A4A4A] max-w-2xl mx-auto"
              >
                Отправьте SOS сигнал вашим доверенным контактам. Они получат ваше точное местоположение и смогут быстро прийти на помощь.
              </TextAnimate>
            </div>
          </BlurFade>

          {session ? (
            <BlurFade inView delay={0.3}>
              {contacts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {contacts.map((contact) => (
                    <div
                      key={contact._id}
                      className="rounded-3xl border border-[#006948]/20 bg-white p-5 shadow-[0_0_40px_rgba(0,105,72,0.08)] flex flex-col"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold tracking-[-0.05em] text-[#006948] truncate">
                            {contact.otherUser?.name || "Неизвестный"}
                          </h3>
                          <p className="text-xs text-[#7A7A7A] mt-1">
                            {contact.isOwner ? "Отслеживает вас" : "Вы отслеживаете"}
                          </p>
                        </div>
                        {contact.isOwner && (
                          <button
                            onClick={() => handleDeleteContact(contact._id)}
                            className="flex-shrink-0 text-[#7A7A7A] hover:text-[#006948] transition ml-2"
                            aria-label="Удалить контакт"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {contact.lastLocation && (
                        <div className="mb-3 flex items-center gap-2 text-xs text-[#4A4A4A]">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">
                            Обновлено: {new Date(contact.lastLocation.timestamp).toLocaleString("ru")}
                          </span>
                        </div>
                      )}
                      <button
                        onClick={() => handleSOS(contact._id)}
                        className="mt-auto w-full rounded-md bg-red-600 hover:bg-red-700 px-4 py-2 text-white text-sm font-semibold tracking-[0.1em] transition hover:-translate-y-0.5 hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Отправить SOS</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-[#006948]/20 bg-[#F8FFFB] p-8 text-center">
                  <Users className="w-12 h-12 text-[#006948] mx-auto mb-4" />
                  <p className="text-lg font-semibold text-[#006948] mb-2">Нет доверенных контактов</p>
                  <p className="text-sm text-[#4A4A4A] mb-4">
                    Добавьте контакты ниже, чтобы иметь возможность отправлять SOS сигналы
                  </p>
                </div>
              )}
            </BlurFade>
          ) : (
            <BlurFade inView delay={0.3}>
              <div className="rounded-3xl border border-[#006948]/20 bg-[#F8FFFB] p-8 text-center">
                <Shield className="w-12 h-12 text-[#006948] mx-auto mb-4" />
                <p className="text-lg font-semibold text-[#006948] mb-2">Войдите для доступа к SOS</p>
                <p className="text-sm text-[#4A4A4A] mb-6">
                  Войдите в аккаунт, чтобы использовать функцию SOS и делиться местоположением
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

      {/* Location Sharing Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 bg-gradient-to-b from-white to-[#F8FFFB]">
        <div className="mx-auto max-w-6xl">
          <BlurFade inView>
            <div className="text-center mb-12">
              <TextAnimate
                as="p"
                animation="slideUp"
                by="word"
                className="text-xs uppercase tracking-[0.3em] text-[#006948]"
              >
                обмен местоположением
              </TextAnimate>
              <TextAnimate
                as="h2"
                animation="slideUp"
                by="word"
                delay={0.2}
                className="mt-4 font-tapestry text-3xl sm:text-4xl lg:text-5xl tracking-[-0.08em] text-[#006948]"
              >
                Делитесь локацией с близкими
              </TextAnimate>
              <TextAnimate
                as="p"
                animation="slideUp"
                by="word"
                delay={0.4}
                className="mt-4 text-base sm:text-lg tracking-[-0.03em] text-[#4A4A4A] max-w-2xl mx-auto"
              >
                Добавьте доверенные контакты, чтобы они могли видеть ваше местоположение в реальном времени. Это поможет им быстро найти вас в случае необходимости.
              </TextAnimate>
            </div>
          </BlurFade>

          {session ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Your Code */}
              <BlurFade inView delay={0.3}>
                <div className="rounded-3xl border border-[#006948]/20 bg-white p-6 sm:p-8 shadow-[0_0_40px_rgba(0,105,72,0.08)] h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-5 h-5 text-[#006948] flex-shrink-0" />
                    <h3 className="text-lg font-semibold tracking-[-0.05em] text-[#006948]">Ваш код безопасности</h3>
                  </div>
                  <p className="text-sm text-[#4A4A4A] mb-4">
                    Поделитесь этим кодом с теми, кому вы доверяете. Они смогут добавить вас в контакты и видеть ваше местоположение.
                  </p>
                  {safetyCode ? (
                    <div className="flex items-center gap-3 mt-auto">
                      <div className="flex-1 rounded-2xl bg-[#F8FFFB] border border-[#006948]/20 px-6 py-4">
                        <p className="text-2xl font-mono font-bold tracking-wider text-[#006948] text-center">
                          {safetyCode}
                        </p>
                      </div>
                      <button
                        onClick={copyCode}
                        className="flex-shrink-0 rounded-full bg-[#006948] hover:bg-[#008A6A] p-4 text-white transition"
                        aria-label="Копировать код"
                      >
                        {codeCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-[#F8FFFB] border border-[#006948]/20 px-6 py-4 text-center mt-auto">
                      <p className="text-sm text-[#4A4A4A]">Загрузка кода...</p>
                    </div>
                  )}
                </div>
              </BlurFade>

              {/* Add Contact */}
              <BlurFade inView delay={0.4}>
                <div className="rounded-3xl border border-[#006948]/20 bg-white p-6 sm:p-8 shadow-[0_0_40px_rgba(0,105,72,0.08)] h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="w-5 h-5 text-[#006948] flex-shrink-0" />
                    <h3 className="text-lg font-semibold tracking-[-0.05em] text-[#006948]">Добавить контакт</h3>
                  </div>
                  <p className="text-sm text-[#4A4A4A] mb-4">
                    Введите 6-значный код друга, чтобы видеть его местоположение и иметь возможность отправить ему SOS.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                    <input
                      type="text"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.toUpperCase().slice(0, 6))}
                      placeholder="ABC123"
                      maxLength={6}
                      className="flex-1 rounded-2xl border border-[#006948]/20 bg-[#F8FFFB] px-4 py-3 text-center font-mono text-lg tracking-wider text-[#006948] focus:outline-none focus:ring-2 focus:ring-[#006948]"
                    />
                    <button
                      onClick={handleAddContact}
                      disabled={isAddingContact || !inputCode.trim()}
                      className="flex-shrink-0 rounded-full bg-[#006948] hover:bg-[#008A6A] disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 text-white font-semibold transition hover:-translate-y-0.5 flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      {isAddingContact ? (
                        "Добавление..."
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Добавить
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </BlurFade>
            </div>
          ) : (
            <BlurFade inView delay={0.3}>
              <div className="rounded-3xl border border-[#006948]/20 bg-[#F8FFFB] p-8 text-center">
                <Navigation className="w-12 h-12 text-[#006948] mx-auto mb-4" />
                <p className="text-lg font-semibold text-[#006948] mb-2">Войдите для обмена локацией</p>
                <p className="text-sm text-[#4A4A4A] mb-6">
                  Войдите в аккаунт, чтобы добавить доверенные контакты и делиться местоположением
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

          {/* Contacts List */}
          {session && contacts.length > 0 && (
            <BlurFade inView delay={0.5}>
              <div className="mt-8 rounded-3xl border border-[#006948]/20 bg-white p-5 sm:p-6 shadow-[0_0_40px_rgba(0,105,72,0.08)]">
                <h3 className="text-lg font-semibold tracking-[-0.05em] text-[#006948] mb-4">Ваши контакты</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {contacts.map((contact) => (
                    <div
                      key={contact._id}
                      className="rounded-2xl border border-[#006948]/10 bg-[#F8FFFB] p-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-[#006948] truncate">
                            {contact.otherUser?.name || "Неизвестный"}
                          </p>
                          <p className="text-xs text-[#7A7A7A] mt-1">
                            {contact.isOwner ? "Может видеть ваше местоположение" : "Вы видите его местоположение"}
                          </p>
                          {contact.lastLocation && (
                            <p className="text-xs text-[#4A4A4A] mt-2 flex items-center gap-1">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">
                                Обновлено: {new Date(contact.lastLocation.timestamp).toLocaleString("ru")}
                              </span>
                            </p>
                          )}
                        </div>
                        {contact.isOwner && (
                          <button
                            onClick={() => handleDeleteContact(contact._id)}
                            className="flex-shrink-0 text-[#7A7A7A] hover:text-red-600 transition ml-2"
                            aria-label="Удалить контакт"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </BlurFade>
          )}
        </div>
      </section>

      {/* Emergency Contacts */}
      <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <BlurFade inView>
            <div className="rounded-3xl border border-[#006948]/10 bg-[#F8FFFB] p-6 sm:p-10">
              <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <TextAnimate
                    as="p"
                    animation="slideUp"
                    by="word"
                    className="text-xs uppercase tracking-[0.4em] text-[#00D592]"
                  >
                    экстренные контакты
                  </TextAnimate>
                  <TextAnimate
                    as="h3"
                    animation="slideUp"
                    by="word"
                    delay={0.2}
                    className="mt-4 text-3xl font-semibold tracking-[-0.07em] text-[#111]"
                  >
                    Всегда на связи
                  </TextAnimate>
                  <TextAnimate
                    as="p"
                    animation="slideUp"
                    by="word"
                    delay={0.4}
                    className="mt-4 text-base tracking-[-0.03em] text-[#4A4A4A]"
                  >
                    Сохраните эти номера в быстрый набор. В экстренной ситуации каждая секунда на счету.
                  </TextAnimate>
                </div>
                <div className="rounded-[28px] border border-[#006948]/20 bg-white p-6">
                  <p className="text-xs uppercase tracking-[0.35em] text-[#006948] mb-6">горячая линия</p>
                  <div className="space-y-5">
                    {emergencyContacts.map((contact) => (
                      <div key={contact.label}>
                        <p className="text-sm text-[#7A7A7A] tracking-[-0.02em]">{contact.label}</p>
                        <a
                          href={`tel:${contact.value.replace(/\s/g, "")}`}
                          className="text-2xl font-semibold tracking-[-0.04em] text-[#006948] hover:text-[#008A6A] transition flex items-center gap-2"
                        >
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span>{contact.value}</span>
                        </a>
                      </div>
                    ))}
                  </div>
                  <p className="mt-6 text-xs uppercase tracking-[0.3em] text-[#7A7A7A]">
                    Работает на русском, казахском и английском
                  </p>
                </div>
              </div>
            </div>
          </BlurFade>
        </div>
      </section>
    </main>
  );
}
