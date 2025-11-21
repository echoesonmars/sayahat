"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { SendHorizonal, Phone, ArrowLeft, Image, XCircle } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence, Variants } from "framer-motion";

interface Message {
  id: string;
  author: "user" | "ai";
  text: string;
  timestamp: string;
  image?: string; // base64 изображение
}

const medicalPrompts = [
  "первая помощь при травме",
  "ближайшая больница",
  "симптомы и диагностика",
  "аптечка путешественника",
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

// Функция для конвертации файла в base64
function convertImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to convert image to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AIMedicPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPrompts, setShowPrompts] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Получаем местоположение пользователя
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Location error:", error);
        }
      );
    }
  }, []);

  // Прокрутка к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generateId = () => {
    return Math.random().toString(36).substring(2, 9);
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

  function handlePromptClick(prompt: string) {
    handleSend(undefined, prompt);
  }

  const handleSend = async (e?: React.FormEvent<HTMLFormElement>, customPrompt?: string) => {
    e?.preventDefault();
    const prompt = customPrompt || inputValue.trim();
    if ((!prompt && !selectedImage) || isGenerating) return;

    const userMessage: Message = {
      id: generateId(),
      author: "user",
      text: prompt || (selectedImage ? 'Проанализируй это изображение' : ''),
      timestamp: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      image: selectedImage || undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setSelectedImage(null); // Очищаем изображение после отправки
    setShowPrompts(false);
    setIsGenerating(true);

    try {
      // Создаем специальный промпт для медицинского контекста
      const medicalSystemPrompt = `Ты - ИИ-Медик, специализированный помощник по оказанию первой помощи и медицинской поддержке в экстренных ситуациях. 

ВАЖНО: Ты НЕ заменяешь врача. Всегда напоминай пользователю обратиться к врачу в серьезных случаях.

Твоя задача:
1. Предоставлять четкие инструкции по оказанию первой помощи
2. Помогать определить серьезность ситуации
3. Подсказывать, когда нужно срочно вызывать скорую помощь (112)
4. Давать информацию о ближайших медицинских учреждениях (если доступны координаты)
5. Объяснять симптомы и возможные причины
6. Рекомендовать состав аптечки путешественника
7. Анализировать изображения (укусы, раны, сыпь, ожоги, животные, насекомые, змеи и т.д.) и давать рекомендации по первой помощи
8. При анализе изображений животных/насекомых/змей - описывать визуальные признаки и предлагать возможные варианты идентификации, но честно указывать, что для точной идентификации нужен интернет-поиск или специалист

${userLocation ? `Пользователь находится в Казахстане, координаты: ${userLocation.lat}, ${userLocation.lng}` : "Пользователь находится в Казахстане"}

Отвечай подробно и детально при анализе изображений. В критических ситуациях сразу предлагай вызвать 112.`;

      const enhancedPrompt = selectedImage 
        ? `${medicalSystemPrompt}\n\nПользователь прикрепил изображение. Проанализируй его ДЕТАЛЬНО и определи:
1. Что это может быть (укус, рана, ожог, сыпь, травма, животное, насекомое, змея и т.д.)
2. Если это животное, насекомое или змея:
   - Опиши внешние признаки (размер, цвет, форма, узоры, количество ног, наличие крыльев и т.д.)
   - На основе визуальных признаков предложи ВОЗМОЖНЫЕ варианты (например: "похоже на степную гадюку" или "может быть паук-крестовик")
   - Укажи, что для ТОЧНОЙ идентификации нужно использовать интернет-поиск по описанию или обратиться к специалисту
   - Дай рекомендации по первой помощи в зависимости от типа животного
3. Если это укус или рана:
   - Определи тип укуса (змеиный, паучий, насекомого, животного)
   - Оцени серьезность (ядовитый/неядовитый, глубина раны, признаки аллергии)
   - Дай пошаговые инструкции по первой помощи
   - Укажи, когда НЕМЕДЛЕННО вызывать 112
4. Серьезность ситуации (требуется ли срочная медицинская помощь)
5. Первую помощь, которую можно оказать СЕЙЧАС
6. Когда нужно срочно обратиться к врачу или вызвать 112

ВАЖНО: Если не уверен в точной идентификации животного - честно скажи об этом и рекомендовай использовать интернет-поиск по описанию или обратиться к специалисту. Но все равно дай рекомендации по первой помощи на основе того, что видишь.

${prompt ? `Дополнительный вопрос пользователя: ${prompt}` : ''}`
        : `${medicalSystemPrompt}\n\nВопрос пользователя: ${prompt}`;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          history: messages.slice(-5).map((m) => ({
            role: m.author === "user" ? ("user" as const) : ("assistant" as const),
            content: m.text,
          })),
          coords: userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null,
          image: selectedImage || undefined, // Отправляем изображение, если есть
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to reach AI Medic");
      }

      const data = await response.json();
      const aiText = data.reply?.trim() || "Извините, не удалось получить ответ. Попробуйте еще раз или вызовите 112.";

      const aiMessage: Message = {
        id: generateId(),
        author: "ai",
        text: aiText,
        timestamp: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("AI Medic error:", error);
      const errorMessage: Message = {
        id: generateId(),
        author: "ai",
        text: "Произошла ошибка при обращении к ИИ-Медику. В экстренной ситуации немедленно вызовите 112!",
        timestamp: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const sendButtonVariants: Variants = useMemo(
    () => ({
      hover: { scale: 1.05, boxShadow: '0 12px 30px rgba(0, 199, 127, 0.4)' },
      tap: { scale: 0.92 },
      idle: { scale: 1 },
    }),
    [],
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-white pt-16 lg:pt-20">
      <div className="flex flex-1 flex-col overflow-hidden px-8 py-6 lg:px-16 xl:px-24">
        {/* Compact Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/safety"
              className="flex-shrink-0 rounded-full p-2 hover:bg-[#F4FFFA] transition"
              aria-label="Назад к безопасности"
            >
              <ArrowLeft className="h-5 w-5 text-[#006948]" />
            </Link>
            <h1 className="font-tapestry text-2xl tracking-[-0.08em] text-[#0F2D1E]">
              ИИ-Медик
            </h1>
          </div>
          <a
            href="tel:112"
            className="flex-shrink-0 rounded-full bg-red-600 hover:bg-red-700 px-3 py-1.5 text-white text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>112</span>
          </a>
        </div>

        {/* Messages */}
        <div className="mt-3 flex-1 space-y-4 overflow-y-auto px-6 lg:min-h-0 lg:px-8">
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
                  className={`max-w-[65%] sm:max-w-[60%] lg:max-w-[55%] tracking-[-0.03em] rounded-2xl border px-4 py-3 text-left text-sm leading-relaxed shadow-sm break-words ${
                    message.author === 'user'
                      ? 'border-[#006948]/20 bg-gradient-to-br from-[#E8FFF4] to-white text-[#0F2D1E]'
                      : 'border-[#006948]/10 bg-white text-[#3F4A46]'
                  }`}
                  style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
                >
                  {message.image && (
                    <div className="mb-2 rounded-lg overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={message.image} 
                        alt="Прикрепленное изображение" 
                        className="max-w-full h-auto max-h-64 object-contain rounded-lg"
                      />
                    </div>
                  )}
                  {message.text && <p className="break-words whitespace-pre-wrap" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{sanitizeAIResponse(message.text)}</p>}
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
                  <span className="text-xs font tracking-[0.-0.07em] text-[#00A36C]">ИИ-Медик</span>
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
          <div ref={messagesEndRef} />
        </div>

        {/* Prompts */}
        <div className="mt-3">
          {showPrompts && (
            <div className="flex flex-wrap gap-2">
              {medicalPrompts.map((prompt) => (
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

          {/* Image Preview */}
          {selectedImage && (
            <div className="mt-4 relative inline-block">
              <div className="relative rounded-lg overflow-hidden border-2 border-[#006948]/20 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={selectedImage} 
                  alt="Предпросмотр" 
                  className="max-w-xs max-h-32 object-contain"
                />
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-1 right-1 rounded-full bg-red-500 text-white p-1 hover:bg-red-600 transition"
                  aria-label="Удалить изображение"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={handleSend}
            className="mt-4 flex items-center gap-3 rounded-xl border border-[#006948]/20 bg-white px-4 py-2"
          >
            <input
              type="file"
              accept="image/*"
              id="image-upload-medic"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    const base64 = await convertImageToBase64(file);
                    setSelectedImage(base64);
                  } catch (error) {
                    console.error('Failed to convert image:', error);
                  }
                }
              }}
              disabled={isGenerating}
            />
            <label
              htmlFor="image-upload-medic"
              className="cursor-pointer inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#006948]/20 text-[#006948] transition hover:bg-[#F4FFFA] disabled:opacity-60"
              aria-label="Прикрепить изображение"
            >
              <Image className="h-4 w-4" />
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={selectedImage ? "Опишите изображение..." : "Опишите ситуацию или задайте вопрос"}
              className="flex-1 bg-transparent text-sm text-[#0F2D1E] tracking-[-0.07em] placeholder:text-[#93A39C] focus:outline-none"
              disabled={isGenerating}
            />
            <motion.button
              type="submit"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#00A36C] text-white transition hover:bg-[#00c77f] disabled:opacity-60"
              aria-label="Отправить сообщение"
              disabled={isGenerating || (!inputValue.trim() && !selectedImage)}
              variants={sendButtonVariants}
              initial="idle"
              whileHover="hover"
              whileTap="tap"
            >
              <SendHorizonal className={`h-4 w-4 ${isGenerating ? 'animate-pulse' : ''}`} />
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  );
}

