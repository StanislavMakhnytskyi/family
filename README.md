# Родинна історія

Приватний сімейний архів: дерево родини, сторінки людей із біографією, місцем поховання та фотогалереєю. Доступ захищений двома кроками (без реєстрації): спільне запитання, а тоді роки народження трьох членів родини.

## Технології

- Next.js 16 (App Router) + React 19, TypeScript (strict)
- Tailwind CSS v4 + власні shadcn-стилізовані компоненти (Radix UI під капотом)
- Власний компактний layout-алгоритм для дерева (`src/lib/family-tree-layout.ts`) — без сторонньої бібліотеки для дерев
- `next-intl` — інтернаціоналізація (наразі активна лише `uk`, структура готова під інші мови)
- `zod` — валідація JSON-даних
- `vitest` — юніт-тести, `@playwright/test` — smoke-тест

## Запуск

Потрібен [pnpm](https://pnpm.io) (`corepack enable` увімкне його автоматично, якщо ще не встановлений).

```bash
pnpm install
pnpm dev
```

Відкрити [http://localhost:3000](http://localhost:3000) — має перекинути на `/gate`. Правильні відповіді дивіться в [src/data/questions.json](src/data/questions.json).

## Інші команди

```bash
pnpm build       # продакшн-збірка
pnpm start       # запуск продакшн-збірки
pnpm lint        # ESLint
pnpm test        # юніт-тести (vitest)
pnpm test:e2e    # smoke-тест (playwright; перший раз: pnpm exec playwright install chromium)
```

## Дані

Увесь контент — у JSON-файлах під [src/data/](src/data/), валідованих Zod-схемами з [src/lib/schemas.ts](src/lib/schemas.ts):

- `people.json` — люди (`id`, `firstName` обов'язкові; `lastName`, `birthDate`, `deathDate`, біографія абзацами, фото — усе необов'язкове)
- `relationships.json` — зв'язки `parent-child` (person1Id — батько/мати, person2Id — дитина) та `spouse`
- `graves.json` — місця поховань (координати, адреса)
- `media.json` — фотогалерея по людях
- `questions.json` — запитання для входу (`normalizedAnswer` + необов'язкові `variants`)

Щоб додати нову людину — просто розширте ці файли вручну, або скористайтеся адмін-панеллю (нижче); сторінки й дерево підхоплять зміни автоматично. Фото людей не обов'язкові: якщо `avatar` не вказано, показується заглушка з ініціалами.

Дані можна тримати або локально в цих файлах, або в єдиному об'єкті у Vercel Global Config — див. [scripts/push-global-config.mjs](scripts/push-global-config.mjs) для пуша локальних файлів туди.

## Адмін-панель

`/admin` — окрема, захищена окремим логіном/паролем панель для редагування всіх п'яти колекцій через форми (без ручного редагування JSON). При вході потрібно явно обрати джерело даних — локальні файли (лише в розробці, файлова система на Vercel доступна тільки для читання) або Vercel Global Config.

Обов'язкові змінні середовища для адмінки:

- `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` — логін адмінки. Хеш генерується через `node scripts/hash-admin-password.mjs "пароль"` (формат `scrypt:сіль:хеш` — саме двокрапки, а не `$`, бо Next-овий завантажувач `.env` через dotenv-expand ламає значення з незекранованим `$`)

Потрібні лише для джерела Vercel Global Config (writes йдуть через REST API, не через SDK):

- `VERCEL_API_TOKEN` — персональний токен з правами запису, зі скоупом саме на той акаунт/команду, якій належить Global Config store
- `VERCEL_GLOBAL_CONFIG_STORE_ID` — id стору (`ecfg_...`), `vercel global-config ls`
- `VERCEL_TEAM_ID` — лише якщо store належить команді, не особистому акаунту

Для завантаження фото потрібен приватний Vercel Blob store, під'єднаний до проєкту (Storage → Create Database → Blob → Access: Private) — це автоматично додає `BLOB_READ_WRITE_TOKEN`, вручну нічого прописувати не треба. Фото проходять через [`putImage`](https://vercel.com/docs/storage/vercel-blob) (оптимізація/ресайз на льоту при завантаженні: аватари — до 400px, медіа — до 1600px), а не через Next-івський `<Image>`-оптимізатор — той робить запит до джерела на сервері без кук браузера, а `/api/media/...` вимагає сесійну куку, тож оптимізатор сам отримав би 401.

Після зміни будь-якої зі змінних середовища на Vercel потрібен новий деплой — на вже задеплоєну збірку вони не поширюються заднім числом.

## Структура

```
src/
  app/            — маршрути (App Router), Server Actions (app/actions, app/admin/actions)
  components/
    ui/            — базові примітиви (button, input, card, avatar, select, textarea, skeleton)
    client/        — інтерактивні "use client" компоненти (дерево, форми входу)
  lib/            — Zod-схеми, читання/запис даних, утиліти, сесія/кукі, layout дерева
  data/           — приклади даних (JSON)
  i18n/           — конфігурація next-intl
messages/         — переклади (uk.json, en.json)
src/proxy.ts      — перевірка сесійних кук (замінює middleware.ts у Next.js 16)
```

## Безпека

- Усі сторінки, крім `/gate` і `/gate/years`, мають `noindex`; `public/robots.txt` забороняє індексацію повністю.
- Сесійна кука `family-session` — HttpOnly, Secure, SameSite=Lax, 7 днів.
- Вхід — два кроки, кожен зі своїм окремим лімітом спроб (3, потім блокування на 15 хв): спільне запитання (`family-gate-attempts`), тоді три роки народження членів родини (`family-gate-years-attempts`). Провал другого кроку не впливає на лічильник першого, і навпаки.
- Адмін-панель має власну сесію (`admin-session`) і власний ліміт спроб, повністю окремі від сімейного входу.
