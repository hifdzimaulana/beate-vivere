import { h, render } from "preact"
import { useEffect, useMemo, useState } from "preact/hooks"
import { FullSlug, getFullSlug, resolveRelative } from "../../util/path"
import { removeAllChildren } from "./util"

interface ManifestEntry {
  slug: string
  title: string
  description: string
  category: string
  difficulty: "easy" | "medium" | "hard"
  tags: string[]
  questionCount: number
}

type Manifest = ManifestEntry[]

const STORAGE_KEY = "quiz:list:state:v2"

interface PersistedFilters {
  search: string
  category: string
  difficulty: string
  tag: string
}

function loadFilters(): PersistedFilters {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === "object") {
        return {
          search: typeof parsed.search === "string" ? parsed.search : "",
          category: typeof parsed.category === "string" ? parsed.category : "",
          difficulty: typeof parsed.difficulty === "string" ? parsed.difficulty : "",
          tag: typeof parsed.tag === "string" ? parsed.tag : "",
        }
      }
    }
  } catch {}
  return { search: "", category: "", difficulty: "", tag: "" }
}

function saveFilters(f: PersistedFilters) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(f))
  } catch {}
}

function uniqueValues(manifest: Manifest, field: "category" | "tags"): string[] {
  const set = new Set<string>()
  for (const m of manifest) {
    if (field === "tags") {
      for (const t of m.tags) set.add(t)
    } else {
      set.add(m.category)
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b))
}

function QuizList({ manifest, pageSlug }: { manifest: Manifest; pageSlug: FullSlug }) {
  const initial = useMemo(() => loadFilters(), [])
  const [search, setSearch] = useState(initial.search)
  const [category, setCategory] = useState(initial.category)
  const [difficulty, setDifficulty] = useState(initial.difficulty)
  const [tag, setTag] = useState(initial.tag)

  useEffect(() => {
    saveFilters({ search, category, difficulty, tag })
  }, [search, category, difficulty, tag])

  const categories = useMemo(() => uniqueValues(manifest, "category"), [manifest])
  const tags = useMemo(() => uniqueValues(manifest, "tags"), [manifest])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return manifest.filter((m) => {
      if (category && m.category !== category) return false
      if (difficulty && m.difficulty !== difficulty) return false
      if (tag && !m.tags.includes(tag)) return false
      if (q) {
        const hay = `${m.title} ${m.description} ${m.category} ${m.tags.join(" ")}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [manifest, search, category, difficulty, tag])

  const quizHref = (slug: string) => resolveRelative(pageSlug, `quizzes/${slug}` as FullSlug)

  return h(
    "div",
    { class: "quiz-list-root" },
    h(
      "div",
      { class: "quiz-list-toolbar", role: "search" },
      h("input", {
        class: "quiz-search",
        type: "search",
        placeholder: "Search quizzes…",
        value: search,
        onInput: (e: Event) => setSearch((e.target as HTMLInputElement).value),
        "aria-label": "Search quizzes",
      }),
      h(
        "select",
        {
          class: "quiz-filter",
          value: category,
          onChange: (e: Event) => setCategory((e.target as HTMLSelectElement).value),
          "aria-label": "Filter by category",
        },
        h("option", { value: "" }, "All categories"),
        ...categories.map((c) => h("option", { value: c }, c)),
      ),
      h(
        "select",
        {
          class: "quiz-filter",
          value: difficulty,
          onChange: (e: Event) => setDifficulty((e.target as HTMLSelectElement).value),
          "aria-label": "Filter by difficulty",
        },
        h("option", { value: "" }, "All difficulties"),
        h("option", { value: "easy" }, "Easy"),
        h("option", { value: "medium" }, "Medium"),
        h("option", { value: "hard" }, "Hard"),
      ),
      h(
        "select",
        {
          class: "quiz-filter",
          value: tag,
          onChange: (e: Event) => setTag((e.target as HTMLSelectElement).value),
          "aria-label": "Filter by tag",
        },
        h("option", { value: "" }, "All tags"),
        ...tags.map((t) => h("option", { value: t }, t)),
      ),
    ),
    filtered.length === 0
      ? h("p", { class: "quiz-empty" }, "No quizzes match your filters.")
      : h(
          "ul",
          { class: "quiz-list" },
          ...filtered.map((m) =>
            h(
              "li",
              { class: "quiz-card" },
              h(
                "h2",
                { class: "quiz-card-title" },
                h("a", { class: "internal", href: quizHref(m.slug) }, m.title),
              ),
              h("p", { class: "quiz-card-description" }, m.description),
              h(
                "div",
                { class: "quiz-card-meta" },
                h("span", { class: "quiz-card-category" }, m.category),
                h(
                  "span",
                  { class: "quiz-difficulty", "data-difficulty": m.difficulty },
                  m.difficulty,
                ),
                h(
                  "span",
                  { class: "quiz-card-count" },
                  `${m.questionCount} question${m.questionCount === 1 ? "" : "s"}`,
                ),
              ),
            ),
          ),
        ),
  )
}

async function init(root: HTMLElement) {
  removeAllChildren(root)
  const manifestNode = document.getElementById("quiz-manifest")
  if (!manifestNode) {
    root.innerHTML = '<p class="quiz-error">Quiz manifest is missing.</p>'
    return
  }
  let manifest: Manifest
  try {
    manifest = JSON.parse(manifestNode.textContent || "[]")
  } catch {
    root.innerHTML = '<p class="quiz-error">Quiz manifest is corrupted.</p>'
    return
  }
  if (!Array.isArray(manifest)) {
    root.innerHTML = '<p class="quiz-error">Quiz manifest is not a list.</p>'
    return
  }
  const pageSlug = getFullSlug(window)
  render(h(QuizList, { manifest, pageSlug }), root)
}

function setup() {
  const root = document.getElementById("quiz-list-root")
  if (!root) return
  void init(root)
}

document.addEventListener("nav", () => {
  const root = document.getElementById("quiz-list-root")
  if (root) void init(root)
})

setup()
