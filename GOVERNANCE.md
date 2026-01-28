# Project Governance Protocols

## 1. Release Process (Strict)

**Core Principle**: No code reaches production (or `main` branch) without user verification.

### Workflow
1.  **Development**: Developer (AI) implements changes.
2.  **Local Test**: User runs `npm run dev` to verify changes locally.
3.  **User Confirmation**: User explicitly confirms "Tests Passed" or "Approved".
4.  **Push**: Developer executes git push.

> [!CRITICAL]
> **NEVER** push to GitHub without explicit "Approved to Push" confirmation from the user.

## 2. Directory Structure

All source code must reside in `src/`.
*   `src/components/`: Reusable UI components.
*   `src/services/`: Business logic and API integrations.
*   `src/types.ts`: Shared TypeScript interfaces.

## 3. UI/UX Standards

*   **Styling**: Use Tailwind CSS utility classes.
*   **Design System**:
    *   Primary Color: Purple (Tailwind `purple-600` etc.)
    *   Dark Mode: Support `dark` variant for all UI components.
*   **Consistency**: Do not introduce new arbitrary colors; use the established palette.

## 4. Impact Analysis
Before any modification, analyze:
*   What files are touched?
*   What pages are affected?
*   Are there breaking changes?
