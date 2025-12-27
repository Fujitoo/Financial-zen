# Project Plan: Gemini-Powered "Financial Zen" Expense Tracker

## 1. Vision & Aesthetic Direction
**Concept:** "Financial Zen" — A hyper-modern, friction-free interface for personal finance.
**Aesthetic:** Dark mode default. Deep void backgrounds (#0a0a0a) with glowing, neon data visualizations (electric blue, signal green, alert orange). Translucent "glassmorphism" panels for depth.
**Interaction:** Fluid animations. Expenses aren't just "listed"; they flow into the ledger.

---

## Phase 1: Backend Architecture (The Foundation)
*Goal: Build a robust, AI-enriched API that handles data integrity and intelligence.*

### 1.1 Tech Stack Recommendation
*   **Runtime:** Node.js (TypeScript) or Python (FastAPI).
*   **Database:** PostgreSQL (for structured relational data) or MongoDB (if flexibility for AI metadata is preferred).
*   **AI Integration:** Google GenAI SDK (Gemini 2.5 Flash for speed, Pro for complex analysis).

### 1.2 Core Data Models
1.  **User:** `id`, `email`, `password_hash`, `preferences` (currency, theme).
2.  **Transaction:**
    *   `id`, `user_id`, `amount`, `currency`, `date`
    *   `category` (e.g., Food, Transport)
    *   `description` (raw input)
    *   `merchant`
    *   `is_recurring` (boolean)
    *   `tags` (Array)
    *   `ai_metadata` (JSON blob for storing Gemini's confidence score, original raw prompt, etc.)
3.  **Budget:** `user_id`, `category`, `limit_amount`, `period` (monthly/weekly).

### 1.3 Gemini AI Services
The backend will expose specific "Intelligence" endpoints:
1.  **Smart Parse (NLP):**
    *   *Input:* "Bought a latte and a croissant for $12 at Starbucks."
    *   *Gemini Task:* Extract `amount: 12`, `currency: USD`, `merchant: Starbucks`, `category: Dining`, `tags: ['breakfast']`.
2.  **Receipt Vision (Multimodal):**
    *   *Input:* Base64 Image of a receipt.
    *   *Gemini Task:* Extract line items, total, tax, and date.
3.  **Financial Coach (Chat/Analysis):**
    *   *Input:* Transaction history + User Query ("Why am I broke?").
    *   *Gemini Task:* Analyze patterns ("You spent 40% of your income on Uber eats").

### 1.4 API Endpoints Specification
*   **Auth:** `POST /auth/register`, `POST /auth/login`
*   **Transactions:**
    *   `GET /transactions` (Supports filters: date range, category)
    *   `POST /transactions` (Standard JSON creation)
    *   `POST /transactions/ai-parse` (Accepts raw text/audio transcript, returns structured JSON for confirmation)
    *   `POST /transactions/upload-receipt` (Accepts image, returns structured JSON)
*   **Analytics:**
    *   `GET /analytics/spending-by-category`
    *   `GET /analytics/monthly-trend`
*   **Budgets:** `GET /budgets`, `PUT /budgets/:id`

---

## Phase 2: Frontend Design & Architecture (The Experience)
*Goal: Create a distinctive, "Avant-Garde" interface that makes finance feel futuristic.*

### 2.1 Tech Stack
*   **Framework:** React 18+ (TypeScript).
*   **Build:** Vite.
*   **Styling:** Tailwind CSS (Strict usage, no external CSS files).
*   **Animation:** Framer Motion (for layout transitions and micro-interactions).
*   **Data Viz:** Recharts (customized heavily to look non-stock).
*   **State:** React Context + Hooks (or Zustand).

### 2.2 Key Interface Components

#### A. The "Command Center" (Dashboard)
*   **Visuals:** A Bento-grid layout.
*   **Hero Section:** Total Balance displayed in a massive, custom font (e.g., 'JetBrains Mono' or a custom variable font).
*   **The "Pulse" Chart:** A smoothing spline area chart showing spending velocity over the month, glowing against the dark background.
*   **Recent Activity:** A list that doesn't look like a spreadsheet. Each item is a floating card with a unique icon generated or selected based on category.

#### B. The "Magic Input" Bar (Sticky Bottom)
*   *Design:* A floating, glowing input bar (resembling a command palette or Spotlight search).
*   *Function:* The user never manually selects dates or categories. They just type: "Dinner $40 yesterday".
*   *UX:* As the user types, the UI pushes down "suggested" structured data (Real-time preview).

#### C. Smart Receipt Scanner
*   *UX:* Drag & drop zone that triggers a "scanning" animation (grid lines scanning across the image).
*   *Interaction:* Once scanned, the receipt turns into editable fields with a "confidence" indicator.

#### D. "Money Talks" (AI Chat Interface)
*   *Design:* A slide-over panel or dedicated view.
*   *Vibe:* Minimalist chat interface. Responses from Gemini are formatted with rich UI widgets (e.g., if Gemini says "You spent too much on coffee," it renders a mini bar chart embedded in the chat bubble).

### 2.3 Implementation Steps (Frontend)
1.  **Setup & Theming:** Define the `tailwind.config.js` with specific color palettes (Void Black, Neon Blue, Alert Red). Setup typography.
2.  **API Integration Layer:** Create typed services (`geminiService.ts`, `transactionService.ts`) to talk to your Backend.
3.  **Core Components:** Build the "Magic Input" first, as it's the core differentiator.
4.  **Dashboard Construction:** Assemble the Bento grid.
5.  **Visualization:** Implement the charts with animation on entry.

---

## Execution Order
1.  **User:** Code the Backend APIs & Database connections.
2.  **User:** Test endpoints with Postman/Curl (especially the AI parsing).
3.  **AI (Me):** I will then generate the React frontend to consume these specific endpoints, focusing heavily on the visual flair and animations described above.
