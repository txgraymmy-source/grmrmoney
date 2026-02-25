# 🚀 Деплой на Vercel

## Шаг 1: Подготовка базы данных

Для production нужна PostgreSQL база данных. Рекомендуемые варианты:

### Вариант A: Vercel Postgres (рекомендуется)
1. Зайдите в [Vercel Dashboard](https://vercel.com/dashboard)
2. Создайте новый проект → Import Git Repository
3. Выберите репозиторий `txgraymmy-source/grmrmoney`
4. Перед деплоем перейдите в Storage → Create Database → Postgres
5. Скопируйте DATABASE_URL

### Вариант B: Neon.tech (бесплатно)
1. Зайдите на [neon.tech](https://neon.tech)
2. Создайте проект
3. Скопируйте PostgreSQL connection string
4. Используйте как DATABASE_URL

## Шаг 2: Настройка переменных окружения в Vercel

В настройках проекта Vercel → Settings → Environment Variables добавьте:

```bash
# Database
DATABASE_URL=postgresql://user:password@host/database

# NextAuth
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-random-secret-key-here

# TRON (опционально - для testnet)
TRON_NETWORK=mainnet
```

### Генерация NEXTAUTH_SECRET

Выполните в терминале:
```bash
openssl rand -base64 32
```

## Шаг 3: Обновление схемы Prisma

Перед деплоем обновите `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"  // Изменить с sqlite на postgresql
  url      = env("DATABASE_URL")
}
```

## Шаг 4: Деплой

1. Закоммитьте изменения:
```bash
git add .
git commit -m "Configure for Vercel deployment"
git push origin master
```

2. В Vercel Dashboard:
   - Settings → General → Framework Preset: Next.js
   - Build Command: `npx prisma generate && npm run build`
   - Install Command: `npm install`

3. Нажмите Deploy

## Шаг 5: Применение миграций

После первого деплоя выполните миграции:

В Settings → Functions → New Function или через Vercel CLI:

```bash
# Установите Vercel CLI
npm i -g vercel

# Войдите
vercel login

# Запустите миграцию
vercel env pull .env.production
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

## ⚠️ Важные настройки

### 1. CORS и CSP
В `next.config.js` уже настроены правильные headers для работы с TronWeb.

### 2. Serverless Functions Timeout
Vercel Free plan: 10 секунд
Vercel Pro plan: 60 секунд

Для синхронизации транзакций может потребоваться Pro plan.

### 3. Edge Runtime
Некоторые TRON операции используют Node.js APIs и не совместимы с Edge Runtime.
Используйте Node.js runtime (уже настроено).

## 🔍 Проверка после деплоя

1. Откройте https://your-app.vercel.app
2. Зарегистрируйте аккаунт
3. Создайте направление (кошелек)
4. Проверьте баланс USDT
5. Отправьте тестовую транзакцию

## 🐛 Типичные проблемы

### "Prisma Client did not initialize yet"
- Убедитесь что `npx prisma generate` выполняется в Build Command

### "Database connection error"
- Проверьте DATABASE_URL в Environment Variables
- Убедитесь что IP Vercel разрешен в настройках БД

### "TronGrid API error"
- Проверьте лимиты TronGrid API
- Возможно нужен TronGrid API Key для production

### Медленная работа
- Рассмотрите Vercel Pro для больших timeout
- Используйте Edge Caching для баланса кошельков

## 📊 Мониторинг

Vercel автоматически предоставляет:
- Логи функций
- Analytics
- Performance metrics
- Error tracking

Проверяйте в разделе Logs и Analytics.

## 🔐 Безопасность

✅ Все секреты хранятся в Environment Variables
✅ `.env` файлы не коммитятся (в `.gitignore`)
✅ Приватные ключи шифруются на клиенте
✅ HTTPS включен по умолчанию

## 🆘 Поддержка

Если что-то не работает:
1. Проверьте логи в Vercel Dashboard
2. Проверьте Environment Variables
3. Убедитесь что миграции применены
4. Проверьте что PostgreSQL доступна

---

**Готово!** Ваше приложение должно работать на https://your-app.vercel.app 🎉
