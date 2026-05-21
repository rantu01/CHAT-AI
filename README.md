# Rantu AI WhatsApp Auto Reply

A production-style WhatsApp AI assistant built with Next.js App Router, MongoDB, Gemini, and Baileys.

## What it does

- Connects to WhatsApp using Baileys QR login
- Saves the WhatsApp session locally in `storage/wa-auth`
- Auto reconnects when the socket disconnects
- Listens for incoming WhatsApp messages
- Ignores status broadcast messages
- Sends the message text to Gemini for a smart reply
- Falls back to a short human reply if Gemini is unavailable
- Replies automatically with a human-like Bangla/English tone
- Stores conversation history in MongoDB
- Prevents duplicate replies with a unique processed-message record
- Shows a dashboard with connection status, QR state, last message, and total handled messages

## Folder structure

- `app/page.jsx` - dashboard entry point
- `app/layout.jsx` - app shell and metadata
- `app/api/bot/status/route.js` - bot status endpoint
- `app/api/bot/start/route.js` - initialize the bot
- `app/api/bot/reset/route.js` - reset the WhatsApp session
- `components/dashboard/bot-dashboard.jsx` - dashboard UI
- `lib/mongodb.js` - MongoDB connection helper
- `lib/gemini.js` - Gemini reply generator with fallback
- `lib/whatsapp.js` - Baileys socket manager
- `lib/bot-store.js` - MongoDB bot state and conversation helpers
- `models/` - Mongoose models

## Install dependencies

Use `npm.cmd` on Windows PowerShell:

```bash
npm.cmd install @google/generative-ai @whiskeysockets/baileys mongoose pino qrcode
```

## Environment variables

Create a `.env.local` file from `.env.example`.

Required values:

- `MONGODB_URI`
- `GEMINI_API_KEY`

Important:

- Use a fresh Google AI Studio key for Gemini free tier.
- If Google suspends the consumer behind the key, code cannot bypass that suspension.
- Replace the key and restart the app if you get a 403 `CONSUMER_SUSPENDED` error.
- Use a supported model name such as `gemini-2.0-flash`.
- If you keep an older model in `.env`, the app now tries compatible fallbacks automatically.

Optional values:

- `MONGODB_DB_NAME`
- `GEMINI_MODEL`
- `WHATSAPP_AUTH_DIR`
- `WHATSAPP_BOT_NAME`
- `APP_NAME`
- `DASHBOARD_TITLE`

## Run locally

```bash
npm.cmd run dev
```

Then open `http://localhost:3000`.

The bot starts from the dashboard and generates a QR code when it needs pairing.

## How to recover from QR problems

If the dashboard shows `QR refs attempts ended` or `could not link device`:

1. Open the dashboard.
2. Click `Reset WhatsApp session`.
3. Scan the new QR code immediately.
4. Do not reuse an old QR image.

## Production setup on a VPS

1. Install Node.js 20+ and MongoDB access.
2. Clone the repo on the VPS.
3. Add `.env.local` with production values.
4. Install dependencies with `npm.cmd install` or `npm install` on Linux.
5. Build the app:

```bash
npm.cmd run build
```

6. Start the app with PM2:

```bash
pm2 start npm --name rantu-ai-bot -- run start
pm2 save
pm2 startup
```

7. Open the dashboard and scan the QR code from a real phone session.

## PM2 commands

```bash
pm2 status
pm2 logs rantu-ai-bot
pm2 restart rantu-ai-bot
pm2 stop rantu-ai-bot
pm2 delete rantu-ai-bot
```

## Troubleshooting

- If QR is not showing, confirm the bot has `MONGODB_URI` and `GEMINI_API_KEY` set correctly.
- If WhatsApp disconnects with `logged-out`, remove the local session folder in `storage/wa-auth` and scan again.
- If Gemini replies are failing with 403, replace the API key with a fresh Google AI Studio key.
- If Gemini replies are failing with 404, switch `GEMINI_MODEL` to `gemini-2.0-flash`.
- If MongoDB writes fail, check network access and Atlas IP allowlist.
- If the dashboard shows stale status, restart the Node process and refresh the page.

## Security best practices

- Keep `.env.local` out of git.
- Protect the dashboard behind VPN, basic auth, or a reverse proxy auth layer in production.
- Do not expose the session folder publicly.
- Use a separate MongoDB user with the minimum required permissions.
- Rotate the Gemini API key if it is ever exposed.

## Vercel deploy

The dashboard can be deployed to Vercel, but the long-lived WhatsApp socket is not a good fit for serverless hosting.

On Vercel, the app now runs in dashboard-only mode and will not try to start the WhatsApp bot.

If you still deploy the UI to Vercel:

1. Push the repo to GitHub.
2. Import it in Vercel.
3. Add the environment variables in the Vercel dashboard.
4. Deploy the app.

For a real WhatsApp bot, keep the socket running on a VPS with PM2 and use Vercel only for the dashboard if needed.

## Setup guide

1. Copy `.env.example` to `.env.local`.
2. Fill in `MONGODB_URI` and `GEMINI_API_KEY`.
3. Install dependencies.
4. Run `npm.cmd run dev`.
5. Open the dashboard and scan the QR code.
6. Send a WhatsApp message to test the auto reply.
# Rantu AI WhatsApp Auto Reply

A production-style WhatsApp AI assistant built with Next.js App Router, MongoDB, Gemini, and Baileys.

## What it does

- Connects to WhatsApp using Baileys QR login
- Saves the WhatsApp session locally in `storage/wa-auth`
- Auto reconnects when the socket disconnects
- Listens for incoming WhatsApp messages
- Ignores status broadcast messages
- Sends the message text to Gemini for a smart reply
- Replies automatically with a human-like Bangla/English tone
- Stores conversation history in MongoDB
- Prevents duplicate replies with a unique processed-message record
- Shows a dashboard with connection status, QR state, last message, and total handled messages

## Folder structure

- `app/page.jsx` - dashboard entry point
- `app/layout.jsx` - app shell and metadata
- `app/api/bot/status/route.js` - bot status endpoint
- `app/api/bot/start/route.js` - initialize the bot
- `components/dashboard/bot-dashboard.jsx` - dashboard UI
- `lib/mongodb.js` - MongoDB connection helper
- `lib/gemini.js` - Gemini reply generator
- `lib/whatsapp.js` - Baileys socket manager
- `lib/bot-store.js` - MongoDB bot state and conversation helpers
- `models/` - Mongoose models

## Install dependencies

Use `npm.cmd` on Windows PowerShell:

```bash
npm.cmd install @google/generative-ai @whiskeysockets/baileys mongoose pino qrcode
```

## Environment variables

Create a `.env.local` file from `.env.example`.

Required values:

- `MONGODB_URI`
- `GEMINI_API_KEY`

Optional values:

- `MONGODB_DB_NAME`
- `GEMINI_MODEL`
- `WHATSAPP_AUTH_DIR`
- `WHATSAPP_BOT_NAME`
- `APP_NAME`
- `DASHBOARD_TITLE`

## Run locally

```bash
npm.cmd run dev
```

Then open `http://localhost:3000`.

The bot will start automatically from the dashboard and generate a QR code when it needs pairing.

## Production setup on a VPS

1. Install Node.js 20+ and MongoDB access.
2. Clone the repo on the VPS.
3. Add `.env.local` with production values.
4. Install dependencies with `npm.cmd install` or `npm install` on Linux.
5. Build the app:

```bash
npm.cmd run build
```

6. Start the app with PM2:

```bash
pm2 start npm --name rantu-ai-bot -- run start
pm2 save
pm2 startup
```

7. Open the dashboard and scan the QR code from a real phone session.

## PM2 commands

```bash
pm2 status
pm2 logs rantu-ai-bot
pm2 restart rantu-ai-bot
pm2 stop rantu-ai-bot
pm2 delete rantu-ai-bot
```

## Troubleshooting

- If QR is not showing, confirm the bot has `MONGODB_URI` and `GEMINI_API_KEY` set correctly.
- If WhatsApp disconnects with `logged-out`, remove the local session folder in `storage/wa-auth` and scan again.
- If Gemini replies are failing, verify the API key and model name.
- If MongoDB writes fail, check network access and Atlas IP allowlist.
- If the dashboard shows stale status, restart the Node process and refresh the page.

## Security best practices

- Keep `.env.local` out of git.
- Protect the dashboard behind VPN, basic auth, or a reverse proxy auth layer in production.
- Do not expose the session folder publicly.
- Use a separate MongoDB user with the minimum required permissions.
- Rotate the Gemini API key if it is ever exposed.

## Vercel deploy

The dashboard and API routes can be deployed to Vercel, but the long-lived WhatsApp socket is not a good fit for serverless hosting.

If you still deploy the UI to Vercel:

1. Push the repo to GitHub.
2. Import it in Vercel.
3. Add the environment variables in the Vercel dashboard.
4. Deploy the app.

For a real WhatsApp bot, keep the socket running on a VPS with PM2 and use Vercel only for the dashboard if needed.

## Setup guide

1. Copy `.env.example` to `.env.local`.
2. Fill in `MONGODB_URI` and `GEMINI_API_KEY`.
3. Install dependencies.
4. Run `npm.cmd run dev`.
5. Open the dashboard and scan the QR code.
6. Send a WhatsApp message to test the auto reply.This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
