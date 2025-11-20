# 🔧 Обновление валидации MongoDB для функции безопасности

## ⚠️ Важно

**Валидация схемы НЕ ускоряет запросы!** Она только проверяет структуру данных.

**Для ускорения нужны ИНДЕКСЫ** - см. файл `MONGODB_INDEXES_OPTIMIZATION.md`

## Проблема

Если в MongoDB установлена валидация схемы для коллекции `users`, нужно добавить поле `safetyCode`.

## Решение

### 1. Обновить валидацию коллекции `users`

Откройте MongoDB Compass или используйте MongoDB Shell:

#### Через MongoDB Compass:
1. Откройте коллекцию `users`
2. Перейдите на вкладку "Validation" или "Schema"
3. Обновите схему валидации

#### Через MongoDB Shell:

```javascript
use sayahat

db.runCommand({
  collMod: "users",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "password", "name", "createdAt", "updatedAt"],
      properties: {
        email: { bsonType: "string" },
        password: { bsonType: "string" },
        name: { bsonType: "string" },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" },
        safetyCode: {
          bsonType: "string",
          pattern: "^[A-Z0-9]{6}$",
          description: "Уникальный 6-значный код безопасности"
        }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "error"
})
```

### 2. Создать коллекцию `safetyContacts` (если нужно)

Коллекция создастся автоматически, но если нужна валидация:

```javascript
db.createCollection("safetyContacts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "contactUserId", "createdAt"],
      properties: {
        userId: { bsonType: "string" },
        contactUserId: { bsonType: "string" },
        createdAt: { bsonType: "date" },
        lastLocation: {
          bsonType: "object",
          properties: {
            lat: { bsonType: "double" },
            lng: { bsonType: "double" },
            timestamp: { bsonType: "date" }
          }
        }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "error"
})
```

### 3. Создать коллекцию `sosAlerts` (если нужно)

```javascript
db.createCollection("sosAlerts", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["contactId", "fromUserId", "toUserId", "timestamp", "status"],
      properties: {
        contactId: { bsonType: "string" },
        fromUserId: { bsonType: "string" },
        toUserId: { bsonType: "string" },
        timestamp: { bsonType: "date" },
        status: { 
          bsonType: "string",
          enum: ["pending", "sent", "read"]
        },
        location: {
          bsonType: "object",
          properties: {
            lat: { bsonType: "double" },
            lng: { bsonType: "double" }
          }
        },
        message: { bsonType: "string" }
      }
    }
  },
  validationLevel: "moderate",
  validationAction: "error"
})
```

## Важно

- Поле `safetyCode` **необязательное** (не в `required`), так как генерируется при первом использовании
- Если валидация слишком строгая, можно временно отключить её или использовать `bypassDocumentValidation: true` (уже добавлено в код)
- После обновления схемы перезапустите сервер

## Альтернатива: Отключить валидацию

Если не хотите использовать валидацию, можно её отключить:

```javascript
use sayahat

// Для коллекции users
db.runCommand({
  collMod: "users",
  validator: {}
})
```

Но лучше обновить схему, добавив `safetyCode` как опциональное поле.

