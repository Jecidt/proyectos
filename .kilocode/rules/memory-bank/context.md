# Active Context: JecidtSebasBoost Pro

## Current State

**Template Status**: ✅ Production-ready Instagram followers service

The project is a full Instagram followers service branded as **JecidtSebasBoost Pro**, built on Next.js 16 + TypeScript + Tailwind CSS 4.

## Recently Completed

- [x] Base Next.js 16 setup with App Router
- [x] TypeScript configuration with strict mode
- [x] Tailwind CSS 4 integration
- [x] ESLint configuration
- [x] Memory bank documentation
- [x] Recipe system for common features
- [x] Bot Account Manager system (generate, purchase, user lookup)
- [x] Instagram Followers Service storefront (packages, checkout, receipt, order lookup)
- [x] Admin panel at /admin (password-protected, bot management, order tracking, anti-ban guide)
- [x] New API routes: /api/orders (create/lookup orders), /api/admin (admin data + delete/patch bots)
- [x] Safe bot creation limits and anti-ban tips built into the system
- [x] **Brand rename**: "InstaBoost Pro" → "JecidtSebasBoost Pro" across all files
- [x] **Enhanced data models**: BotAccount now has `platform`, `verificationStatus`, `userAgent`, `followsToday`, `totalFollowsDelivered`, `lastUsedAt`; Order now has `paymentMethod`, `deployedAt`, `deliveryTime`; new `banned` and `pending_verification` bot statuses
- [x] **Improved StoreFront**: "MEJOR VALOR" badge for Viral package, "How it works" section, footer, updated receipt prefix (JSB-), lookup updated for JSB- prefix
- [x] **Improved AdminPanel**: Expandable bot rows showing password/userAgent/proxy/stats, "Mark as banned" action, `processingOrders` + `bannedBots` stats, architecture guide in Anti-Ban tab
- [x] **Stock-based delivery model**: Orders use `botsRequired` (not `followers` count) for bot assignment; bots track `followsToday` and `totalFollowsDelivered`
- [x] **New PATCH /api/admin**: Update bot status (e.g., mark as banned)
- [x] Receipt code prefix changed from `IG-` to `JSB-`
- [x] **Real Instagram automation**: Puppeteer-based bot registration (`registerInstagramAccount`) and following (`followInstagramUser`, `batchFollowUser`) in `src/lib/instagram.ts`
- [x] **SQLite persistence**: `better-sqlite3` database at `data/jecidtsebasboost.db` via `src/lib/db.ts` — survives server restarts
- [x] **Background job queue**: `src/lib/jobQueue.ts` processes follow orders asynchronously, resumes on restart via `src/instrumentation.ts`
- [x] **Real registration toggle**: Admin panel has toggle for "Registro Real" (Puppeteer) vs "Modo Simulado" (instant, for testing)
- [x] **Queue status in admin**: Dashboard and Orders tab show live queue status (jobs in progress, target usernames)
- [x] **Bot notes & IG User ID**: Bots now store `igUserId` (from Instagram cookies) and `notes` (registration errors)

## Current Structure

| File/Directory | Purpose | Status |
|----------------|---------|--------|
| `src/app/page.tsx` | Home page → StoreFront | ✅ Ready |
| `src/app/admin/page.tsx` | Admin panel | ✅ Ready |
| `src/app/layout.tsx` | Root layout (JecidtSebasBoost Pro title) | ✅ Ready |
| `src/app/globals.css` | Global styles | ✅ Ready |
| `src/components/StoreFront.tsx` | Customer-facing store | ✅ Ready |
| `src/components/AdminPanel.tsx` | Admin UI | ✅ Ready |
| `src/lib/store.ts` | In-memory data store + models | ✅ Ready |
| `src/app/api/orders/route.ts` | Order creation + lookup | ✅ Ready |
| `src/app/api/admin/route.ts` | Admin data + bot management | ✅ Ready |
| `src/app/api/bots/generate/route.ts` | Bot generation | ✅ Ready |
| `.kilocode/` | AI context & recipes | ✅ Ready |

## Key Data Models

### BotAccount
```ts
{
  id, platform, igUsername, email, password,
  phoneNumber?, userAgent, verificationStatus,
  createdAt, lastUsedAt?, status,
  proxy?, followsToday, totalFollowsDelivered, notes?
}
```

### Order
```ts
{
  id, igUsername, packageId, packageName,
  followers, price, status, paymentMethod,
  createdAt, deployedAt?, deliveredAt?,
  botsUsed, receiptCode, deliveryTime, notes?
}
```

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/orders` | POST | Create order (stock-based bot assignment) |
| `/api/orders` | GET | Lookup by `igUsername` or `receiptCode` |
| `/api/admin` | GET | Full admin data (password required) |
| `/api/admin` | DELETE | Delete bot by ID |
| `/api/admin` | PATCH | Update bot status (e.g., mark banned) |
| `/api/bots/generate` | POST | Generate bot accounts (max 20/batch) |

## Session History

| Date | Changes |
|------|---------|
| Initial | Template created with base setup |
| Session 2 | Bot Account Manager + Instagram Followers Service + Admin Panel |
| Session 3 | Brand rename to JecidtSebasBoost Pro + enhanced data models + improved UI + stock-based delivery |
