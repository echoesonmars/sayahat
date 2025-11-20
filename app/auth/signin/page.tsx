'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { TextAnimate } from "@/components/ui/text-animate";
import { BlurFade } from "@/components/ui/blur-fade";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccess(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Неверный email или пароль');
      } else {
        router.push('/ai-guide');
        router.refresh();
      }
    } catch {
      setError('Произошла ошибка при входе');
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
                Вход в Sayahat
              </TextAnimate>
              <BlurFade inView delay={0.3}>
                <p className="text-sm text-[#7A7A7A] mt-4 tracking-[-0.02em]">Войдите в свой аккаунт</p>
              </BlurFade>
            </div>

            {success && (
              <BlurFade inView delay={0.4}>
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm mb-4">
                  ✅ Регистрация успешна! Теперь войдите в систему.
                </div>
              </BlurFade>
            )}

            <BlurFade inView delay={0.5}>
              <form onSubmit={handleSubmit} className="space-y-5">
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
                    className="w-full px-4 py-3 rounded-lg border border-[#006948]/20 text-[#0F2D1E] placeholder:text-[#93A39C] focus:border-[#00A36C] focus:outline-none focus:ring-2 focus:ring-[#00A36C]/20 tracking-[-0.02em]"
                    placeholder="••••••••"
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
                  {isLoading ? 'Вход...' : 'Войти'}
                </button>
              </form>
            </BlurFade>

            <BlurFade inView delay={0.6}>
              <div className="mt-6 text-center">
                <p className="text-sm text-[#7A7A7A] tracking-[-0.02em]">
                  Нет аккаунта?{' '}
                  <Link href="/auth/signup" className="text-[#006948] hover:text-[#00A36C] font-medium">
                    Зарегистрироваться
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

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white px-4 pt-28">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#006948] border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-[#7A7A7A] tracking-[-0.02em]">Загрузка...</p>
        </div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}

