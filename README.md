# Ivengo — Telegram Auto-Posting System

Production-ready TypeScript monorepo для автопостингу в Telegram-канал про онлайн-казино.

## Структура

```
ivengo/
├── apps/
│   ├── api/        — Fastify REST API (порт 3001)
│   ├── admin/      — Next.js адмін-панель (порт 3000)
│   └── worker/     — Worker для автопостингу (cron щохвилини)
└── packages/
    ├── db/         — Prisma + PostgreSQL
    ├── telegram/   — Telegram Bot API client
    ├── compliance/ — Перевірка контенту на ризикові формулювання
    └── generator/  — Anthropic Claude адаптер для генерації постів
```

## Швидкий старт (локально)

### 1. Передумови

```bash
node >= 20
pnpm >= 9
docker + docker-compose
```

### 2. Клонувати та встановити залежності

```bash
git clone https://github.com/munister-v/ivengo.git
cd ivengo
pnpm install
```

### 3. Налаштувати оточення

```bash
cp .env.example .env
# Відредагуй .env — заповни реальні ключі
```

Мінімально необхідно заповнити:
- `DATABASE_URL` — рядок підключення до PostgreSQL
- `JWT_SECRET` — секрет для JWT (мінімум 32 символи)
- `ADMIN_PASSWORD` — пароль для входу в адмінку
- `ANTHROPIC_API_KEY` — ключ Anthropic Claude API
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHANNEL_ID` — для тестового посіву

### 4. Запустити базу даних

```bash
docker-compose up postgres redis -d
```

### 5. Застосувати Prisma schema та засіяти дані

```bash
pnpm db:generate
pnpm db:push
pnpm db:seed
```

### 6. Запустити всі сервіси в dev-режимі

```bash
pnpm dev
```

Або окремо:
```bash
pnpm --filter @ivengo/api dev
pnpm --filter @ivengo/admin dev
pnpm --filter @ivengo/worker dev
```

Адмін-панель: http://localhost:3000  
API: http://localhost:3001  
Prisma Studio: `pnpm db:studio`

---

## Деплой на Ubuntu VPS

### 1. Підготовка сервера

```bash
# Оновити систему
apt update && apt upgrade -y

# Встановити Docker
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

# Встановити docker-compose-plugin
apt install docker-compose-plugin -y
```

### 2. Клонувати репозиторій

```bash
git clone https://github.com/munister-v/ivengo.git /opt/ivengo
cd /opt/ivengo
```

### 3. Налаштувати .env

```bash
cp .env.example .env
nano .env
```

Обов'язково вказати:
```env
POSTGRES_PASSWORD=your_strong_db_password
JWT_SECRET=your_64_char_random_secret
ADMIN_PASSWORD=your_admin_password
ANTHROPIC_API_KEY=sk-ant-...
CORS_ORIGIN=https://your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

### 4. Збілдити та запустити

```bash
docker compose build
docker compose up -d
```

### 5. Застосувати міграції та засіяти

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed
```

### 6. Перевірити статус

```bash
docker compose ps
docker compose logs -f api
docker compose logs -f worker
```

### 7. Nginx reverse proxy (опціонально)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Після цього: `certbot --nginx` для SSL.

---

## API Reference

### Auth
```
POST /api/auth/login      { password } → { token }
```

Всі інші ендпоінти потребують: `Authorization: Bearer <token>`

### Posts
```
GET    /api/posts                    — список постів (фільтри: status, type, language, page, limit)
POST   /api/posts                    — створити чернетку
GET    /api/posts/:id                — отримати пост
PATCH  /api/posts/:id                — оновити пост
DELETE /api/posts/:id                — видалити
POST   /api/posts/:id/approve        — схвалити (запускає compliance check)
POST   /api/posts/:id/reject         — відхилити
POST   /api/posts/:id/schedule       { scheduledAt: ISO8601 }
POST   /api/posts/:id/publish        — опублікувати негайно
POST   /api/posts/:id/compliance     — запустити compliance check
```

### Batches (генерація)
```
POST /api/batches/generate  { theme, contentType, language, tone, count }
GET  /api/batches
GET  /api/batches/:id
```

### Channels
```
GET    /api/channels
POST   /api/channels         { name, chatId, botToken, description }
PATCH  /api/channels/:id
POST   /api/channels/:id/test
DELETE /api/channels/:id     — деактивує канал
```

### Logs & Stats
```
GET /api/logs    ?status=success|error&page=1
GET /api/stats
```

---

## Compliance правила

Пакет `@ivengo/compliance` автоматично перевіряє текст посту на:

| Rule | Severity | Опис |
|------|----------|------|
| `guaranteed_win` | 🔴 high | Гарантовані виграші |
| `false_profit_claim` | 🔴 high | Стабільний дохід від казино |
| `minors_targeting` | 🔴 high | Контент для неповнолітніх |
| `aggressive_bonus` | 🟡 medium | Бонуси без умов |
| `withdrawal_guarantee` | 🟡 medium | Гарантований вивід |
| `pressure_tactics` | 🟡 medium | Тактики тиску |
| `missing_disclaimer` | 🔵 low | Відсутній дисклеймер |

Пости з **high**-прапорцями не будуть опубліковані.

---

## Worker логіка

- Запускається кожну хвилину (змінюється через `WORKER_CRON`)
- Шукає пости зі статусом `scheduled` і `scheduledAt <= now`
- Шукає `failed` пости з `retryCount < MAX_RETRY_COUNT`
- Перед кожною публікацією запускає compliance check
- Зберігає `telegram_message_id` після успішної публікації
- Логує кожен результат у таблицю `PublicationLog`
- Захист від дубльованих публікацій через `telegramMessageId IS NULL`

---

## Корисні команди

```bash
# Перегенерувати Prisma client
pnpm db:generate

# Відкрити Prisma Studio
pnpm db:studio

# Переглянути логи worker
docker compose logs -f worker

# Зупинити все
docker compose down

# Зупинити і видалити дані (ОБЕРЕЖНО)
docker compose down -v
```

## Технологічний стек

- **Runtime**: Node.js 20
- **Language**: TypeScript 5.5
- **Monorepo**: pnpm workspaces + Turborepo
- **API**: Fastify 4 + Zod validation
- **Admin**: Next.js 14 (App Router) + Tailwind CSS
- **Database**: PostgreSQL 16 + Prisma ORM
- **AI**: Anthropic Claude (claude-sonnet-4-6)
- **Scheduler**: node-cron
- **Logging**: Pino
- **Containerization**: Docker + docker-compose
