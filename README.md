# Presensi - Smart Facial Recognition Attendance

Next.js 14 App Router attendance system with CCTV-style scanner UI, Prisma-backed API, reporting dashboard, and XLSX/PDF export.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment:
   ```bash
   DATABASE_PROVIDER="sqlite"
   DATABASE_URL="file:./dev.db"
   ```
   You can switch to PostgreSQL by setting `DATABASE_PROVIDER="postgresql"` and a PostgreSQL `DATABASE_URL`.
3. Generate Prisma client:
   ```bash
   npm run prisma:generate
   npm run prisma:db:push
   ```
4. Run development server:
   ```bash
   npm run dev
   ```

## Face Models

Add face-api model files into `/public/models` (see `/public/models/README.md`).
If models are missing, scanner runs in fallback mode with manual attendance submission.

## Routes

- `/` Scanner UI
- `/dashboard` Admin dashboard
- `/api/attendance` Attendance GET/POST
- `/api/notify` Simulated WhatsApp notification link generator
