<div align="center">
  <h1>R3ZON Business OS 🚀</h1>
  <p>
    <strong>A next-generation, high-performance Business Operating System.</strong>
    <br />
    <em>0€ Server Architecture • Client-Side Processing • Multi-Tenant • Glassmorphism UI</em>
  </p>
  <p>
    <a href="#features">Features</a> •
    <a href="#architecture">Architecture</a> •
    <a href="#progress-tracker-for-ai">Progress Tracker</a> •
    <a href="#getting-started">Getting Started</a>
  </p>
</div>

---

## 🌟 About The Project

**R3ZON Business OS** is a cutting-edge, enterprise-grade CRM and Business Operating System built for modern teams. Designed with a revolutionary **0€ server philosophy**, all heavy processing (like OCR and data parsing) is handled seamlessly on the client side. 

Coupled with a pristine, highly-responsive **Glassmorphism UI** and backed by the sheer power of **Next.js 14** and **Supabase**, R3ZON delivers an unparalleled user experience while keeping infrastructure costs non-existent.

---

## ✨ Features

### 🚀 Completed Features
- **Next.js 14 App Router:** State-of-the-art routing and rendering.
- **True Multi-Tenancy:** Automatic business profile mapping per `auth.users`.
- **Zero-Config RLS:** Row Level Security enforced at the database level; the frontend never filters manually.
- **Premium UI/UX:** Custom design tokens (cyan/fuchsia/indigo), glassmorphism effects, and tactile 56px buttons.
- **Responsive AppShell:** Adaptive grid for desktop and smooth drawer navigation for mobile.
- **Core Modules Scaffolding:** Dashboard, Clientes, Citas, Tareas, and Finanzas routing and basic views.
- **End-to-End Encryption Prep:** Integration with `pgcrypto` for secure symmetric `config_keys`.

### 🏗️ In Development & Planned
- **Client-Side OCR (`/ocr`):** Local document scanning using Tesseract.js directly in the browser.
- **RGPD Compliance Module (`/rgpd`):** Comprehensive privacy and data control center.
- **Capacitor Mobile Build:** Native iOS and Android application generation via `npx cap`.
- **Advanced Financial Analytics:** Real-time charts and income/expense tracking.
- **Automated Appointment Reminders:** Webhook/Edge function integration for client notifications.

---

## 🛠️ Architecture & Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Mobile Ready:** [Capacitor](https://capacitorjs.com/) (Output: export)

---

## 📝 Progress Tracker (For AI Context)

> **Note for AI (Claude/Gemini):** Please update this checklist progressively as new features are completed, bugs are fixed, or new requirements are added.

### ✅ Done
- [x] Setup Next.js 14 project with Tailwind and TypeScript.
- [x] Define global design tokens (`globals.css`, `tailwind.config.ts`).
- [x] Implement database schema with Multi-tenant RLS (`schema.sql`).
- [x] Set up Supabase SSR & Browser clients.
- [x] Create core AppShell and Sidebar layout components.
- [x] Create base pages (`/dashboard`, `/clientes`, `/citas`, `/tareas`, `/finanzas`, `/ocr`, `/rgpd`, `/ajustes`).
- [x] Install local dependencies and resolve peer dependency conflicts.
- [x] Run local dev server successfully.

### ⏳ To Do (Current & Next Steps)
- [ ] Flesh out the `/dashboard` UI with real mock data and charts.
- [ ] Implement CRUD functionality for the `/clientes` module.
- [ ] Build the calendar interface for the `/citas` module.
- [ ] Integrate `tesseract.js` in the `/ocr` module and test client-side performance.
- [ ] Implement user settings and profile management in `/ajustes`.
- [ ] Prepare the project for static export (`output: export`) and test the Capacitor build (`cap:sync`).
- [ ] Write E2E testing for the main user flows.

---

<div align="center">
  <i>Built with ❤️ for modern businesses.</i>
</div>
