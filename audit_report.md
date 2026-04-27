# BOQ Pro Audit Report

## Executive summary

The repo has two confirmed critical security problems: secrets are committed to source control, and AI provider keys are used directly from the browser. There are also high-risk server/API issues around unauthenticated email sending and user-supplied API keys being stored in Firestore while the UI claims they are local-only.

Outside security, the main improvement areas are maintainability and product polish: the workspace is a very large monolith, there are no automated tests, large generated/debug artifacts are committed, and some assets/components appear unfinished.

## Critical findings

### 1. Committed secrets and client-exposed environment variables

- Evidence:
  - `.env` is tracked in git (`git ls-files .env`).
  - [`.env`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\.env:3) contains `VITE_GEMINI_API_KEY`.
  - [`.env`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\.env:6) and [`.env`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\.env:7) contain Supabase URL and anon key.
  - [README.md](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\README.md:34) instructs deployment with `VITE_OPENAI_API_KEY`.
- Impact:
  - These values are publicly recoverable from git history and browser bundles.
  - Anyone can reuse AI credentials and burn quota.
- Fix:
  - Rotate exposed keys immediately.
  - Remove `.env` from repo history.
  - Move all secret AI/email credentials to server-only env vars.

### 2. OpenAI and Gemini are called directly from the browser

- Evidence:
  - [`src/utils/aiService.js`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\src\utils\aiService.js:11) and [`src/utils/aiService.js`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\src\utils\aiService.js:12) read `VITE_GEMINI_API_KEY` and `VITE_OPENAI_API_KEY`.
  - [`src/utils/aiService.js`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\src\utils\aiService.js:62) and [`src/utils/aiService.js`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\src\utils\aiService.js:178) instantiate OpenAI with `dangerouslyAllowBrowser: true`.
  - Browser components import and use this helper directly:
    - [`src/components/workspace/RateAnalysisModal.jsx`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\src\components\workspace\RateAnalysisModal.jsx:19)
    - [`src/components/workspace/DrawingAnalyzer.jsx`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\src\components\workspace\DrawingAnalyzer.jsx:16)
    - [`src/components/workspace/StructuralAnalyzer.jsx`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\src\components\workspace\StructuralAnalyzer.jsx:16)
- Impact:
  - API keys are exposed to every client.
  - No reliable server-side rate limiting, abuse detection, or prompt validation.
- Fix:
  - Replace `src/utils/aiService.js` network calls with server endpoints.
  - Reuse the server-side helper already present in the separate local folder (`api/_lib/ai-provider.js`) or implement equivalent routes in this repo.

## High findings

### 3. User-entered API keys are stored in Firestore, not locally

- Evidence:
  - The settings UI loads and saves API keys through Firestore-backed settings:
    - [`src/components/dashboard/Settings.jsx`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\src\components\dashboard\Settings.jsx:81)
    - [`src/components/dashboard/Settings.jsx`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\src\components\dashboard\Settings.jsx:104)
  - `saveSetting` writes arbitrary setting values into the `settings` collection:
    - [`src/db/database.js`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\src\db\database.js:428)
    - [`src/db/database.js`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\src\db\database.js:434)
  - The UI tells users their keys are local-only:
    - [`src/components/dashboard/Settings.jsx`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\src\components\dashboard\Settings.jsx:523)
- Impact:
  - Users may enter third-party secret keys under a false assumption.
  - Those keys become cloud-stored application data.
- Fix:
  - Remove BYO secret storage from the client entirely, or encrypt/store it on a trusted backend with strict auth.
  - Update the UI copy immediately so it reflects reality.

### 4. `/api/send-report` can send mail without any authentication or abuse controls

- Evidence:
  - [`api/send-report.js`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\api\send-report.js:15) accepts any POST request.
  - [`api/send-report.js`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\api\send-report.js:23) uses the server-side Resend key.
  - [`api/send-report.js`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\api\send-report.js:33) trusts caller-supplied `to`, `projectName`, `totalValue`, and `attachments`.
- Impact:
  - If deployed publicly, this endpoint can be abused as a mail-sending relay and cost center.
- Fix:
  - Require authenticated users.
  - Add per-user and per-IP rate limiting.
  - Enforce attachment size/type limits and recipient restrictions.

## Medium findings

### 5. Paystack server endpoints are public and permissive

- Evidence:
  - Shared API helper enables wildcard CORS:
    - [`api/_lib/http.js`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\api\_lib\http.js:3)
  - Subscription init accepts caller-supplied `email` and `userId` with no requester auth:
    - [`api/paystack-initialize-subscription.js`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\api\paystack-initialize-subscription.js:12)
    - [`api/paystack-initialize-subscription.js`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\api\paystack-initialize-subscription.js:24)
  - Subscription verify accepts a reference and updates profiles server-side:
    - [`api/paystack-verify-subscription.js`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\api\paystack-verify-subscription.js:13)
    - [`api/paystack-verify-subscription.js`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\api\paystack-verify-subscription.js:45)
    - [`api/_lib/subscriptionSync.js`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\api\_lib\subscriptionSync.js:41)
- Impact:
  - This broadens the attack surface for payment workflow abuse and makes the backend trust unverified caller context too much.
- Fix:
  - Require authenticated callers for initialize/verify.
  - Derive `userId` from verified auth, not request body.
  - Narrow CORS to trusted origins only.

### 6. Dependency audit shows unresolved critical/high advisories

- Evidence:
  - `npm audit --omit=dev --json` reported:
    - Critical: `jspdf`
    - Critical: `protobufjs`
    - High: `minimatch`
  - Direct dependency lines include:
    - [`package.json`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\package.json:19)
    - [`package.json`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\package.json:21)
    - [`package.json`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\package.json:27)
- Impact:
  - Export and parsing features may be exposed to known vulnerabilities.
- Fix:
  - Upgrade vulnerable libraries and re-test export/import flows.
  - Change CI from `npm install` to `npm ci`.

## Maintainability and product issues

### 7. The workspace is a monolith

- Evidence:
  - [`src/components/workspace/BOQWorkspace.jsx`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\src\components\workspace\BOQWorkspace.jsx:1) is 6,925 lines / 264,520 bytes.
  - Other very large components include:
    - `src/components/workspace/MaterialLibrary.jsx` (86,433 bytes)
    - `src/components/landing/Pricing.jsx` (58,269 bytes)
    - `src/components/workspace/BOQSelectionStage.jsx` (56,840 bytes)
- Impact:
  - Hard to reason about, test, and safely change.
- Fix:
  - Split workspace into table, toolbar, AI panel, export layer, and state hooks/context.

### 8. No automated tests were found

- Evidence:
  - No `*.test.*`, `*.spec.*`, Jest, Vitest, or Playwright config files were found.
  - CI only runs lint:
    - [`.github/workflows/lint.yml`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\.github\workflows\lint.yml:18)
- Impact:
  - Refactors in pricing, export, or subscriptions are high-risk.
- Fix:
  - Add smoke tests for auth, project save/load, subscription flow, PDF/Excel export, and AI result handling.

### 9. Debug artifacts and unfinished files are committed

- Evidence:
  - Tracked artifacts include:
    - `build_error_output.txt`
    - `build_output.txt`
    - `build_output_2.txt`
    - `catch-error.js`
    - `detail_panel_styles.css`
    - `inspect_layout.py`
    - `patch-picker.cjs`
    - `patch-workspace.cjs`
    - `patch2.py`
    - `patch_workspace_ui.py`
  - Empty component:
    - [`src/components/workspace/GradientGenerator.jsx`](c:\Users\olaji\Desktop\Help\hassan odunayo\BOQ-pro-audit\src\components\workspace\GradientGenerator.jsx:1)
- Impact:
  - Adds noise, increases onboarding cost, and signals unresolved architecture debt.
- Fix:
  - Delete or relocate one-off repair/debug scripts.
  - Clean tracked artifacts from the repo.

### 10. PWA assets are oversized

- Evidence:
  - `public/pwa-192x192.png` is 637,347 bytes.
  - `public/pwa-512x512.png` is 637,347 bytes.
- Impact:
  - Unnecessarily heavy downloads for installable app assets.
- Fix:
  - Re-export or compress icons to practical sizes.

## Best contribution areas

### Security-first branch

1. Remove committed secrets and rotate affected keys.
2. Move AI traffic behind server endpoints.
3. Lock down `/api/send-report` and Paystack endpoints.
4. Stop storing API secrets in Firestore from the browser.

### Product / architecture branch

1. Break up `BOQWorkspace.jsx`.
2. Add tests around export, pricing, and subscriptions.
3. Clean repo artifacts and dead files.
4. Normalize settings and API flows so there is one clear backend path.

### Design / UX branch

1. Build a small design system for forms, tables, modals, and status badges.
2. Rework the Settings page so “Professional API” and billing/security are clearer.
3. Optimize PWA assets and landing page performance.

