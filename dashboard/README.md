# Lead Rescue — Client dashboard

Next.js 15 (App Router) + Tailwind 4 + Supabase Auth. Each client logs in and only sees its own data (Row Level Security).

## Setup

```bash
cp .env.local.example .env.local   # fill in Supabase URL + anon/publishable key
npm install
npm run dev                         # http://localhost:3000
```

## Screens

- `/appels` — missed calls, filters, AI summary, chat answers, CRM link, called-back, outcome (quote / won / lost) with "money saved" counter
- `/matin`, `/message`, `/questions` — coming next
