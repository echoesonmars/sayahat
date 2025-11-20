# 🚀 Деплой MongoDB для Sayahat

## Варианты деплоя MongoDB

### 1. MongoDB Atlas (Рекомендуется) ⭐

**Самый простой и надежный вариант для продакшена.**

#### Шаги:

1. **Создайте аккаунт на MongoDB Atlas**
   - Перейдите на https://www.mongodb.com/cloud/atlas
   - Зарегистрируйтесь (бесплатный тариф M0 доступен)

2. **Создайте кластер**
   - Нажмите "Build a Database"
   - Выберите бесплатный тариф M0 (512MB)
   - Выберите регион (ближайший к вам)
   - Назовите кластер (например, "sayahat-cluster")

3. **Настройте доступ**
   - В разделе "Network Access" добавьте IP адрес:
     - Для разработки: `0.0.0.0/0` (разрешить доступ откуда угодно)
     - Для продакшена: IP адрес вашего сервера/хостинга
   - В разделе "Database Access" создайте пользователя:
     - Username: `sayahat-user` (или любое другое)
     - Password: сгенерируйте надежный пароль
     - Database User Privileges: "Atlas admin" или "Read and write to any database"

4. **Получите Connection String**
   - Нажмите "Connect" на вашем кластере
   - Выберите "Connect your application"
   - Скопируйте connection string
   - Замените `<password>` на ваш пароль
   - Замените `<dbname>` на `sayahat` (или оставьте по умолчанию)

   Пример:
   ```
   mongodb+srv://sayahat-user:YOUR_PASSWORD@sayahat-cluster.xxxxx.mongodb.net/sayahat?retryWrites=true&w=majority
   ```

5. **Обновите переменные окружения**
   - В вашем хостинге (Vercel, Railway, и т.д.) добавьте:
     ```
     MONGODB_URI=mongodb+srv://sayahat-user:YOUR_PASSWORD@sayahat-cluster.xxxxx.mongodb.net/sayahat?retryWrites=true&w=majority
     ```

### 2. Self-hosted MongoDB на VPS

Если у вас есть VPS (DigitalOcean, AWS EC2, и т.д.):

#### Установка MongoDB на Ubuntu/Debian:

```bash
# Обновляем систему
sudo apt update
sudo apt upgrade -y

# Устанавливаем MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Запускаем MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Настраиваем доступ
sudo nano /etc/mongod.conf
```

В файле `/etc/mongod.conf`:
```yaml
net:
  port: 27017
  bindIp: 0.0.0.0  # Или конкретный IP

security:
  authorization: enabled
```

Создайте пользователя:
```javascript
mongosh
use admin
db.createUser({
  user: "sayahat-user",
  pwd: "YOUR_PASSWORD",
  roles: [ { role: "readWrite", db: "sayahat" } ]
})
```

Connection string:
```
mongodb://sayahat-user:YOUR_PASSWORD@YOUR_VPS_IP:27017/sayahat?authSource=admin
```

### 3. Railway (Простой вариант)

1. Зайдите на https://railway.app
2. Создайте новый проект
3. Добавьте MongoDB template
4. Скопируйте connection string из переменных окружения Railway

### 4. Render

1. Зайдите на https://render.com
2. Создайте новый MongoDB service
3. Используйте предоставленный connection string

## Настройка для продакшена

### Переменные окружения для продакшена:

```env
# MongoDB
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/sayahat?retryWrites=true&w=majority

# NextAuth
NEXTAUTH_SECRET=your-secret-key-here-generate-with-openssl-rand-base64-32
NEXTAUTH_URL=https://your-domain.com

# OpenAI (если используется)
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
```

### Генерация NEXTAUTH_SECRET:

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

## Деплой на Vercel

1. **Подключите репозиторий**
   - Зайдите на https://vercel.com
   - Импортируйте репозиторий GitHub

2. **Добавьте переменные окружения**
   - В настройках проекта → Environment Variables
   - Добавьте:
     - `MONGODB_URI`
     - `NEXTAUTH_SECRET`
     - `NEXTAUTH_URL` (ваш домен Vercel)
     - `OPENAI_API_KEY` (если используется)

3. **Деплой**
   - Vercel автоматически задеплоит при push в main ветку

## Деплой на Railway

1. **Подключите репозиторий**
   - Зайдите на https://railway.app
   - New Project → Deploy from GitHub repo

2. **Добавьте MongoDB**
   - New → Database → Add MongoDB
   - Railway автоматически создаст переменную `MONGO_URL`

3. **Обновите переменные**
   - В настройках проекта добавьте:
     - `MONGODB_URI` (используйте `MONGO_URL` от Railway)
     - `NEXTAUTH_SECRET`
     - `NEXTAUTH_URL`
     - `OPENAI_API_KEY`

## Проверка подключения

После деплоя проверьте подключение:

1. Откройте ваше приложение
2. Попробуйте зарегистрироваться
3. Проверьте логи в консоли хостинга
4. Проверьте коллекции в MongoDB Atlas/Railway

## Важно

- ⚠️ **Никогда не коммитьте `.env.local` в git!**
- ✅ Используйте переменные окружения на хостинге
- ✅ Используйте сильные пароли для MongoDB
- ✅ Ограничьте доступ по IP в MongoDB Atlas для безопасности
- ✅ Регулярно делайте бэкапы базы данных

## Миграция данных

Если у вас уже есть локальная БД:

### Экспорт:
```bash
mongodump --uri="mongodb://localhost:27017/sayahat" --out=./backup
```

### Импорт в MongoDB Atlas:
```bash
mongorestore --uri="mongodb+srv://user:password@cluster.mongodb.net/sayahat" ./backup/sayahat
```

## Поддержка

Если возникли проблемы:
1. Проверьте логи в консоли хостинга
2. Проверьте Network Access в MongoDB Atlas
3. Убедитесь, что все переменные окружения установлены
4. Проверьте формат connection string

