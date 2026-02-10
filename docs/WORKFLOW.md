# Coding Standards and Workflow

To ensure code stability and isolate changes, we will follow a strict branch-based workflow. This document outlines the process for all future development tasks.

## 1. Branching Strategy

We will use a feature-branch workflow. **Direct commits to `main` are prohibited for new features or significant refactors.**

### Branch Naming Convention

-   **Features**: `feature/<feature-name>` (e.g., `feature/user-profile`, `feature/dark-mode`)
-   **Bug Fixes**: `fix/<bug-description>` (e.g., `fix/login-error`, `fix/nav-alignment`)
-   **Hotfixes**: `hotfix/<urgent-fix>` (e.g., `hotfix/crash-patch`)
-   **Experiments**: `experiment/<experiment-name>`

### Workflow Steps

1.  **Receive Task**: When a new feature or task is requested.
2.  **Create Branch**:
    ```bash
    git checkout -b feature/my-new-feature
    ```
3.  **Develop**: Make changes, run tests, and verify locally.
4.  **Commit**: Commit changes with clear, descriptive messages.
    ```bash
    git add .
    git commit -m "feat: add user profile page"
    ```
5.  **Review (Self/User)**: Ensure the feature meets requirements.
6.  **Merge**:
    ```bash
    git checkout main
    git pull origin main
    git merge feature/my-new-feature
    # Resolve conflicts if any
    git push origin main
    ```
7.  **Cleanup**: Delete the feature branch locally and remotely (if pushed).
    ```bash
    git branch -d feature/my-new-feature
    ```

## 2. Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

-   `feat: ...` for new features
-   `fix: ...` for bug fixes
-   `docs: ...` for documentation changes
-   `style: ...` for formatting/whitespace (no code change)
-   `refactor: ...` for code restructuring without behavior change
-   `test: ...` for adding/updating tests
-   `chore: ...` for build tasks, package manager configs, etc.

## 3. General Coding Standards

-   **TypeScript**: Use strict typing where possible. Avoid `any`.
-   **Components**: Functional components with hooks.
-   **Styling**: Use Tailwind CSS (via `className`) or styled-components as established in the project.
-   **Clean Code**: Keep functions small and focused. meaningful variable names.

## 4. Agent Behavior

When the AI (Antigravity) receives a task:
1.  **Check Current Branch**: `git status`
2.  **Switch Branch**: If on `main` and starting a new task, create a new branch.
3.  **Context Isolation**: Respect the current branch's context. Do not mix unrelated changes.
