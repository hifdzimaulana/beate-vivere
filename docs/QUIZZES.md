# Quizzes

A lightweight quiz system for Quartz. Quizzes are stored as JSON files under `data/quizzes/`, served at `/quizzes/`, and the quiz UI is a single-page Preact app with state persisted in `localStorage`.

- **No markdown coupling** — quiz data is not embedded in any note
- **Auto-discovery** — drop a JSON file into `data/quizzes/` and the index page picks it up at the next build
- **Lazy loading** — each quiz's full data is only fetched when its page is opened
- **No core Quartz changes** — implemented as a custom emitter

## URL structure

| URL                      | Source                                  | Purpose                                     |
| ------------------------ | --------------------------------------- | ------------------------------------------- |
| `/quizzes`               | `data/quizzes/*.json` (build time)      | Index page — list, filter, search           |
| `/quizzes/<slug>`        | `data/quizzes/<slug>.json` (build time) | The quiz page itself                        |
| `/quizzes/manifest.json` | Generated                               | Lightweight metadata used by the index page |
| `/quizzes/<slug>.json`   | Generated copy of the source            | Fetched by the quiz taker client            |

`<slug>` is derived from the JSON filename: `data/quizzes/constitutional-law.json` → `/quizzes/constitutional-law`.

## Adding a new quiz

1. Create `data/quizzes/<slug>.json` (use lowercase + hyphens for the filename, e.g. `contract-law.json`).
2. Fill in the required fields. See the [JSON schema](#json-schema) below.
3. Run `npx quartz build` (or just save if `npx quartz build --serve` is running).
4. The quiz will appear on `/quizzes`.

A working example lives at `data/quizzes/hukum-dan-ham.json`.

## Editing a quiz

Edit the JSON file directly. If you're running the dev server, the page will rebuild automatically (incremental — only the affected quiz page is regenerated, not the whole site). If not, run `npx quartz build`.

## Adding categories and tags

Categories and tags are free-form strings. No registration is required.

- **Category** is a single string per quiz. Common categories: `"Hukum Tata Negara"`, `"Hukum Perdata"`, `"Hukum Pidana"`.
- **Tags** is an array of strings. Common tags: `"HTN"`, `"konstitusi"`, `"HAM"`, `"HAM berat"`.

The index page automatically populates its filter dropdowns from the union of all categories and tags across all quizzes.

To rename or remove a category, just edit the `category` field in each quiz's JSON file.

## JSON schema

```jsonc
{
  "title": "Hukum Konstitusi", // required, 1–200 chars
  "description": "Soal-soal dasar ...", // required, 1–1000 chars
  "category": "Hukum Tata Negara", // required, 1–100 chars
  "difficulty": "medium", // required: "easy" | "medium" | "hard"
  "tags": ["HTN", "konstitusi"], // required, 0–20 items, each 1–40 chars
  "questions": [
    // required, 1–500 items
    {
      "question": "Apa fungsi utama konstitusi?", // required, 1–2000 chars
      "answer_choices": [
        // required, 2–10 items
        "Membatasi kekuasaan negara",
        "Memberikan kekuasaan mutlak kepada presiden",
        "Menghapus seluruh peraturan",
        "Menjamin monopoli partai",
      ],
      "correct_answer": 0, // required, 0-based index into answer_choices
      "explanation": "Konstitusi berfungsi ...", // required, 1–2000 chars
      "source_reference": "UUD 1945 Pasal 1 ayat (2)", // optional, ≤500 chars
    },
  ],
}
```

### Important: `correct_answer` is a 0-based index

The example file at the project root uses the **text** of the correct answer. This is **incompatible** with answer-shuffling (which the system supports) and is therefore not the schema used here. Use the **0-based index** of the correct choice instead. So for the four choices above:

- `0` = `"Membatasi kekuasaan negara"` (correct)
- `1` = `"Memberikan kekuasaan mutlak kepada presiden"`
- `2` = `"Menghapus seluruh peraturan"`
- `3` = `"Menjamin monopoli partai"`

If the JSON is malformed or doesn't match the schema, the build fails with a clear error message pointing to the file and the field that is wrong.

## Features

### Quiz index page (`/quizzes`)

- Card grid with title, description, category badge, difficulty badge, question count
- Search box (matches title, description, category, tags)
- Filter by category
- Filter by difficulty
- Filter by tag
- Search and filter state persists in `localStorage` (key: `quiz:list:state:v1`)

### Quiz taking experience (`/quizzes/<slug>`)

- Progress bar
- "Question N of M" indicator
- "N answered · M remaining" indicator
- One-question-at-a-time UI
- Per-choice feedback (correct / incorrect) after answering
- Explanation shown after answering
- Optional source reference shown after answering
- **Keyboard navigation**:
  - `1`–`9` — select choice by position
  - `Enter` / `→` — next question
  - `←` — previous question
- Progress is auto-saved to `localStorage` (key: `quiz:taker:state:v1:<slug>`)
- On revisit with saved progress, a "Resume / Start over" prompt is shown
- `beforeunload` warning if the quiz is in progress
- Shuffled question order (on first take)
- Shuffled answer order (on first take; preserved during the session)

### Results screen

- Percentage score (e.g. `80%`)
- "Total / Correct / Incorrect" stats
- **Review answers** mode — walks through every question with:
  - The user's answer (struck through if wrong)
  - The correct answer
  - The full explanation
- **Restart quiz** button — clears state and reshuffles

## Linking notes to quizzes (future)

The architecture is designed to make it easy to link a Markdown note to its quiz. Two natural extension points:

1. **Add a `quiz` frontmatter field** to your note's Markdown frontmatter (handled by a future custom transformer or just a plain `[[transclude]]` link).
2. **Add a `QuizLink` component** to the `defaultContentPageLayout.beforeBody` array in `quartz.layout.ts` that reads the frontmatter and renders a link to `/quizzes/<slug>`.

Neither of these is implemented yet — the system is structured so that adding them requires no changes to existing code.

## How it works (architecture)

```
data/quizzes/*.json
        │
        ▼ (build time)
QuizEmitter (quartz/plugins/emitters/quizEmitter.tsx)
        │
        ├── public/quizzes/manifest.json           (lightweight metadata for index)
        ├── public/quizzes/<slug>.json             (the quiz data itself)
        ├── public/quizzes/index.html              (the index page)
        └── public/quizzes/<slug>/index.html       (the quiz page)
                │
                ▼ (runtime)
        quizList.inline.ts                        (renders the index)
        quizTaker.inline.ts                       (renders the quiz taker)
```

- **Emitter** reads `data/quizzes/*.json`, validates each against the schema, and writes the four artifacts above. Both `emit` (full build) and `partialEmit` (incremental rebuild) are implemented.
- **Index page** is server-rendered with an empty `<div id="quiz-list-root">` and a `<script type="application/json" id="quiz-manifest">` block containing the manifest. The client script (`quizList.inline.ts`) reads the manifest, fetches it on `nav` events, and renders the card grid.
- **Quiz page** is server-rendered with quiz metadata (title, description, category, difficulty, tags) in the HTML for SEO, and an empty `<div id="quiz-taker-root">`. The client script (`quizTaker.inline.ts`) fetches `/quizzes/<slug>.json`, hydrates state from `localStorage`, and renders the question flow.

## Files added

```
data/quizzes/                                  # source of truth
quartz/types/quiz.ts                           # TypeScript types + validator
quartz/components/pages/QuizIndex.tsx          # SSR shell for /quizzes
quartz/components/pages/QuizPage.tsx           # SSR shell for /quizzes/<slug>
quartz/components/scripts/quizList.inline.ts   # client: list + filter + search
quartz/components/scripts/quizTaker.inline.ts  # client: take + score + review
quartz/components/styles/quizList.inline.scss  # styles for index
quartz/components/styles/quizTaker.inline.scss # styles for taker
quartz/plugins/emitters/quizEmitter.tsx        # build-time emitter
docs/QUIZZES.md                                # this file
```

Modified:

- `quartz.config.ts` — added `Plugin.QuizEmitter()` to the `emitters` array
- `quartz.layout.ts` — added "Quizzes" link in the footer
- `quartz/plugins/emitters/index.ts` — added `export { QuizEmitter }`

## Deploying

The system produces only static files. Deploy `public/` to any static host:

- **GitHub Pages** — use `npm run docs` (builds to `public/`), then push `public/` to your `gh-pages` branch
- **Cloudflare Pages** / **Netlify** / **Vercel** — point at the repo, build command `npx quartz build`, output directory `public`
- No backend, no database, no environment variables required.
