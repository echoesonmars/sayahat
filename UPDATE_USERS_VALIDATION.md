# Обновление валидации коллекции users

## Обновленная схема валидации:

```json
{
  "bsonType": "object",
  "required": [
    "email",
    "password",
    "name",
    "createdAt",
    "updatedAt"
  ],
  "properties": {
    "email": {
      "bsonType": "string"
    },
    "password": {
      "bsonType": "string"
    },
    "name": {
      "bsonType": "string"
    },
    "createdAt": {
      "bsonType": "date"
    },
    "updatedAt": {
      "bsonType": "date"
    },
    "safetyCode": {
      "bsonType": "string",
      "pattern": "^[A-Z0-9]{6}$",
      "description": "Уникальный 6-значный код безопасности"
    }
  }
}
```

## Как применить в MongoDB:

### Через MongoDB Compass:
1. Откройте коллекцию `users`
2. Перейдите на вкладку "Validation" или "Schema"
3. Вставьте обновленную схему выше
4. Сохраните

### Через MongoDB Shell:

```javascript
use sayahat

db.runCommand({
  collMod: "users",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "email",
        "password",
        "name",
        "createdAt",
        "updatedAt"
      ],
      properties: {
        email: {
          bsonType: "string"
        },
        password: {
          bsonType: "string"
        },
        name: {
          bsonType: "string"
        },
        createdAt: {
          bsonType: "date"
        },
        updatedAt: {
          bsonType: "date"
        },
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

## Важно:

- Поле `safetyCode` **НЕ** добавлено в `required`, так как оно генерируется при первом использовании функции безопасности
- Старые пользователи могут не иметь этого поля - это нормально
- Новые пользователи получат код автоматически при первом открытии вкладки "Безопасность"

