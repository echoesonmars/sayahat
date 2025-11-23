"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { BlurFade } from "@/components/ui/blur-fade";
import { TextAnimate } from "@/components/ui/text-animate";
import { useSession } from "next-auth/react";
import { AlertCircle, Phone, MapPin, Users, Shield, Copy, Check, Plus, Trash2, Navigation, Stethoscope, Loader2, X } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

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
  const [isLoadingCode, setIsLoadingCode] = useState(true);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isSendingSOS, setIsSendingSOS] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<{ contactId: string; contactName: string } | null>(null);
  const [showSOSModal, setShowSOSModal] = useState<{ contactId: string; contactName: string } | null>(null);
  const inputCodeRef = useRef<HTMLInputElement>(null);

  // Получаем уникальный код пользователя
  useEffect(() => {
    async function fetchSafetyCode() {
      if (!session) {
        setIsLoadingCode(false);
        return;
      }
      setIsLoadingCode(true);
      try {
        const response = await fetch("/api/safety/code");
        if (response.ok) {
          const data = await response.json();
          setSafetyCode(data.code);
        }
      } catch (error) {
        console.error("Failed to fetch safety code", error);
      } finally {
        setIsLoadingCode(false);
      }
    }
    fetchSafetyCode();
  }, [session]);

  // Получаем список контактов
  useEffect(() => {
    async function fetchContacts() {
      if (!session) {
        setIsLoadingContacts(false);
        return;
      }
      setIsLoadingContacts(true);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch("/api/safety/contacts", {
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          setContacts(data.contacts || []);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error("Failed to fetch contacts", error);
        }
      } finally {
        setIsLoadingContacts(false);
      }
    }
    fetchContacts();
    
    const interval = setInterval(fetchContacts, 10000);
    return () => clearInterval(interval);
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

  const copyCode = useCallback(() => {
    if (safetyCode) {
      navigator.clipboard.writeText(safetyCode);
      setCodeCopied(true);
      setToast({ message: 'Код скопирован!', type: 'success' });
      setTimeout(() => {
        setCodeCopied(false);
        setToast(null);
      }, 2000);
    }
  }, [safetyCode]);

  // Показываем toast уведомления
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Обработка Escape для закрытия модальных окон
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteModal) setShowDeleteModal(null);
        if (showSOSModal) setShowSOSModal(null);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showDeleteModal, showSOSModal]);

  const handleAddContact = useCallback(async () => {
    if (!inputCode.trim() || inputCode.length !== 6) {
      setToast({ message: "Введите 6-значный код", type: 'error' });
      inputCodeRef.current?.focus();
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
        setToast({ message: `Контакт ${data.targetUserName || "добавлен"} успешно добавлен!`, type: 'success' });
        // Обновляем список контактов
        const contactsResponse = await fetch("/api/safety/contacts");
        if (contactsResponse.ok) {
          const contactsData = await contactsResponse.json();
          setContacts(contactsData.contacts || []);
        }
        inputCodeRef.current?.focus();
      } else {
        setToast({ message: data.error || "Ошибка при добавлении контакта", type: 'error' });
      }
    } catch (error) {
      console.error("Failed to add contact", error);
      setToast({ message: "Ошибка при добавлении контакта", type: 'error' });
    } finally {
      setIsAddingContact(false);
    }
  }, [inputCode]);

  const handleDeleteContact = useCallback(async (contactId: string) => {
    if (!showDeleteModal || showDeleteModal.contactId !== contactId) {
      const contact = contacts.find(c => c._id === contactId);
      setShowDeleteModal({ contactId, contactName: contact?.otherUser?.name || 'контакт' });
      return;
    }

    try {
      const response = await fetch(`/api/safety/contacts?id=${contactId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setContacts((prev) => prev.filter((c) => c._id !== contactId));
        setToast({ message: "Контакт удален", type: 'success' });
        setShowDeleteModal(null);
      } else {
        setToast({ message: "Ошибка при удалении контакта", type: 'error' });
      }
    } catch (error) {
      console.error("Failed to delete contact", error);
      setToast({ message: "Ошибка при удалении контакта", type: 'error' });
    }
  }, [contacts, showDeleteModal]);

  const handleSOS = useCallback(async (contactId: string) => {
    if (!showSOSModal || showSOSModal.contactId !== contactId) {
      const contact = contacts.find(c => c._id === contactId);
      setShowSOSModal({ contactId, contactName: contact?.otherUser?.name || 'контакт' });
      return;
    }

    setIsSendingSOS(contactId);
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
        setToast({ message: "SOS сигнал отправлен", type: 'success' });
        setShowSOSModal(null);
      } else {
        setToast({ message: data.error || "Ошибка при отправке SOS", type: 'error' });
      }
    } catch (error) {
      console.error("Failed to send SOS", error);
      setToast({ message: "Ошибка при отправке SOS", type: 'error' });
    } finally {
      setIsSendingSOS(null);
    }
  }, [userLocation, contacts, showSOSModal]);

  const emergencyContacts = [
    { label: "Единый номер службы спасения", value: "112" },
    { label: "Туристская полиция (Астана/Алматы)", value: "+7 (7172) 71-60-60" },
    { label: "Call-центр Sayahat 24/7", value: "+7 (707) 000-45-45" },
  ];

  return (
    <main className="min-h-screen bg-white relative">
      {/* Toast Notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: "-50%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999] rounded-2xl border border-[#006948]/20 bg-white px-6 py-4 shadow-[0_20px_60px_rgba(0,105,72,0.2)] max-w-md"
          >
            <div className={`flex items-center gap-3 ${toast.type === 'success' ? 'text-[#006948]' : 'text-red-600'}`}>
              {toast.type === 'success' ? (
                <Check className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <p className="text-sm font-medium">{toast.message}</p>
              <button
                onClick={() => setToast(null)}
                className="ml-auto text-[#7A7A7A] hover:text-[#006948] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowDeleteModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-[#006948]/20 bg-white shadow-xl p-6"
            >
              <h3 className="text-xl font-semibold text-[#006948] mb-2">Удалить контакт?</h3>
              <p className="text-sm text-[#4A4A4A] mb-6">
                Удалить контакт <strong>{showDeleteModal.contactName}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(null)}
                  className="flex-1 rounded-full border border-[#006948]/20 px-4 py-2 text-sm font-semibold text-[#006948] transition hover:bg-[#F8FFFB]"
                >
                  Отмена
                </button>
                <button
                  onClick={() => handleDeleteContact(showDeleteModal.contactId)}
                  className="flex-1 rounded-full bg-red-600 hover:bg-red-700 px-4 py-2 text-sm font-semibold text-white transition"
                >
                  Удалить
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SOS Confirmation Modal */}
      <AnimatePresence>
        {showSOSModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowSOSModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-red-200 bg-white shadow-xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-[#006948]">Отправить SOS сигнал?</h3>
                  <p className="text-sm text-[#7A7A7A]">Контакт: {showSOSModal.contactName}</p>
                </div>
              </div>
              <p className="text-sm text-[#4A4A4A] mb-6">
                Контакт получит уведомление с вашим местоположением
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSOSModal(null)}
                  className="flex-1 rounded-full border border-[#006948]/20 px-4 py-2 text-sm font-semibold text-[#006948] transition hover:bg-[#F8FFFB]"
                >
                  Отмена
                </button>
                <button
                  onClick={() => handleSOS(showSOSModal.contactId)}
                  disabled={isSendingSOS === showSOSModal.contactId}
                  className="flex-1 rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-sm font-semibold text-white transition flex items-center justify-center gap-2"
                >
                  {isSendingSOS === showSOSModal.contactId ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Отправка...</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      <span>Отправить SOS</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
                Безопасность в каждой поездке
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
                    Первая помощь, ближайшие медучреждения и экстренные службы
                  </TextAnimate>
                  <div className="mt-6 flex flex-col sm:flex-row gap-4">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Link
                        href="/safety/ai-medic"
                        className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold tracking-[0.3em] text-[#006948] transition-all duration-200 hover:shadow-lg whitespace-nowrap"
                      >
                        Открыть ИИ-Медик
                      </Link>
                    </motion.div>
                    <motion.a
                      href="tel:112"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="inline-flex items-center justify-center rounded-full border-2 border-white px-6 py-3 text-sm font-semibold tracking-[0.3em] text-white transition-all duration-200 hover:bg-white/10 whitespace-nowrap"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Вызвать 112
                    </motion.a>
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
                Отправьте SOS контактам с вашим местоположением
              </TextAnimate>
            </div>
          </BlurFade>

          {session ? (
            <BlurFade inView delay={0.3}>
              {contacts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {contacts.map((contact, index) => (
                    <motion.div
                      key={contact._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ y: -4 }}
                      className="rounded-2xl sm:rounded-3xl border border-[#006948]/20 bg-white p-4 sm:p-5 shadow-[0_0_40px_rgba(0,105,72,0.08)] flex flex-col transition-all duration-300 hover:shadow-[0_0_60px_rgba(0,105,72,0.12)]"
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
                      <motion.button
                        onClick={() => handleSOS(contact._id)}
                        disabled={isSendingSOS === contact._id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="mt-auto w-full rounded-md bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 text-white text-sm font-semibold tracking-[0.1em] transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        {isSendingSOS === contact._id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                            <span>Отправка...</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>Отправить SOS</span>
                          </>
                        )}
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-3xl border border-[#006948]/20 bg-[#F8FFFB] p-8 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                  >
                    <Users className="w-12 h-12 text-[#006948] mx-auto mb-4" />
                  </motion.div>
                  <p className="text-lg font-semibold text-[#006948] mb-2">Нет контактов</p>
                  <p className="text-sm text-[#4A4A4A] mb-4">
                    Добавьте контакты ниже для отправки SOS
                  </p>
                </motion.div>
              )}
            </BlurFade>
          ) : (
            <BlurFade inView delay={0.3}>
              <div className="rounded-3xl border border-[#006948]/20 bg-[#F8FFFB] p-8 text-center">
                <Shield className="w-12 h-12 text-[#006948] mx-auto mb-4" />
                <p className="text-lg font-semibold text-[#006948] mb-2">Войдите для доступа</p>
                <p className="text-sm text-[#4A4A4A] mb-6">
                  Войдите, чтобы использовать SOS и делиться местоположением
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
                Делитесь местоположением с доверенными контактами
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
                    Поделитесь кодом с доверенными контактами
                  </p>
                  {isLoadingCode ? (
                    <div className="rounded-2xl bg-[#F8FFFB] border border-[#006948]/20 px-6 py-4 text-center mt-auto">
                      <Loader2 className="w-5 h-5 text-[#006948] mx-auto animate-spin" />
                      <p className="text-sm text-[#4A4A4A] mt-2">Загрузка кода...</p>
                    </div>
                  ) : safetyCode ? (
                    <div className="flex items-center gap-3 mt-auto">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex-1 rounded-2xl bg-[#F8FFFB] border border-[#006948]/20 px-6 py-4"
                      >
                        <p className="text-2xl font-mono font-bold tracking-wider text-[#006948] text-center">
                          {safetyCode}
                        </p>
                      </motion.div>
                    <motion.button
                      onClick={copyCode}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex-shrink-0 rounded-full bg-[#006948] hover:bg-[#008A6A] p-4 text-white transition-all duration-200"
                      aria-label="Копировать код"
                    >
                      {codeCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </motion.button>
                    </div>
                  ) : null}
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
                    Введите 6-значный код для добавления контакта
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
                    <motion.button
                      onClick={handleAddContact}
                      disabled={isAddingContact || !inputCode.trim()}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-shrink-0 rounded-full bg-[#006948] hover:bg-[#008A6A] disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 text-white font-semibold transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      {isAddingContact ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Добавление...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          <span>Добавить</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </BlurFade>
            </div>
          ) : (
            <BlurFade inView delay={0.3}>
              <div className="rounded-3xl border border-[#006948]/20 bg-[#F8FFFB] p-8 text-center">
                <Navigation className="w-12 h-12 text-[#006948] mx-auto mb-4" />
                <p className="text-lg font-semibold text-[#006948] mb-2">Войдите для доступа</p>
                <p className="text-sm text-[#4A4A4A] mb-6">
                  Войдите, чтобы добавить контакты и делиться местоположением
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
          {session && (
            <BlurFade inView delay={0.5}>
              <div className="mt-8 rounded-3xl border border-[#006948]/20 bg-white p-5 sm:p-6 shadow-[0_0_40px_rgba(0,105,72,0.08)]">
                <h3 className="text-lg font-semibold tracking-[-0.05em] text-[#006948] mb-4">Ваши контакты</h3>
                {isLoadingContacts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-[#006948] animate-spin" />
                    <p className="ml-3 text-sm text-[#4A4A4A]">Загрузка контактов...</p>
                  </div>
                ) : contacts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {contacts.map((contact, index) => (
                    <motion.div
                      key={contact._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      whileHover={{ scale: 1.02 }}
                      className="rounded-2xl border border-[#006948]/10 bg-[#F8FFFB] p-3 transition-all duration-200 hover:border-[#006948]/20 hover:shadow-sm"
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
                          <motion.button
                            onClick={() => handleDeleteContact(contact._id)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="flex-shrink-0 text-[#7A7A7A] hover:text-red-600 transition ml-2"
                            aria-label="Удалить контакт"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-[#006948]/30 mx-auto mb-4" />
                    <p className="text-sm text-[#4A4A4A]">Пока нет добавленных контактов</p>
                  </div>
                )}
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
                    Экстренные службы Казахстана
                  </TextAnimate>
                </div>
                <div className="rounded-[28px] border border-[#006948]/20 bg-white p-6">
                  <p className="text-xs uppercase tracking-[0.35em] text-[#006948] mb-6">горячая линия</p>
                  <div className="space-y-5">
                    {emergencyContacts.map((contact) => (
                      <div key={contact.label}>
                        <p className="text-sm text-[#7A7A7A] tracking-[-0.02em]">{contact.label}</p>
                        <motion.a
                          href={`tel:${contact.value.replace(/\s/g, "")}`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="text-2xl font-semibold tracking-[-0.04em] text-[#006948] hover:text-[#008A6A] transition-all duration-200 flex items-center gap-2"
                        >
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span>{contact.value}</span>
                        </motion.a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </BlurFade>
        </div>
      </section>
    </main>
  );
}
