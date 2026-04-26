# Project

## Stack

| Layer       | Choice                     |
| ----------- | -------------------------- |
| Language    | TypeScript 5 (Node 22)     |
| Test runner | Vitest                     |
| Linter      | ESLint + TypeScript ESLint |
| Formatter   | Prettier                   |
| CI/CD       | GitHub Actions             |

## Local Dev Setup

### Prerequisites

- Node.js 22+ ([nvm](https://github.com/nvm-sh/nvm) recommended)
- npm 10+

### Getting started

```bash
git clone <repo-url>
cd <repo-name>
npm install
```

### Commands

| Command              | Description                      |
| -------------------- | -------------------------------- |
| `npm run dev`        | Start dev server with hot reload |
| `npm test`           | Run tests once                   |
| `npm run test:watch` | Run tests in watch mode          |
| `npm run lint`       | Lint source and test files       |
| `npm run format`     | Auto-format all files            |
| `npm run build`      | Compile TypeScript to `dist/`    |

### Environment

Copy `.env.example` to `.env` and fill in values before running locally.

## CI/CD

GitHub Actions runs on every push and pull request to `main`:

1. Format check (`prettier --check`)
2. Lint (`eslint`)
3. Tests (`vitest run`)
4. Build (`tsc`)

All four steps must pass before merging.

## Project Structure

```
src/          # Application source (TypeScript)
tests/        # Test files (*.test.ts)
dist/         # Compiled output (git-ignored)
.github/
  workflows/
    ci.yml    # GitHub Actions CI pipeline
```
