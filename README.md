# Родинна історія

Приватний сімейний архів: дерево родини, сторінки людей із біографією, місцем поховання на карті та фотогалереєю. Доступ захищений одним спільним запитанням (без реєстрації).

## Технології

- Next.js 16 (App Router) + React 19, TypeScript (strict)
- Tailwind CSS v4 + власні shadcn-стилізовані компоненти (Radix UI під капотом)
- [`family-chart`](https://github.com/donatso/family-chart) — інтерактивне дерево (D3)
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

- `people.json` — люди (id, ім'я, прізвище, дати, біографія абзацами, фото)
- `relationships.json` — зв'язки `parent-child` (person1Id — батько/мати, person2Id — дитина) та `spouse`
- `graves.json` — місця поховань (координати, адреса)
- `media.json` — фотогалерея по людях
- `questions.json` — запитання для входу (`normalizedAnswer` + необов'язкові `variants`)

Щоб додати нову людину — просто розширте ці файли; сторінки й дерево підхоплять зміни автоматично. Фото людей не обов'язкові: якщо `avatar` не вказано, показується заглушка з ініціалами.

## Структура

```
src/
  app/            — маршрути (App Router), Server Actions (app/actions)
  components/
    ui/            — базові примітиви (button, input, card, dialog, avatar, skeleton)
    client/        — інтерактивні "use client" компоненти (дерево, карта, форма входу)
  lib/            — Zod-схеми, читання даних, утиліти, сесія/кукі
  data/           — приклади даних (JSON)
  i18n/           — конфігурація next-intl
messages/         — переклади (uk.json, en.json)
src/proxy.ts      — перевірка сесійної куки (замінює middleware.ts у Next.js 16)
```

## Безпека

- Усі сторінки, крім `/gate`, мають `noindex`; `public/robots.txt` забороняє індексацію повністю.
- Сесійна кука `family-session` — HttpOnly, Secure, SameSite=Lax, 7 днів.
- Ліміт спроб входу — 3, після чого блокування на 15 хвилин (кука `family-gate-attempts`).
