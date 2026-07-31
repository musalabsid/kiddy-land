# Kiddy Land

A cozy corner of the internet built for curious kids. Monorepo managed with [Turborepo](https://turborepo.dev) and [Bun](https://bun.sh).

## Stack

- **`apps/web`** — the app: [Vite](https://vite.dev) + [React 19](https://react.dev) + [TanStack Router](https://tanstack.com/router) + [Tailwind CSS v4](https://tailwindcss.com)
- **`packages/ui`** (`@workspace/ui`) — shared component library built with [shadcn/ui](https://ui.shadcn.com) on [Base UI](https://base-ui.com), icons from [lucide-react](https://lucide.dev)
- **Tooling** — [TypeScript](https://www.typescriptlang.org/), [oxlint](https://oxc.rs) for linting, [oxfmt](https://oxc.rs) for formatting, [Turbo](https://turborepo.dev) for task orchestration

## Getting started

Requires [Bun](https://bun.sh) (see `devEngines` in `package.json`).

```sh
bun install
bun dev
```

The web app runs at http://localhost:3000.

## Scripts

| Command                | Description                            |
| ---------------------- | -------------------------------------- |
| `bun dev`              | Start all dev servers                  |
| `bun build`            | Build all apps and packages            |
| `bun check-types`      | Type-check all workspaces              |
| `bun lint`             | Lint the whole repo                    |
| `bun lint:fix`         | Lint and autofix                       |
| `bun format`           | Check formatting                       |
| `bun format:fix`       | Format everything                      |
| `bun quality`          | Run lint + format checks               |
| `bun quality:fix`      | Autofix lint and format                |

Target a single workspace with a [Turbo filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

```sh
bun turbo dev --filter=web
bun turbo build --filter=@workspace/ui
```
