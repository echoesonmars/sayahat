# Настройка MongoDB для Sayahat

## Вариант 1: MongoDB Atlas (Рекомендуется - облачный, бесплатный)

### Шаг 1: Создайте аккаунт на MongoDB Atlas
1. Перейдите на https://www.mongodb.com/cloud/atlas/register
2. Зарегистрируйтесь (можно через Google/GitHub)
3. Выберите бесплатный план (M0 - Free)

### Шаг 2: Создайте кластер
1. После регистрации нажмите "Build a Database"
2. Выберите бесплатный вариант (M0)
3. Выберите регион (ближайший к вам, например: AWS / Frankfurt)
4. Нажмите "Create"

### Шаг 3: Настройте доступ
1. **Database Access** (доступ к базе):
   - Перейдите в "Database Access" в левом меню
   - Нажмите "Add New Database User"
   - Username: `sayahat` (или любое другое)
   - Password: создайте надежный пароль (сохраните его!)
   - Database User Privileges: "Atlas admin" или "Read and write to any database"
   - Нажмите "Add User"

2. **Network Access** (доступ по IP):
   - Перейдите в "Network Access" в левом меню
   - Нажмите "Add IP Address"
   - Выберите "Allow Access from Anywhere" (0.0.0.0/0) для разработки
   - Или добавьте ваш текущий IP адрес
   - Нажмите "Confirm"

### Шаг 4: Получите Connection String
1. Вернитесь в "Database" (Deployments)
2. Нажмите "Connect" на вашем кластере
3. Выберите "Drivers"
4. Выберите "Node.js" и версию "5.5 or later"
5. Скопируйте Connection String, он будет выглядеть так:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Замените `<username>` и `<password>` на ваши данные из шага 3

### Шаг 5: Настройте переменные окружения
1. Создайте файл `.env.local` в корне проекта (если его нет)
2. Добавьте следующие строки:
   ```env
   MONGODB_URI=mongodb+srv://sayahat:ваш_пароль@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DB=sayahat
   ```
3. Замените `ваш_пароль` на пароль, который вы создали в шаге 3
4. Замените `cluster0.xxxxx.mongodb.net` на ваш реальный адрес кластера

### Шаг 6: Перезапустите сервер
```bash
npm run dev
```

---

## Вариант 2: Локальный MongoDB

### Шаг 1: Установите MongoDB
1. **Windows**: Скачайте с https://www.mongodb.com/try/download/community
2. **macOS**: `brew install mongodb-community`
3. **Linux**: Следуйте инструкциям на https://docs.mongodb.com/manual/installation/

### Шаг 2: Запустите MongoDB
```bash
# Windows (обычно запускается автоматически как служба)
# Или через командную строку:
mongod

# macOS/Linux:
mongod --dbpath ~/data/db
```

### Шаг 3: Настройте переменные окружения
Создайте файл `.env.local`:
```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=sayahat
```

### Шаг 4: Перезапустите сервер
```bash
npm run dev
```

---

## Проверка подключения

После настройки проверьте подключение:

1. Откройте консоль браузера (F12)
2. Перейдите на страницу `/ai-guide`
3. Попробуйте создать план или заметку
4. Если все работает, данные должны сохраняться в MongoDB

## Структура базы данных

После первого использования будут созданы коллекции:
- `plans` - планы путешествий
- `notes` - заметки пользователей
- `places` - места/локации (если вы добавите данные о местах)

## Устранение проблем

### Ошибка "Missing MongoDB credentials"
- Убедитесь, что файл `.env.local` существует
- Проверьте, что переменные `MONGODB_URI` и `MONGODB_DB` заполнены
- Перезапустите сервер после изменения `.env.local`

### Ошибка подключения к Atlas
- Проверьте, что IP адрес добавлен в Network Access
- Убедитесь, что username и password правильные
- Проверьте, что кластер запущен (может быть в режиме паузы)

### Ошибка подключения к локальному MongoDB
- Убедитесь, что MongoDB запущен: `mongod`
- Проверьте, что порт 27017 не занят другим процессом

