# WaBot AI

WhatsApp Business automation platform with AI-powered auto-replies, bulk messaging campaigns, and contact management.

## Features

- WhatsApp Web connection via QR code scan
- AI auto-reply with customizable training data
- Bulk message campaigns with delay controls
- Contact & group management
- Message template builder with media support
- Session backup/restore via Supabase storage
- Real-time connection status dashboard

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Backend:** Node.js, whatsapp-web.js (Puppeteer)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- Google Chrome or Chromium (for WhatsApp Web)

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL="your-supabase-project-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET="template-images"
```

## Database Setup

1. Go to your Supabase Dashboard → SQL Editor
2. Run the contents of `database-setup.sql`
3. This creates all tables, RLS policies, storage buckets, and default settings

## Local Development

```bash
# Install dependencies
npm install

# Start both Next.js dev server and WhatsApp worker
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The WhatsApp worker starts alongside the dev server. Scan the QR code displayed in the terminal with WhatsApp to connect.

## Production

```bash
# Build the app first
npm run build

# Start production server + worker
npm run start
```

> **Important:** Always run `npm run build` before `npm run start`. Production mode uses significantly less RAM than dev mode.

### Running separately

```bash
# Next.js only
npm run start:web

# Worker only
npm run start:worker
```

## Deploy on Render

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Create a Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name:** `wabot-ai`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Instance Type:** Starter or higher (Puppeteer needs ~512MB RAM)

### 3. Add Environment Variables

In Render dashboard → **Environment** tab, add:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | `template-images` |
| `CHROME_PATH` | `/usr/bin/google-chrome-stable` |

### 4. Deploy

Click **Create Web Service**. Render will build and deploy automatically.

> **Note:** The first deploy may take a few minutes due to Puppeteer/Chromium installation.

## Project Structure

```
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── page.tsx          # Dashboard
│   │   ├── contacts/         # Contact management
│   │   ├── templates/        # Message templates
│   │   ├── broadcast/        # Campaign management
│   │   ├── ai-training/      # AI training data
│   │   ├── settings/         # Bot settings
│   │   └── login/            # Auth page
│   ├── components/           # React components
│   └── lib/                  # Supabase client, utilities
├── worker.js                 # WhatsApp bot worker (runs separately)
├── database-setup.sql        # Full database schema
└── package.json
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server + worker |
| `npm run build` | Build Next.js for production |
| `npm run start` | Start production server + worker |
| `npm run start:web` | Start Next.js production server only |
| `npm run start:worker` | Start WhatsApp worker only |
| `npm run lint` | Run ESLint |

## task kill 
taskkill /F /IM chrome.exe 2>$null; taskkill /F /IM chromium.exe 2>$null
## License

Private
