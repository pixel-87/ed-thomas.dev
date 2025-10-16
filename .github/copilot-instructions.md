# ed-thomas.dev Copilot Instructions

## Project Overview

A personal portfolio website built with **Astro 5** + **Tailwind CSS**, featuring an animated hex-maze canvas background. The site showcases a blog, projects, and CV with responsive design and dark mode support.

## Architecture

### Core Stack

- **Framework**: Astro (SSG with file-based routing)
- **Styling**: Tailwind CSS (utility-first) + custom CSS in `src/styles/global.css`
- **Content**: MDX/Markdown collections (`src/content/config.ts` defines schemas)
- **Build**: esbuild, TypeScript strict mode, ESLint
- **Package Manager**: pnpm (workspace configured in `pnpm-workspace.yaml`)
- **Dev Environment**: Nix flake (`flake.nix`) for reproducible development setup

### Key Directories

- `site/src/pages/` - File-based routing (`.astro`/`.mdx` files become routes)
- `site/src/content/` - Content collections (blog & projects) with Zod schemas
- `site/src/layouts/Layout.astro` - Master layout wrapping all pages
- `site/src/components/` - Reusable Astro components
- `site/src/styles/global.css` - Responsive gradients with CSS custom properties
- `site/src/scripts/drawHexMaze.js` - Canvas animation (lazy-loaded)
- `site/public/` - Static assets (favicons, robots.txt, manifests)

### Data Flow

1. **Collections**: Define schema in `src/content/config.ts` (blog, projects)
2. **Content Pages**: Use `getCollection()` to query MDX/markdown files
3. **Dynamic Routes**: `[slug].astro` files use `getStaticPaths()` for blog/project pages
4. **Layout Injection**: All pages wrap with `Layout.astro` → `MazeBackground` + responsive grid

## Critical Patterns & Conventions

### Responsive Design

- **Mobile-first approach** with Tailwind breakpoints (default 640px, 1024px)
- **CSS variables for gradients**: `--gradient-base-r/g/b` changed via `html.dark`
- **Media queries in global.css**: Gradient opacity scales from 100% opacity (desktop) → 50% opacity (mobile) to preserve maze visibility
- Example: `@media (max-width: 640px) { .gradient-overlay { ... } }`

### Dark Mode

- Triggered by `html.dark` selector (browser/system preference)
- **CSS var overrides**: `html.dark { --maze-line-color: #CC6600; --gradient-base-r: 0; }`
- **Prose styling**: `--tw-prose-*` variables define color palette; dark mode inherits via `.dark .prose { ... }`
- Keep light mode classes unchanged; provide dark mode alternatives with `html.dark .class-name { ... !important }`

### Lazy-Loading Behavior

- `mazeBackground.astro` imports maze script as URL (`?url` query) → loaded via `requestIdleCallback()`
- Prevents render-blocking of main content
- Fallback to `setTimeout` for older browsers

### Content Collections

- Collections defined in `src/content/config.ts` with Zod schema validation
- Query with `getCollection('blog')` or `getCollection('projects')`
- Dynamic routes: Pages like `[slug].astro` generate static HTML at build time
- Frontmatter schema: `title`, `description`, `pubDate`/`date`, `tags`/`technologies`, `featured`, etc.

### Build & Deployment

- **Dev**: `pnpm run dev` → Astro dev server on `localhost:4321`
- **Build**: `pnpm run build` → Static HTML in `dist/`
- **Preview**: `pnpm run preview` → Local preview of built site
- **Commands** (all from `site/` directory):
  - `pnpm lint` / `pnpm lint:fix` - ESLint
  - `pnpm fmt` - Prettier (writes formatted code)
  - `pnpm check` - Astro type checking
  - `pnpm typecheck` - TypeScript validation

### Nix Development Environment

- **Setup**: `flake.nix` defines reproducible dev environment with all dependencies
- **Entry**: `nix develop` to enter development shell with pnpm, Node, and other tools
- **Docker**: Optional Docker configuration in `nix/docker.nix` for containerized builds
- **Packaging**: Production builds can be packaged via Nix derivations in `nix/default.nix`
- **Benefits**: No local Node/pnpm installation needed; consistent environment across machines

## Integration Points

### RSS Feed

- `pages/rss.xml.js` exports `GET()` function using `@astrojs/rss`
- Queries blog collection and generates feed automatically

### Sitemap

- Configured in `astro.config.mjs` via `@astrojs/sitemap` integration
- Auto-generated during build for SEO

### Favicon Setup

- **Files**: `favicon.ico`, `favicon-32x32.png`, `favicon-16x16.png`, `apple-touch-icon.png`, `android-chrome-*.png`
- **Location**: `public/` directory
- **Links**: Added in `src/components/BaseHead.astro` (don't reference missing files like `/favicon.svg`)
- **Manifest**: Link `rel="manifest"` to `site.webmanifest` for PWA support

### Duolingo Streak Integration

- **Python Script**: `scripts/fetch_duolingo_streak.py` fetches Duolingo streak data and updates a GitHub Gist
- **Trigger**: Scheduled via GitHub Actions or cron job to run periodically
- **Data Flow**: Script → GitHub Gist → Client-side JS on `/misc` page fetches and displays streak
- **Purpose**: Real-time streak display without backend; Gist acts as simple data store
- **Note**: Requires Duolingo credentials and GitHub Gist token for automation

## Project-Specific Quirks

### Navigation Active State

- `Layout.astro` calculates `currentPath` from request URL
- `isActive(path)` helper highlights current nav link
- Pattern: `class={isActive("/") ? "font-bold underline" : ""}`

### Inline Critical CSS

- Master CSS variables inlined in `<style is:inline>` in `Layout.astro` head
- Prevents FOUC (flash of unstyled content) for theme toggle
- Non-critical styles in `src/styles/global.css` (imported normally)

### Gradient Overlay Responsiveness

- Desktop (1024px+): Wide fade (8%-92%) with 45%-55% solid center
- Tablet (640px-1024px): Tighter fade (5%-95%) with 25%-75% solid center
- Mobile (<640px): Aggressive fade (3%-97%) with **50% opacity center** (allows maze to show through)
- **Why**: On mobile, text takes more screen real estate; full opacity would completely hide the maze

### Script Loading Pattern

- Client scripts in `src/scripts/` (e.g., `drawHexMaze.js`)
- Imported as `?url` to get path → loaded asynchronously
- Use `requestIdleCallback()` + `setTimeout()` fallback for non-blocking execution

## Common Tasks

### Add a Blog Post

1. Create file: `src/content/blog/my-post.mdx`
2. Add frontmatter with `title`, `description`, `pubDate`, optional `tags`
3. Write MDX content (supports React components in prose blocks)
4. Auto-generates at route: `/blog/my-post`

### Add a Project

1. Create file: `src/content/projects/my-project.md`
2. Add frontmatter with `title`, `description`, `technologies`, `date`, optional `url`/`github`/`featured`
3. Auto-generates at route: `/projects/my-project`

### Modify Responsive Behavior

- Edit `@media (max-width: 640px)` queries in `src/styles/global.css`
- Gradient opacity, layout shifts, font sizes all scale here
- Test on actual mobile or DevTools device emulation

### Debug Theme Issues

- Check `html.dark` selector applied (toggle dark mode → inspect `<html>` element)
- Verify CSS variables are updated in `:root` or `html.dark`
- Use `getComputedStyle()` in browser console to verify runtime values

## Files to Reference

- **Layout & Structure**: `site/src/layouts/Layout.astro`, `site/src/components/BaseHead.astro`
- **Styling**: `site/src/styles/global.css` (responsive gradients)
- **Content**: `site/src/content/config.ts` (schemas), `site/src/pages/blog/[slug].astro` (dynamic routing)
- **Config**: `site/astro.config.mjs` (integrations), `site/tailwind.config.mjs`
- **Maze**: `site/src/components/mazeBackground.astro`, `site/src/scripts/drawHexMaze.js`
