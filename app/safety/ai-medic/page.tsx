"use client";

import { useState, useEffect, useRef } from "react";
import { BlurFade } from "@/components/ui/blur-fade";
import { TextAnimate } from "@/components/ui/text-animate";
import { Stethoscope, Send, Phone, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  id: string;
  author: "user" | "ai";
  text: string;
  timestamp: string;
}

const medicalPrompts = [
  {
    title: "Первая помощь",
    description: "Инструкции по оказанию первой помощи",
    prompt: "Расскажи подробно, как оказать первую помощь при травме или несчастном случае. Что нужно сделать в первую очередь?",
  },
  {
    title: "Симптомы",
    description: "Опишите симптомы для диагностики",
    prompt: "У меня есть симптомы. Помоги разобраться, что это может быть и что делать.",
  },
  {
    title: "Ближайшая больница",
    description: "Найти ближайшее медицинское учреждение",
    prompt: "Где находится ближайшая больница или медицинский пункт? Мне нужна срочная медицинская помощь.",
  },
  {
    title: "Медикаменты",
    description: "Информация о лекарствах",
    prompt: "Расскажи о лекарствах, которые могут помочь в экстренной ситуации. Что должно быть в аптечке путешественника?",
  },
];

export default function AIMedicPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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

  // Функция для форматирования текста ИИ
  const formatAIText = (text: string): React.ReactNode => {
    if (!text) return "";
    
    let formatted = text;
    
    // Убираем markdown код блоки, но оставляем содержимое
    formatted = formatted.replace(/```[\s\S]*?```/g, (block) => {
      return block.replace(/```/g, "").trim();
    });
    
    // Убираем одинарные backticks
    formatted = formatted.replace(/`([^`]+)`/g, "$1");
    
    // Убираем жирный текст markdown, но оставляем содержимое
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, "$1");
    
    // Убираем курсив markdown
    formatted = formatted.replace(/\*(.*?)\*/g, "$1");
    
    // Убираем заголовки markdown
    formatted = formatted.replace(/^#{1,6}\s+/gm, "");
    
    // Преобразуем списки markdown в обычные списки
    formatted = formatted.replace(/^\s*[-+]\s+/gm, "• ");
    formatted = formatted.replace(/^\s*\d+\.\s+/gm, (match) => `${match.trim()} `);
    
    // Убираем лишние переносы строк
    formatted = formatted.replace(/\r/g, "");
    formatted = formatted.replace(/\n{3,}/g, "\n\n");
    
    // Разбиваем на параграфы и обрабатываем списки
    const lines = formatted.split("\n");
    const processedLines: React.ReactNode[] = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        if (index > 0 && index < lines.length - 1) {
          processedLines.push(<br key={`br-${index}`} />);
        }
        return;
      }
      
      // Проверяем, является ли строка элементом списка
      if (trimmedLine.match(/^[•\d+\.]/)) {
        processedLines.push(
          <div key={`line-${index}`} className="flex items-start gap-2 my-1">
            <span className="text-[#006948] flex-shrink-0">•</span>
            <span className="flex-1">{trimmedLine.replace(/^[•\d+\.]\s*/, "")}</span>
          </div>
        );
      } else {
        processedLines.push(
          <p key={`line-${index}`} className="mb-2 last:mb-0">
            {trimmedLine}
          </p>
        );
      }
    });
    
    return processedLines.length > 0 ? <>{processedLines}</> : formatted;
  };

  const handleSend = async (e?: React.FormEvent<HTMLFormElement>, customPrompt?: string) => {
    e?.preventDefault();
    const prompt = customPrompt || inputValue.trim();
    if (!prompt || isGenerating) return;

    const userMessage: Message = {
      id: generateId(),
      author: "user",
      text: prompt,
      timestamp: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
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

${userLocation ? `Пользователь находится в Казахстане, координаты: ${userLocation.lat}, ${userLocation.lng}` : "Пользователь находится в Казахстане"}

Отвечай кратко, четко, по делу. В критических ситуациях сразу предлагай вызвать 112.`;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: `${medicalSystemPrompt}\n\nВопрос пользователя: ${prompt}`,
          history: messages.slice(-5).map((m) => ({
            role: m.author === "user" ? ("user" as const) : ("assistant" as const),
            content: m.text,
          })),
          coords: userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null,
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

  return (
    <main className="min-h-screen bg-white flex flex-col pt-20">
      {/* Hero Section */}
      <section className="px-4 sm:px-6 lg:px-8 py-8 bg-gradient-to-br from-[#006948] via-[#008A6A] to-[#00D592]">
        <div className="max-w-6xl mx-auto">
          <BlurFade inView>
            <div className="text-center text-white">
              <div className="flex items-center justify-center gap-4 mb-4">
                <Link
                  href="/safety"
                  className="flex-shrink-0 rounded-full p-2 hover:bg-white/20 transition"
                  aria-label="Назад к безопасности"
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </Link>
                <TextAnimate
                  as="h2"
                  animation="slideUp"
                  by="word"
                  className="font-tapestry text-3xl sm:text-4xl lg:text-5xl tracking-[-0.08em]"
                >
                  ИИ-Медик готов помочь
                </TextAnimate>
                <a
                  href="tel:112"
                  className="flex-shrink-0 rounded-full bg-red-600 hover:bg-red-700 px-4 py-2 text-white text-sm font-semibold flex items-center gap-2 transition"
                >
                  <Phone className="w-4 h-4" />
                  <span className="hidden sm:inline">112</span>
                </a>
              </div>
              <TextAnimate
                as="p"
                animation="slideUp"
                by="word"
                delay={0.2}
                className="mt-4 text-lg sm:text-xl tracking-[-0.03em] text-white/90 max-w-2xl mx-auto"
              >
                В экстренных ситуациях наш ИИ-помощник предоставит пошаговые инструкции по оказанию первой помощи и подскажет ближайшие медицинские учреждения.
              </TextAnimate>
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-white/80">
                <AlertCircle className="w-4 h-4" />
                <span>В критических ситуациях немедленно вызывайте 112</span>
              </div>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* Quick Prompts */}
      {messages.length === 0 && (
        <section className="px-4 sm:px-6 lg:px-8 py-8 bg-[#F8FFFB]">
          <div className="max-w-6xl mx-auto">
            <BlurFade inView>
              <p className="text-sm uppercase tracking-[0.3em] text-[#006948] mb-4 text-center">Быстрые вопросы</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {medicalPrompts.map((prompt) => (
                  <button
                    key={prompt.title}
                    onClick={() => handleSend(undefined, prompt.prompt)}
                    className="rounded-2xl border border-[#006948]/20 bg-white p-4 text-left hover:border-[#006948] hover:shadow-lg transition-all"
                  >
                    <h3 className="font-semibold text-[#006948] mb-1">{prompt.title}</h3>
                    <p className="text-xs text-[#4A4A4A]">{prompt.description}</p>
                  </button>
                ))}
              </div>
            </BlurFade>
          </div>
        </section>
      )}

      {/* Chat Section */}
      <section className="flex-1 flex flex-col max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto mb-4 space-y-4 min-h-0"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Stethoscope className="w-16 h-16 text-[#006948]/20 mx-auto mb-4" />
              <p className="text-[#4A4A4A]">Начните диалог с ИИ-Медиком</p>
              <p className="text-sm text-[#7A7A7A] mt-2">Выберите быстрый вопрос выше или напишите свой</p>
            </div>
          ) : (
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`flex ${message.author === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] sm:max-w-[70%] rounded-3xl px-4 py-3 ${
                      message.author === "user"
                        ? "bg-[#006948] text-white"
                        : "bg-[#F8FFFB] border border-[#006948]/20 text-[#111]"
                    }`}
                  >
                    {message.author === "ai" ? (
                      <div className="text-sm break-words leading-relaxed">
                        {formatAIText(message.text)}
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                    )}
                    <p
                      className={`text-xs mt-2 ${
                        message.author === "user" ? "text-white/70" : "text-[#7A7A7A]"
                      }`}
                    >
                      {message.timestamp}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          {isGenerating && (
            <div className="flex justify-start">
              <div className="bg-[#F8FFFB] border border-[#006948]/20 rounded-3xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#006948]" />
                <span className="text-sm text-[#4A4A4A]">ИИ-Медик думает...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Опишите ситуацию или задайте вопрос..."
            className="flex-1 rounded-full border border-[#006948]/20 bg-[#F8FFFB] px-6 py-3 text-[#111] focus:outline-none focus:ring-2 focus:ring-[#006948]"
            disabled={isGenerating}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isGenerating}
            className="flex-shrink-0 rounded-full bg-[#006948] hover:bg-[#008A6A] disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 text-white transition hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </section>
    </main>
  );
}

