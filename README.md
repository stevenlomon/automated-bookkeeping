# Automated Bookkeeping Assistant

Automates supplier invoice processing for Visma eAccounting. Drop a PDF invoice, get a proposed voucher with the right BAS accounts, approve it into the general ledger.  
Built using Claude Code with me Steven as the human-in-the-loop having at least done the first manual OAuth flow haha

## How it works

1. Upload a PDF invoice (Swedish or English)
2. Text is extracted via `pdf-parse`, then structured by Claude into supplier name, date, amounts, and VAT
3. The matching engine looks up historical vouchers from Visma to find the correct expense account for that supplier
4. A balanced double-entry voucher draft is proposed for review
5. On approval, the voucher is posted to Visma eAccounting

## Setup

```bash
pnpm install
cp .env.local.example .env.local
# Fill in the values, then:
pnpm dev
```

### Environment variables

| Variable | Description |
|---|---|
| `VISMA_CLIENT_ID` | OAuth2 client ID from Visma developer portal |
| `VISMA_CLIENT_SECRET` | OAuth2 client secret |
| `VISMA_REDIRECT_URI` | Must match what's registered with Visma |
| `ANTHROPIC_API_KEY` | For invoice text extraction via Claude |
| `APP_PASSWORD` | Shared password for the login gate |

## Project structure

```
src/
  lib/
    visma/
      auth.ts       Token management (OAuth2, auto-refresh)
      client.ts     Visma API client (vouchers, drafts, convert)
      config.ts     API endpoints and scopes
      types.ts      Shared TypeScript interfaces
    parser/
      index.ts      PDF text extraction
      extract.ts    Claude-powered field extraction
      types.ts      InvoiceData interface
    matcher/
      index.ts      Supplier-to-account mapping from historical vouchers
  app/
    page.tsx        Review UI (upload, preview, approve)
    proxy.ts        Password gate
    api/
      auth/visma/   OAuth2 flow (initiate, callback, status)
      invoices/     Process and approve endpoints
      parse/        Standalone PDF parsing endpoint
```

## Tech stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS
- Visma eAccounting API (OAuth2)
- Anthropic Claude API (invoice extraction)
- pdf-parse (PDF text extraction)
