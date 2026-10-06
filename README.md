# Peach

Local-first bilingual (EN/RU) menstrual cycle tracker. It runs as a website, an installable PWA, and a Telegram Mini App. There is no Peach backend, no account server, and no analytics.

Your records live in this browser’s IndexedDB. If the app is opened inside Telegram, they can also sync to Telegram CloudStorage in chunks, with DeviceStorage used as a local Telegram mirror. Peach never reports a successful cloud copy unless that write actually happened.

## Quick start

Requires [Bun](https://bun.sh) 1.2+.

```sh
bun install
bun start
```

`bun start` exposes the app on your LAN (`--host`) so you can open it from a phone. `bun run dev` stays on localhost for everyday work.

Optional Telegram Mini App mock **only in Vite development**:

```sh
VITE_TELEGRAM_MOCK=true bun run dev
```

`VITE_TELEGRAM_MOCK` is ignored in production builds.

## Scripts

Use `bun run test` (not `bun test`) so Vitest runs instead of Bun’s built-in test runner.

```sh
bun install
bun start
bun run dev
bun run build
bun run preview
bun run test
bun run test:watch
bun run test:e2e
bun run lint
bun run format
bun run format:check
```

## Privacy

- No medical data is sent to a Peach server.
- CSV export is generated entirely on the device (UTF-8 with BOM).
- Telegram bot tokens must never be placed in the frontend.
- `initData` is not treated as a trusted security source because there is no backend to validate it.
- Delete all data clears IndexedDB and attempts to clear Telegram storages when those APIs exist.

## Storage model

IndexedDB is the source of truth. The UI loads from it immediately. A persistent sync queue then mirrors monthly/entity buckets to Telegram CloudStorage when available (values stay under the 4096-character limit). Conflicts merge by revision, then `updatedAt`, then `sourceId`.

## Offline

The production service worker precaches the application shell. After the first visit, opening the app with no network should still work. Local writes always succeed; Telegram sync retries when the app is online or returns to the foreground.

## Telegram

Deploy the built `dist/` folder to HTTPS and point a Telegram bot’s Mini App URL at it. The Mini App uses `Telegram.WebApp` for theme, safe areas, BackButton, haptics, CloudStorage, DeviceStorage, and Home Screen shortcuts when those APIs exist. In a regular browser those features are no-ops.

## Known limitations

- Cycle forecasts are estimates from recent history, not a diagnosis and not contraception.
- CloudStorage has no compare-and-swap, so two devices writing at the same instant can theoretically race; Peach re-reads before push and merges deterministically.
- Predictions stay bounded and show insufficient-history states instead of fake precision.
