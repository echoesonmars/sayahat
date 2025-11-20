'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#E8FFF4] to-white px-4 pt-28">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-[#006948]/10">
          <h1 className="text-2xl font-bold text-[#0F2D1E] mb-2 text-center">Регистрация в Sayahat</h1>
          <p className="text-sm text-[#7A7A7A] mb-6 text-center">Создайте новый аккаунт</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#0F2D1E] mb-2">
                Имя
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-[#006948]/20 text-[#0F2D1E] placeholder:text-[#93A39C] focus:border-[#00A36C] focus:outline-none focus:ring-2 focus:ring-[#00A36C]/20"
                placeholder="Ваше имя"
              />
            </div>

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
                minLength={6}
                className="w-full px-4 py-3 rounded-lg border border-[#006948]/20 text-[#0F2D1E] placeholder:text-[#93A39C] focus:border-[#00A36C] focus:outline-none focus:ring-2 focus:ring-[#00A36C]/20"
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
              className="w-full bg-[#00A36C] text-white py-3 rounded-lg font-medium hover:bg-[#00c77f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[#7A7A7A]">
              Уже есть аккаунт?{' '}
              <Link href="/auth/signin" className="text-[#006948] hover:text-[#00A36C] font-medium">
                Войти
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

