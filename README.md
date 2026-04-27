# BOQ Pro - Professional Bill of Quantities Management

## Live Demo

[View Live Application](#) *(Link will be available after Vercel deployment)*

## Overview

BOQ Pro is a professional-grade Bill of Quantities management platform designed for civil engineering practitioners. Built with modern cloud infrastructure and premium UI/UX design.

### Key Features

- Cloud-native architecture for project workflows
- Professional authentication and verification flow
- AI-assisted rate analysis, summaries, and drawing review
- Project creation, storage, and collaboration tools
- Export capabilities for Excel and PDF reports
- Electron support for desktop packaging

## Tech Stack

- Frontend: React 19 + Vite
- AI: OpenAI by default, Gemini as fallback
- Email: Resend
- Data: Firebase + local sync
- Desktop: Electron

## Deployment

This application is set up for GitHub to Vercel deployment. OpenAI is the default AI provider for deployed environments.

### Vercel Environment Variables

- `OPENAI_API_KEY` - Required. Primary AI provider for BOQ analysis and drawing workflows.
- `OPENAI_MODEL` - Optional. Defaults to `gpt-4o`.
- `GEMINI_API_KEY` - Optional. Used only as a fallback if OpenAI is unavailable.
- `RESEND_API_KEY` - Required if you want report emails from the `/api/send-report` endpoint.
- `RESEND_FROM_EMAIL` - Optional sender address for Resend.
- `VITE_PAYSTACK_PUBLIC_KEY` - Frontend Paystack public key used to enable the checkout flow.
- `PAYSTACK_SECRET_KEY` - Backend Paystack secret key for transaction initialize / verify / webhook.
- `PAYSTACK_PLAN_CODE_*` - Paystack recurring plan codes for each paid BOQ Pro tier and billing cycle.
- `FIREBASE_PROJECT_ID` - Firebase project id used by the secure subscription API routes.
- `FIREBASE_SERVICE_ACCOUNT_EMAIL` - Firebase service account email for secure profile updates from API routes.
- `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY` - Firebase service account private key for secure profile updates from API routes.
- `VITE_PAYSTACK_API_BASE_URL` - Optional base URL if the frontend is calling API routes on another origin.
- `ALLOWED_ORIGINS` - Optional comma-separated allowlist for cross-origin browser requests to `/api` endpoints.

### Vercel Setup

1. Import the GitHub repository into Vercel.
2. Add the environment variables above in the Vercel project settings.
3. Redeploy the project so the new server-side AI defaults are available in production.

## Paystack Subscription Flow

BOQ Pro now uses a verified Paystack flow instead of client-only plan activation:

1. Signed-in user chooses a paid plan.
2. The frontend calls `/api/paystack-initialize-subscription`.
3. The Vercel API route uses `PAYSTACK_SECRET_KEY` to create the checkout session.
4. The frontend opens the hosted Paystack checkout and polls `/api/paystack-verify-subscription`.
5. After Paystack verification succeeds, the API route updates the Firebase `profiles` document with the normalized subscription payload.
6. `POST /api/paystack-webhook` keeps renewals, failed invoices, and cancellation events in sync.

### Important security rule

Keep the Paystack secret key and Firebase service account credentials in Vercel or server-only environment variables. Do not place them in `src/`, `.env` committed to GitHub, or any client-side settings screen.

## Contact

For investment inquiries or technical questions, please reach out through the repository.

© 2026 BOQ Pro - Professional Bill of Quantities Management
