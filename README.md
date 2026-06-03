# PaperTrail 🗂️

> Your documents, your device. Upgrade when you're ready.

PaperTrail is a **local-first digital filing cabinet** for iOS and Android. Capture, organize, and retrieve any document instantly — receipts, contracts, IDs, warranties, tax docs, medical records — stored privately on your device by default. No account required.

---

## Philosophy

**Free feels generous.** PaperTrail is fully functional offline with no account required. Your documents never leave your device unless you choose to sync. Upgrade to Pro for cloud sync, AI organization, and sharing.

> *“PaperTrail is free if you store documents on your own device. Upgrade when you want smart cloud sync, AI organization, and sharing.”*

---

## Features

### Free (Local-First)
- 📄 Unlimited local documents
- 📁 Custom folders + tags
- 🔍 On-device OCR (Apple Vision / ML Kit) — *Phase 2*
- 🔎 Full-text search — filenames + OCR text
- 🔔 Manual reminders — *Phase 4*
- 🔒 Biometric lock (Face ID / Touch ID) — *Phase 5*
- 📤 Export anytime (PDF, ZIP, share sheet) — *Phase 5*
- 💬 Comments on any document — *Phase 3*
- 🏥 Document health score (local) — *Phase 4*
- 📴 No account required — fully offline

### Pro (~$4.99–6.99/mo or $39.99/yr)
- ☁️ Encrypted cloud sync + multi-device
- 📧 Email-to-vault (`@papertrail.app` forwarding)
- 🤖 AI auto-naming
- 🗾️ AI auto-categorization
- ⏰ Expiry detection (IDs, warranties, insurance)
- 👥 Shared vaults (family / business)
- 🔗 Secure sharing (time-limited, password-protected)
- 🧧 Accountant export (one-tap tagged doc export)
- 🗣️ Natural-language search (“find my car insurance from last year”)
- 💰 Spending analytics (by vendor, category, month)
- 🏥 Document health score (enhanced, cross-device)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native (Expo ~52) |
| Navigation | Expo Router v4 |
| Local DB | Expo SQLite (WAL + FTS5) |
| State | Zustand v5 |
| On-device OCR | Apple Vision (iOS) / ML Kit (Android) |
| Cloud Storage | Cloudflare R2 (Pro) |
| Auth | Supabase (Pro) |
| AI Features | OpenAI / Claude API (Pro) |
| Backend | Node.js / Fastify (Pro features) |

---

## Project Structure

```
papertrail/
├── mobile/                    # React Native (Expo) app
│   ├── app/                   # Expo Router screens
│   │   ├── _layout.tsx        # Root layout (DB init, splash)
│   │   ├── (tabs)/            # Bottom tab navigator
│   │   │   ├── index.tsx      # Vault (document list)
│   │   │   ├── folders.tsx    # Folder management
│   │   │   ├── search.tsx     # Full-text search
│   │   │   └── settings.tsx   # App settings + Pro upsell
│   │   ├── document/[id].tsx  # Document detail
│   │   └── folder/[id].tsx    # Folder detail
│   ├── components/            # Reusable UI components
│   │   ├── DocumentCard.tsx   # List card with category strip
│   │   ├── CategoryBadge.tsx  # Pill badge for doc types
│   │   ├── EmptyState.tsx     # Empty list placeholder
│   │   ├── FAB.tsx            # Floating action button
│   │   └── TabIcon.tsx        # Bottom tab icons
│   ├── services/
│   │   └── db.ts              # SQLite service (CRUD + FTS5 search)
│   ├── store/
│   │   ├── documentStore.ts   # Zustand — documents, folders, tags
│   │   └── settingsStore.ts   # Zustand — app settings
│   ├── theme/
│   │   └── tokens.ts          # Colors, typography, spacing, radius
│   ├── types/
│   │   └── document.ts        # TypeScript types for all entities
│   └── utils/
│       └── format.ts          # File size, date helpers
├── backend/                   # Pro-tier API (Node/Fastify) — Phase 6+
└── docs/                      # Architecture & planning docs
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- [Expo CLI](https://docs.expo.dev/get-started/installation/): `npm install -g expo-cli`
- iOS Simulator (Xcode) or Android Emulator (Android Studio), or the [Expo Go](https://expo.dev/client) app

### Install & Run

```bash
# Clone the repo
git clone https://github.com/mrnickrushing/Papertrail.git
cd Papertrail/mobile

# Install dependencies
npm install

# Start the dev server
npx expo start
```

Press `i` for iOS simulator, `a` for Android emulator, or scan the QR code with Expo Go.

### Environment Variables (Pro features only)

```bash
cp .env.example .env
# Fill in Supabase + API keys for Pro cloud features
```

The free local-first tier works with zero environment variables.

---

## Database

PaperTrail uses **Expo SQLite** with WAL mode and FTS5 full-text search. The schema is initialized automatically on first launch via `services/db.ts`.

| Table | Purpose |
|---|---|
| `documents` | All document metadata + OCR text |
| `documents_fts` | FTS5 virtual table for full-text search |
| `folders` | Folder tree |
| `tags` | Tag library |
| `document_tags` | Many-to-many join |
| `document_comments` | Per-document comments |

All queries use parameterized statements. No raw string interpolation.

---

## Development Phases

| Phase | Branch | Status | Scope |
|---|---|---|---|
| 1 | `phase/1-foundation` | ✅ **Done** | Project setup, navigation, theme, local DB |
| 2 | `phase/2-capture` | ⏳ Next | Camera scan, photo import, PDF upload, OCR |
| 3 | `phase/3-organize` | — | Folders, tags, search, comments |
| 4 | `phase/4-reminders` | — | Manual reminders, expiry alerts, health score |
| 5 | `phase/5-export` | — | PDF export, ZIP, share sheet, biometric lock |
| 6 | `phase/6-pro-cloud` | — | Cloud sync, auth, email-to-vault, multi-device |
| 7 | `phase/7-pro-ai` | — | AI naming, categorization, expiry detection, NL search |
| 8 | `phase/8-pro-sharing` | — | Shared vaults, secure links, accountant export |
| 9 | `phase/9-analytics` | — | Spending analytics, enhanced health score |
| 10 | `phase/10-polish` | — | Animations, onboarding, widgets, App Store prep |

---

## Contributing

All feature work happens on `phase/*` branches. PRs merge into `main` at the end of each phase.

---

## License

MIT
