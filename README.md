## Setup

This app requires a Supabase project. Before starting the dev server, create a local env file:

```bash
cp .env.example .env.local
```

Then fill in these values from your Supabase project's Connect panel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

If your project still uses the legacy public key name, `NEXT_PUBLIC_SUPABASE_ANON_KEY` also works.

## Getting Started

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing

Run the Playwright suite with:

```bash
npm test
```

CI also expects `NEXT_PUBLIC_VAPID_PUBLIC_KEY` for push-notification coverage.
