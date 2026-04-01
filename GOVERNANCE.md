# Project Governance Protocols (V2.0)

## 1. Release Architecture & Pipeline (Strict)

**Core Principle**: **"Preview First, Publish Later."** 
No code is committed, pushed, or finalized without User Verification.

### 🟢 Development Phase (The Sandbox)
1.  **Draft**: AI writes code.
2.  **Build Check**: AI runs `npm run build` to verify no TS/Build errors.
3.  **Local Preview**: AI prompts User to run `npm run dev`.
4.  **UI/UX Audit** (Self-Check):
    *   Does it work in Dark Mode?
    *   Is the typography correct (Serif Headers / Sans Body)?
    *   Are the animations smooth (cubic-bezier)?
    *   Are accessibility roles (`aria`) present?

### 🔴 Gatekeeper Phase (The Handover)
*   **STOP POINT**: AI waits for User feedback.
*   **User Action**: User reviews functionality on localhost.
*   **Approval**: User types "Approved", "Looks good", or "Publish".

### 🔵 Release Phase (The Commit)
*   Only **AFTER** Approval:
    1.  Perform Git Commit.
    2.  Perform Git Push.

---

## 2. Directory & Architecture Standards

Root is strictly for Config files (`.md`, `package.json`, `vite.config.ts`, `tailwind.config.js`).
**All Source Code** must reside in `src/`.

### File Hierarchy
*   `src/components/`: **Visual Components** (Pure UI, minimal logic).
*   `src/services/`: **Logic Layer** (API calls, computations, no JSX).
*   `src/types.ts`: **Source of Truth** for TS Interfaces.
*   `src/hooks/`: (Optional) Custom React Hooks.

**Rule**: Never create components in the root directory.

---

## 3. UI/UX Design System (The "Director's Cut")

As the UI Director, all code must adhere to these tokens:

### 🎨 Color System
*   **Light Mode**: Backgrounds must be pure white (`bg-white`) or slight clean gray (`bg-zinc-50`).
*   **Dark Mode**: Backgrounds must be **OLED Black** (`dark:bg-[#0A0A0B]`) or Deep Zinc (`dark:bg-[#111111]`). **NEVER** use generic `dark:bg-gray-800` (it looks cheap).
*   **Borders**: Ultra-thin, translucent borders (`border-black/5` or `dark:border-white/10`).

### 🔤 Typography
*   **Headers (H1-H3)**: Use **Serif** (`font-serif`, `Instrument Serif`) for an Editorial/Premium feel.
*   **Body / UI Controls**: Use **Sans** (`font-sans`, `Inter`) for optimal readability.

### ✨ Motion & Interaction
*   **Curves**: Use `cubic-bezier` for all transitions (e.g., `ease-[cubic-bezier(0.32,0.72,0,1)]`). Avoid linear ease.
*   **Response**: All interactive elements must have `:hover` and `:active` states.
*   **Accessibility**: All modals must fulfill `aria-modal="true"` and manage focus.

---

## 4. Impact Analysis Protocol
Before executing code changes, the AI must internally ask:
1.  *Does this break previous interactions?*
2.  *Did I use hardcoded values instead of Tailwind classes?*
3.  *Is this file in the correct folder?*
