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

- `VITE_OPENAI_API_KEY` - Required. Primary AI provider for BOQ analysis and drawing workflows.
- `VITE_OPENAI_MODEL` - Optional. Defaults to `gpt-4o`.
- `VITE_GEMINI_API_KEY` - Optional. Used only as a fallback if OpenAI is unavailable.
- `RESEND_API_KEY` - Required if you want report emails from the `/api/send-report` endpoint.
- `RESEND_FROM_EMAIL` - Optional sender address for Resend.

### Vercel Setup

1. Import the GitHub repository into Vercel.
2. Add the environment variables above in the Vercel project settings.
3. Redeploy the project so the new OpenAI defaults are available in production.

## Contact

For investment inquiries or technical questions, please reach out through the repository.

© 2026 BOQ Pro - Professional Bill of Quantities Management
