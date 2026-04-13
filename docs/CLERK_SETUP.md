# Clerk Authentication Setup

## 1. Create Clerk Account

1. Go to [clerk.com](https://clerk.com) and sign up
2. Create a new application
3. Name it "Proxidex"

## 2. Configure Google OAuth

1. In Clerk Dashboard → Authentication → Social Connections
2. Enable **Google**
3. Copy the Client ID and Client Secret (Clerk provides these for development)
4. For production, you'll need to create your own Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a project → APIs & Services → Credentials
   - Create OAuth 2.0 Client ID
   - Add authorized redirect: `https://your-domain.com/api/auth/callback`

## 3. Add Environment Variables

Add these to your `.env.local` and Vercel:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/signin
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/signin
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

Get these from Clerk Dashboard → API Keys

## 4. Setup Database Table

Run the migration to create the user_exports table:

```bash
npx tsx scripts/setup-exports-table.ts
```

## 5. Test the Flow

1. Start dev server: `npm run dev`
2. Add some cards to your deck
3. Click "Sign in to Export"
4. Complete Google OAuth
5. You should see "1 export remaining today"
6. Export once → should show "0 exports remaining"
7. Try to export again → should see upgrade dialog

## Customization

### Change Daily Limit

Edit `lib/exports.ts`:
```typescript
const FREE_TIER_DAILY_LIMIT = 3  // Change from 1
```

### Pro Tier Check

Currently hardcoded to `false`. Connect to your payment provider (Stripe) in:
- `app/api/exports/check/route.ts`
- `app/api/exports/remaining/route.ts`

Replace `const isPro = false` with actual user tier lookup.
