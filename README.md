# Systems Atlas

A static, dependency-aware learning system for advanced software engineering and modern architecture. Not a blog — a graph of topics where every page answers *"where is this used in real systems?"* before anything else.

Built with **Astro** (static export), zero client framework, self-hosted fonts, dark by default.

## Quick start

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static output in dist/
npm run preview    # serve the production build locally
```

Deploy `dist/` anywhere static (Vercel, Netlify, Cloudflare Pages, S3, nginx).

## How the system works

There are exactly **two places content lives**, joined by slug at build time:

```
src/data/curriculum.ts      ← the graph: every section, topic, difficulty, dependency
src/content/topics/*.md     ← the pages: one markdown file per written topic
```

`curriculum.ts` declares all 38 topics across Section 0 + Levels 1–10, whether written or not. The sidebar, home page, learning graph, search index, and "learn next" suggestions are all derived from it. A topic with no matching markdown file renders as *planned* everywhere; **adding a markdown file whose name matches the slug is all it takes to light a topic up** — sidebar link, graph highlight, search result, and page appear automatically.

### Adding a topic

1. (If new) add it to `curriculum.ts` with its `deps` — this is how it joins the graph.
2. Create `src/content/topics/<slug>.md`:

```markdown
---
title: 'Consistency Models'
description: 'One-sentence thesis of the topic.'
readingTime: 12
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview
...follow the 7-part template (see existing topics)...

</div>

<div class="pane pane-build">

## Build Tasks — Consistency Models
...practical tasks with "done when" criteria...

</div>
```

### The page template (enforced by convention)

Every topic follows the same 7 sections: **Concept Overview → Mental Model → Real-World Example → Common Mistakes → Interview Perspective → Code/Pseudocode → Related Concepts**, plus a separate **Build Tasks** pane. The three written topics (`api-design`, `caching-performance`, `concurrency-async`) are the reference implementations.

### HTML building blocks available inside markdown

```html
<div class="concept-card"><div class="cc-label">Core principle</div> ...markdown... </div>
<details class="deep-dive"><summary>Deep dive: ...</summary><div class="dd-body"> ... </div></details>
<div class="diagram"><svg>…use dg-box / dg-box-hot / dg-text / dg-line classes…</svg><div class="caption">…</div></div>
```

Leave a blank line after each opening tag so markdown inside is processed.

## Features

| Feature | Where |
|---|---|
| Learn / Build mode toggle (whole-UI accent shift, content panes swap, `m` key) | header, `Base.astro` |
| Learning graph — layered DAG, hover to trace full prerequisite lineage | `/graph`, home, `GraphView.astro` |
| Progress tracking (checkbox per topic, dots in sidebar, `localStorage`) | topic pages |
| Bookmarks | topic pages |
| Search (`⌘K` / `/`, build-time JSON index, keyboard navigable) | header |
| Keyboard nav — `⌘K` search, `[` `]` prev/next topic, `m` mode, `Esc` close | global |
| Difficulty tagging (beginner / intermediate / advanced) | curriculum + badges |
| TOC with scroll-spy + "You should learn next" (derived from graph edges) | right rail |
| Collapsible sidebar tree, mobile drawer | left rail |
| Dark by default, light theme toggle, reduced-motion respected | global |

## Project structure

```
systems-atlas/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── public/
│   └── favicon.svg
└── src/
    ├── data/
    │   └── curriculum.ts          # single source of truth for the graph
    ├── content/
    │   ├── config.ts              # collection schema
    │   └── topics/
    │       ├── api-design.md
    │       ├── caching-performance.md
    │       └── concurrency-async.md
    ├── layouts/
    │   └── Base.astro             # shell, SEO, header, search modal, client scripts
    ├── components/
    │   ├── Sidebar.astro          # collapsible curriculum tree + progress dots
    │   ├── Toc.astro              # scroll-spy TOC + learn-next cards
    │   ├── GraphView.astro        # layered DAG, computed at build time
    │   ├── DifficultyBadge.astro
    │   ├── ConceptCard.astro
    │   └── DeepDive.astro
    ├── pages/
    │   ├── index.astro            # hero + graph + curriculum overview
    │   ├── graph.astro            # full learning graph page
    │   ├── search-index.json.ts   # static search index endpoint
    │   └── topics/[slug].astro    # topic page route
    └── styles/
        └── global.css             # design tokens + all component styles
```

## Design notes

- **Signature:** the Learn/Build toggle re-accents the entire interface — blue for theory, amber for hands-on — so the mode you're in is ambient, not a label.
- All persisted state (`atlas:done`, `atlas:bookmarks`, `atlas:mode`, `atlas:theme`) lives in `localStorage`; the site stays fully static.
- Set your real domain in `astro.config.mjs` (`site`) for correct canonical/OG URLs.
