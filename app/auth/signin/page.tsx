'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

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
    } catch (error) {
      setError('Произошла ошибка при входе');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E8FFF4] to-white px-4 pt-28">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-[#006948]/10">
          <h1 className="text-2xl font-bold text-[#0F2D1E] mb-2 text-center">Вход в Sayahat</h1>
          <p className="text-sm text-[#7A7A7A] mb-6 text-center">Войдите в свой аккаунт</p>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm mb-4">
              ✅ Регистрация успешна! Теперь войдите в систему.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#0F2D1E] mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-[#006948]/20 text-[#0F2D1E] placeholder:text-[#93A39C] focus:border-[#00A36C] focus:outline-none focus:ring-2 focus:ring-[#00A36C]/20"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#0F2D1E] mb-2">
                Пароль
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-[#006948]/20 text-[#0F2D1E] placeholder:text-[#93A39C] focus:border-[#00A36C] focus:outline-none focus:ring-2 focus:ring-[#00A36C]/20"
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
              className="w-full bg-[#00A36C] text-white py-3 rounded-lg font-medium hover:bg-[#00c77f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Вход...' : 'Войти'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[#7A7A7A]">
              Нет аккаунта?{' '}
              <Link href="/auth/signup" className="text-[#006948] hover:text-[#00A36C] font-medium">
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E8FFF4] to-white px-4 pt-28">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#006948] border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-[#7A7A7A]">Загрузка...</p>
        </div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}

