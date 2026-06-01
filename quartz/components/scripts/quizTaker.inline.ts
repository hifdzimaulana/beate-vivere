import { h, render } from "preact"
import { useEffect, useState } from "preact/hooks"
import { FullSlug, getFullSlug, resolveRelative } from "../../util/path"
import { removeAllChildren } from "./util"

interface QuizQuestion {
  question: string
  answer_choices: string[]
  correct_answer: number
  explanation: string
  source_reference?: string
}

interface Quiz {
  title: string
  description: string
  category: string
  difficulty: "easy" | "medium" | "hard"
  tags: string[]
  questions: QuizQuestion[]
}

interface QuizMeta {
  slug: string
  title: string
  description: string
  category: string
  difficulty: "easy" | "medium" | "hard"
  tags: string[]
  questionCount: number
}

type Phase = "loading" | "resume" | "quiz" | "results"
type Answers = Record<number, number | undefined>

interface PersistedState {
  order: number[]
  choices: Answers
  phase: "quiz" | "results"
  currentIdx: number
  shuffled: boolean
  shuffledChoiceMaps: Record<number, number[]>
}

const STORAGE_PREFIX = "quiz:taker:state:v2:"

function storageKey(slug: string) {
  return STORAGE_PREFIX + slug
}

function loadState(slug: string): PersistedState | null {
  try {
    const raw = localStorage.getItem(storageKey(slug))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null
    if (!Array.isArray(parsed.order) || !Array.isArray(parsed.shuffledChoiceMaps)) return null
    return parsed as PersistedState
  } catch {
    return null
  }
}

function saveState(slug: string, state: PersistedState) {
  try {
    localStorage.setItem(storageKey(slug), JSON.stringify(state))
  } catch {}
}

function clearState(slug: string) {
  try {
    localStorage.removeItem(storageKey(slug))
  } catch {}
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildShuffledChoiceMap(choices: string[]): number[] {
  return shuffleArray(choices.map((_, i) => i))
}

function mapShuffledToOriginal(shuffled: number[], originalIdx: number): number {
  return shuffled.indexOf(originalIdx)
}

function loadMeta(): QuizMeta | null {
  const node = document.getElementById("quiz-meta")
  if (!node) return null
  try {
    return JSON.parse(node.textContent || "null")
  } catch {
    return null
  }
}

async function fetchQuiz(slug: string): Promise<Quiz> {
  const url = resolveRelative(getFullSlug(window), `quizzes/${slug}.json` as FullSlug)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch quiz (${res.status})`)
  }
  return (await res.json()) as Quiz
}

function NavPanel({
  quiz,
  state,
  currentIdx,
  onJump,
}: {
  quiz: Quiz
  state: PersistedState
  currentIdx: number
  onJump: (idx: number) => void
}) {
  return h(
    "nav",
    { class: "quiz-nav-panel", "aria-label": "Question navigation" },
    h(
      "ol",
      { class: "quiz-nav-grid" },
      ...state.order.map((origIdx, idx) => {
        const q = quiz.questions[origIdx]
        const choiceMap = state.shuffledChoiceMaps[origIdx] || q.answer_choices.map((_, i) => i)
        const correctShuffled = mapShuffledToOriginal(choiceMap, q.correct_answer)
        const userShuffled = state.choices[origIdx]
        const isAnswered = userShuffled !== undefined
        const isCorrect = isAnswered && userShuffled === correctShuffled
        const status = idx === currentIdx
          ? "current"
          : isAnswered
            ? isCorrect
              ? "correct"
              : "incorrect"
            : "unanswered"
        const statusLabel = status === "current"
          ? "current question"
          : status === "correct"
            ? "answered correctly"
            : status === "incorrect"
              ? "answered incorrectly"
              : "unanswered"
        return h(
          "li",
          { class: "quiz-nav-item" },
          h(
            "button",
            {
              type: "button",
              class: "quiz-nav-btn",
              "data-status": status,
              "aria-current": idx === currentIdx ? "true" : undefined,
              "aria-label": `Question ${idx + 1}, ${statusLabel}`,
              onClick: () => onJump(idx),
            },
            String(idx + 1),
          ),
        )
      }),
    ),
  )
}

function QuestionView({
  quiz,
  state,
  questionIdx,
  onAnswer,
}: {
  quiz: Quiz
  state: PersistedState
  questionIdx: number
  onAnswer: (shuffledIdx: number) => void
}) {
  const originalIdx = state.order[questionIdx]
  const q = quiz.questions[originalIdx]
  const choiceMap = state.shuffledChoiceMaps[originalIdx] || q.answer_choices.map((_, i) => i)
  const selectedShuffled = state.choices[originalIdx]
  const answered = selectedShuffled !== undefined
  const correctShuffled = mapShuffledToOriginal(choiceMap, q.correct_answer)
  const isCorrect = answered && selectedShuffled === correctShuffled

  return h(
    "div",
    { class: "quiz-question", role: "group", "aria-label": `Question ${questionIdx + 1}` },
    h("h2", { class: "quiz-question-text" }, q.question),
    h(
      "ul",
      { class: "quiz-choices" },
      ...choiceMap.map((originalChoiceIdx, shuffledIdx) => {
        const isSelected = selectedShuffled === shuffledIdx
        const isThisCorrect = shuffledIdx === correctShuffled
        const state2 = answered
          ? isThisCorrect
            ? "correct"
            : isSelected
              ? "incorrect"
              : "neutral"
          : "neutral"
        return h(
          "li",
          null,
          h(
            "button",
            {
              class: "quiz-choice",
              type: "button",
              "data-selected": isSelected ? "true" : "false",
              "data-state": state2,
              disabled: answered,
              onClick: () => onAnswer(shuffledIdx),
              "aria-pressed": isSelected,
            },
            h("span", { class: "quiz-choice-key" }, String.fromCharCode(65 + shuffledIdx)),
            h("span", { class: "quiz-choice-text" }, q.answer_choices[originalChoiceIdx]),
          ),
        )
      }),
    ),
    answered &&
      h(
        "div",
        { class: "quiz-explanation", role: "status", "aria-live": "polite" },
        h(
          "p",
          null,
          h("span", { class: "quiz-explanation-label" }, isCorrect ? "Correct." : "Incorrect."),
          " ",
          q.explanation,
        ),
        q.source_reference && h("p", { class: "quiz-source" }, `Source: ${q.source_reference}`),
      ),
  )
}

function ResultsView({
  quiz,
  state,
  onRestart,
  onReview,
}: {
  quiz: Quiz
  state: PersistedState
  onRestart: () => void
  onReview: () => void
}) {
  const total = state.order.length
  const correct = state.order.filter((origIdx) => {
    const choiceMap =
      state.shuffledChoiceMaps[origIdx] || quiz.questions[origIdx].answer_choices.map((_, i) => i)
    const correctShuffled = mapShuffledToOriginal(choiceMap, quiz.questions[origIdx].correct_answer)
    return state.choices[origIdx] === correctShuffled
  }).length
  const incorrect = total - correct
  const pct = total === 0 ? 0 : Math.round((correct / total) * 100)

  return h(
    "div",
    { class: "quiz-results", role: "region", "aria-label": "Quiz results" },
    h("p", { class: "quiz-score-label" }, "Your score"),
    h("p", { class: "quiz-score" }, `${pct}%`),
    h(
      "div",
      { class: "quiz-score-stats" },
      h("span", null, `Total: ${total}`),
      h("span", { class: "quiz-stat-correct" }, `Correct: ${correct}`),
      h("span", { class: "quiz-stat-incorrect" }, `Incorrect: ${incorrect}`),
    ),
    h(
      "div",
      { class: "quiz-actions" },
      h("span", null),
      h(
        "div",
        null,
        h("button", { class: "quiz-button", type: "button", onClick: onReview }, "Review answers"),
        " ",
        h(
          "button",
          { class: "quiz-button quiz-button-primary", type: "button", onClick: onRestart },
          "Restart quiz",
        ),
      ),
    ),
  )
}

function ReviewView({
  quiz,
  state,
  onBack,
}: {
  quiz: Quiz
  state: PersistedState
  onBack: () => void
}) {
  return h(
    "div",
    { class: "quiz-review" },
    h("h2", null, "Review"),
    ...state.order.map((origIdx, idx) => {
      const q = quiz.questions[origIdx]
      const choiceMap = state.shuffledChoiceMaps[origIdx] || q.answer_choices.map((_, i) => i)
      const correctShuffled = mapShuffledToOriginal(choiceMap, q.correct_answer)
      const correctOriginal = q.correct_answer
      const userShuffled = state.choices[origIdx]
      const userOriginal = userShuffled !== undefined ? choiceMap[userShuffled] : undefined
      const isCorrect = userShuffled === correctShuffled
      return h(
        "div",
        { class: "quiz-review-item" },
        h(
          "p",
          { class: "quiz-review-question" },
          `${idx + 1}. ${q.question}`,
          " ",
          h(
            "span",
            { style: `color: ${isCorrect ? "var(--secondary)" : "#c0392b"}; font-weight: 500;` },
            isCorrect ? "✓" : "✗",
          ),
        ),
        h(
          "p",
          { class: "quiz-review-answer" },
          "Your answer: ",
          userOriginal !== undefined
            ? h(
                "span",
                { class: isCorrect ? "quiz-review-correct" : "quiz-review-wrong" },
                q.answer_choices[userOriginal],
              )
            : h("em", null, "(skipped)"),
        ),
        h(
          "p",
          { class: "quiz-review-answer" },
          "Correct answer: ",
          h("span", { class: "quiz-review-correct" }, q.answer_choices[correctOriginal]),
        ),
        h(
          "p",
          { class: "quiz-explanation" },
          h("span", { class: "quiz-explanation-label" }, "Explanation: "),
          q.explanation,
        ),
      )
    }),
    h(
      "div",
      { class: "quiz-actions" },
      h("span", null),
      h("button", { class: "quiz-button", type: "button", onClick: onBack }, "Back to results"),
    ),
  )
}

function QuizTaker({
  meta,
  quiz,
  initialState,
}: {
  meta: QuizMeta
  quiz: Quiz
  initialState: PersistedState | null
}) {
  const [phase, setPhase] = useState<Phase>(initialState ? "resume" : "quiz")
  const [state, setState] = useState<PersistedState>(() => {
    if (initialState) return initialState
    const shuffled = true
    const order = quiz.questions.map((_, i) => i)
    if (shuffled) shuffleArray(order)
    const shuffledChoiceMaps: Record<number, number[]> = {}
    for (const idx of order) {
      shuffledChoiceMaps[idx] = buildShuffledChoiceMap(quiz.questions[idx].answer_choices)
    }
    return {
      order,
      choices: {},
      phase: "quiz",
      currentIdx: 0,
      shuffled,
      shuffledChoiceMaps,
    }
  })
  const [view, setView] = useState<"results" | "review">("results")

  useEffect(() => {
    if (state.phase === "results" && phase === "quiz") {
      setPhase("results")
    }
  }, [state.phase, phase])

  useEffect(() => {
    if (phase === "quiz" || phase === "results") {
      saveState(meta.slug, { ...state, phase: phase === "results" ? "results" : "quiz" })
    }
  }, [state, phase, meta.slug])

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (phase === "quiz" && Object.keys(state.choices).length > 0) {
        e.preventDefault()
        e.returnValue = ""
        return ""
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [phase, state.choices])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== "quiz") return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
      const q = quiz.questions[state.order[state.currentIdx]]
      const choiceMap =
        state.shuffledChoiceMaps[state.order[state.currentIdx]] || q.answer_choices.map((_, i) => i)
      if (/^[1-9]$/.test(e.key)) {
        const n = parseInt(e.key, 10) - 1
        if (n < choiceMap.length && state.choices[state.order[state.currentIdx]] === undefined) {
          e.preventDefault()
          onAnswer(n)
        }
      } else if (
        e.key === "ArrowRight" &&
        state.choices[state.order[state.currentIdx]] !== undefined
      ) {
        e.preventDefault()
        onNext()
      } else if (e.key === "ArrowLeft" && state.currentIdx > 0) {
        e.preventDefault()
        onPrev()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const onAnswer = (shuffledIdx: number) => {
    const origIdx = state.order[state.currentIdx]
    setState((s) => ({ ...s, choices: { ...s.choices, [origIdx]: shuffledIdx } }))
  }

  const onNext = () => {
    if (state.currentIdx < state.order.length - 1) {
      setState((s) => ({ ...s, currentIdx: s.currentIdx + 1 }))
    } else {
      setState((s) => ({ ...s, phase: "results" }))
      setPhase("results")
    }
  }

  const onPrev = () => {
    if (state.currentIdx > 0) {
      setState((s) => ({ ...s, currentIdx: s.currentIdx - 1 }))
    }
  }

  const onRestart = () => {
    clearState(meta.slug)
    const order = quiz.questions.map((_, i) => i)
    shuffleArray(order)
    const shuffledChoiceMaps: Record<number, number[]> = {}
    for (const idx of order) {
      shuffledChoiceMaps[idx] = buildShuffledChoiceMap(quiz.questions[idx].answer_choices)
    }
    setState({
      order,
      choices: {},
      phase: "quiz",
      currentIdx: 0,
      shuffled: true,
      shuffledChoiceMaps,
    })
    setPhase("quiz")
  }

  const onResume = () => setPhase("quiz")
  const onStartOver = () => {
    clearState(meta.slug)
    onRestart()
  }

  const onReview = () => setView("review")
  const onBackToResults = () => setView("results")

  if (phase === "resume") {
    const answered = Object.keys(initialState?.choices ?? {}).length
    return h(
      "div",
      { class: "quiz-resume-prompt", role: "alert" },
      h(
        "p",
        null,
        `You have a saved progress: ${answered} of ${meta.questionCount} question${meta.questionCount === 1 ? "" : "s"} answered.`,
      ),
      h(
        "div",
        null,
        h("button", { class: "quiz-button", type: "button", onClick: onStartOver }, "Start over"),
        " ",
        h(
          "button",
          { class: "quiz-button quiz-button-primary", type: "button", onClick: onResume },
          "Resume",
        ),
      ),
    )
  }

  if (phase === "results") {
    if (view === "review") {
      return h(ReviewView, { quiz, state, onBack: onBackToResults })
    }
    return h(ResultsView, { quiz, state, onRestart, onReview })
  }

  const origIdx = state.order[state.currentIdx]
  const answered = state.choices[origIdx] !== undefined
  const progress = ((state.currentIdx + 1) / state.order.length) * 100

  const onJump = (idx: number) => {
    setState((s) => ({ ...s, currentIdx: idx }))
  }

  return h(
    "div",
    { class: "quiz-active" },
    h(NavPanel, { quiz, state, currentIdx: state.currentIdx, onJump }),
    h(
      "div",
      { class: "quiz-progress" },
      h(
        "div",
        {
          class: "quiz-progress-bar",
          role: "progressbar",
          "aria-valuenow": Math.round(progress),
          "aria-valuemin": 0,
          "aria-valuemax": 100,
        },
        h("div", { class: "quiz-progress-fill", style: `width: ${progress}%` }),
      ),
      h(
        "p",
        { class: "quiz-progress-text" },
        h("span", null, `Question ${state.currentIdx + 1} of ${state.order.length}`),
        h(
          "span",
          null,
          `${Object.keys(state.choices).length} answered · ${state.order.length - Object.keys(state.choices).length} remaining`,
        ),
      ),
    ),
    h(QuestionView, { quiz, state, questionIdx: state.currentIdx, onAnswer }),
    h(
      "div",
      { class: "quiz-actions" },
      h(
        "button",
        {
          class: "quiz-button",
          type: "button",
          onClick: onPrev,
          disabled: state.currentIdx === 0,
        },
        "← Previous",
      ),
      h(
        "button",
        {
          class: "quiz-button quiz-button-primary",
          type: "button",
          onClick: onNext,
          disabled: !answered,
        },
        state.currentIdx === state.order.length - 1 ? "Finish" : "Next →",
      ),
    ),
  )
}

async function init(root: HTMLElement, isReinit = false) {
  if (isReinit && root.firstElementChild) {
    return
  }
  removeAllChildren(root)
  const meta = loadMeta()
  if (!meta) {
    root.innerHTML = '<p class="quiz-error">Quiz metadata is missing.</p>'
    return
  }

  let quiz: Quiz
  try {
    quiz = await fetchQuiz(meta.slug)
  } catch (e) {
    root.innerHTML = `<p class="quiz-error">Failed to load quiz: ${(e as Error).message}</p>`
    return
  }

  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    root.innerHTML = '<p class="quiz-error">This quiz has no questions.</p>'
    return
  }

  const initialState = loadState(meta.slug)
  render(h(QuizTaker, { meta, quiz, initialState }), root)
}

function setup() {
  const root = document.getElementById("quiz-taker-root")
  if (!root) return
  void init(root)
}

document.addEventListener("nav", () => {
  const root = document.getElementById("quiz-taker-root")
  if (root) void init(root, true)
})

setup()
