'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TextAnimate } from "@/components/ui/text-animate";
import { BlurFade } from "@/components/ui/blur-fade";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Registration failed:', data);
        setError(data.error || 'Ошибка при регистрации');
        if (data.details) {
          console.error('Error details:', data.details);
        }
        return;
      }

      console.log('Registration successful:', data);
      // После успешной регистрации перенаправляем на страницу входа
      router.push('/auth/signin?registered=true');
    } catch (error) {
      console.error('Registration error:', error);
      setError('Произошла ошибка при регистрации. Проверьте консоль браузера (F12) для деталей.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 pt-28">
      <div className="w-full max-w-md">
        <BlurFade inView delay={0.2}>
          <div className="bg-white rounded-3xl shadow-[0_0_60px_rgba(0,105,72,0.08)] p-8 sm:p-12 border border-[#006948]/10">
            <div className="text-center mb-8">
              <TextAnimate
                as="h1"
                animation="slideUp"
                by="word"
                className="font-tapestry text-4xl sm:text-5xl tracking-[-0.08em] text-[#006948] mb-2"
              >
                Регистрация в Sayahat
              </TextAnimate>
              <BlurFade inView delay={0.3}>
                <p className="text-sm text-[#7A7A7A] mt-4 tracking-[-0.02em]">Создайте новый аккаунт</p>
              </BlurFade>
            </div>

            <BlurFade inView delay={0.5}>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[#0F2D1E] mb-2 tracking-[-0.02em]">
                    Имя
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-[#006948]/20 text-[#0F2D1E] placeholder:text-[#93A39C] focus:border-[#00A36C] focus:outline-none focus:ring-2 focus:ring-[#00A36C]/20 tracking-[-0.02em]"
                    placeholder="Ваше имя"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#0F2D1E] mb-2 tracking-[-0.02em]">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-[#006948]/20 text-[#0F2D1E] placeholder:text-[#93A39C] focus:border-[#00A36C] focus:outline-none focus:ring-2 focus:ring-[#00A36C]/20 tracking-[-0.02em]"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-[#0F2D1E] mb-2 tracking-[-0.02em]">
                    Пароль
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 rounded-lg border border-[#006948]/20 text-[#0F2D1E] placeholder:text-[#93A39C] focus:border-[#00A36C] focus:outline-none focus:ring-2 focus:ring-[#00A36C]/20 tracking-[-0.02em]"
                    placeholder="Минимум 6 символов"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#006948] text-white py-3 rounded-full font-semibold tracking-[-0.04em] hover:bg-[#008A6A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
                </button>
              </form>
            </BlurFade>

            <BlurFade inView delay={0.6}>
              <div className="mt-6 text-center">
                <p className="text-sm text-[#7A7A7A] tracking-[-0.02em]">
                  Уже есть аккаунт?{' '}
                  <Link href="/auth/signin" className="text-[#006948] hover:text-[#00A36C] font-medium">
                    Войти
                  </Link>
                </p>
              </div>
            </BlurFade>
          </div>
        </BlurFade>
      </div>
    </div>
  );
}

