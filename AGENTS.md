# AGENTS.md

## Project

Greenfield: **Merchant Calculator PWA** — a mobile-first calculator for Thai online/offline sellers. No code exists yet. The plan below is agreed; follow it rather than substituting your own scaffold.

## Non-negotiable decisions

- **No framework, no build tools, no runtime dependencies.** Plain HTML/CSS/JS served statically. Do not add React/Vite/package.json/toolchains.
- **Core logic is pure JS in `js/core/` with zero DOM access.** It must be runnable under `node --test` and portable later to native apps. UI wiring stays in `js/app.js`.
- **No `eval()`** for expression parsing — `js/core/calc.js` implements its own tokenizer/parser.
- **PWA requirements:** installable (manifest + icons) and fully functional offline (service worker, cache-first). Merchants use it with no connectivity.
- **UI ships in Thai and English**, switchable at runtime (`js/i18n/` dictionaries, choice persisted in `localStorage`). Default can follow browser language.
- **Audience is merchants, not developers:** big buttons, high contrast, minimal taps. Feature set: main calculator with editable tape/history, discount (%, cash), cost/margin/platform-fee pricing, VAT 7%, cash + change with quick-cash buttons, generic percent.

## Commands

- Tests: `node --test` (from repo root; picks up `js/*.test.js` + `js/core/*.test.js`)
- Full gate: `node scripts/verify.mjs` (tests + i18n parity + markup keys + line budget + import graph + PWA assets)
- Regenerate icons: `node scripts/gen-icons.mjs`
- Run app: any static server, e.g. `npx serve .` (also verify with file:// where possible)
- No lint/typecheck configured — keep files small (≤ ~200 lines) and edit in chunks.

## Testing expectations

- Every public function in `js/core/calc.js` and `js/core/tools.js` gets unit tests before UI wiring.
- Money math must avoid float artifacts (e.g. `0.1 + 0.2`); round money results to 2 decimals and test for it.
- Test edge cases: divide by zero, negative results, repeated decimals, empty input.
- After UI work: verify Thai/English switch, reload persistence, and offline reload (DevTools → offline → refresh).
