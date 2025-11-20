# Подключение MongoDB из Compass к проекту

## Шаг 1: Получите Connection String из MongoDB Compass

### Вариант A: Если у вас есть доступ к MongoDB Atlas
1. Откройте браузер и перейдите на https://cloud.mongodb.com
2. Войдите в свой аккаунт
3. Выберите ваш кластер (shymkent.fqeqszf.mongodb.net)
4. Нажмите "Connect"
5. Выберите "Drivers"
6. Выберите "Node.js" и версию "5.5 or later"
7. Скопируйте Connection String

### Вариант B: Если у вас только Compass
1. В MongoDB Compass посмотрите на строку подключения вверху
2. Или создайте новое подключение и скопируйте connection string
3. Формат будет примерно таким:
   ```
   mongodb+srv://username:password@shymkent.fqeqszf.mongodb.net/
   ```
   или
   ```
   mongodb://username:password@shymkent.fqeqszf.mongodb.net:27017/
   ```

## Шаг 2: Создайте файл .env.local

В корне проекта создайте файл `.env.local`:

```bash
# В терминале выполните:
cp env.example .env.local
```

Или создайте файл вручную в корне проекта.

## Шаг 3: Заполните .env.local

Откройте файл `.env.local` и добавьте:

```env
# OpenAI API Key (если еще не добавлен)
OPENAI_API_KEY=ваш_ключ_openai

# MongoDB Connection String
# Замените username и password на ваши реальные данные
MONGODB_URI=mongodb+srv://username:password@shymkent.fqeqszf.mongodb.net/?retryWrites=true&w=majority

# Имя базы данных (уже существует в вашем случае)
MONGODB_DB=sayahat
```

**Важно:**
- Замените `username` на ваше имя пользователя MongoDB
- Замените `password` на ваш пароль MongoDB
- Если пароль содержит специальные символы (@, #, $, и т.д.), закодируйте их в URL-формате:
  - `@` → `%40`
  - `#` → `%23`
  - `$` → `%24`
  - `&` → `%26`

## Шаг 4: Перезапустите сервер

```bash
# Остановите сервер (Ctrl+C) и запустите снова:
npm run dev
```

## Шаг 5: Проверьте подключение

1. Откройте http://localhost:3000/ai-guide
2. Перейдите на вкладку "Мои планы" или "заметки"
3. Попробуйте создать план или заметку
4. Проверьте в MongoDB Compass - данные должны появиться в коллекциях `plans` и `notes`

## Структура базы данных

После использования будут созданы/использованы коллекции:
- `plans` - планы путешествий
- `notes` - заметки пользователей
- `towns` - уже существует (ваши данные о городах)
- `places` - места/локации (если добавите)

## Пример правильного формата

Если ваш username: `admin`, password: `mypass123`:
```env
MONGODB_URI=mongodb+srv://admin:mypass123@shymkent.fqeqszf.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=sayahat
```

Если пароль содержит специальные символы, например `pass@123`:
```env
MONGODB_URI=mongodb+srv://admin:pass%40123@shymkent.fqeqszf.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=sayahat
```

