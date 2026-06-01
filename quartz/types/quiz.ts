export type Difficulty = "easy" | "medium" | "hard"

export interface QuizQuestion {
  question: string
  answer_choices: string[]
  correct_answer: number
  explanation: string
  source_reference?: string
}

export interface Quiz {
  title: string
  description: string
  category: string
  difficulty: Difficulty
  tags: string[]
  questions: QuizQuestion[]
}

export interface QuizManifestEntry {
  slug: string
  title: string
  description: string
  category: string
  difficulty: Difficulty
  tags: string[]
  questionCount: number
}

export type QuizManifest = QuizManifestEntry[]

export class QuizValidationError extends Error {
  constructor(
    message: string,
    public readonly file?: string,
  ) {
    super(file ? `[${file}] ${message}` : message)
    this.name = "QuizValidationError"
  }
}

function isString(v: unknown): v is string {
  return typeof v === "string"
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isString)
}

function isInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v)
}

const DIFFICULTIES: ReadonlySet<Difficulty> = new Set(["easy", "medium", "hard"])

function validateQuestion(q: unknown, idx: number, file: string): QuizQuestion {
  const path = `questions[${idx}]`
  if (typeof q !== "object" || q === null) {
    throw new QuizValidationError(`${path} must be an object`, file)
  }
  const obj = q as Record<string, unknown>

  if (!isString(obj.question) || obj.question.length < 1 || obj.question.length > 2000) {
    throw new QuizValidationError(`${path}.question must be a string (1–2000 chars)`, file)
  }
  if (!isStringArray(obj.answer_choices)) {
    throw new QuizValidationError(`${path}.answer_choices must be an array of strings`, file)
  }
  if (obj.answer_choices.length < 2 || obj.answer_choices.length > 10) {
    throw new QuizValidationError(
      `${path}.answer_choices must have 2–10 items (got ${obj.answer_choices.length})`,
      file,
    )
  }
  for (let i = 0; i < obj.answer_choices.length; i++) {
    const c = obj.answer_choices[i]
    if (c.length < 1 || c.length > 500) {
      throw new QuizValidationError(
        `${path}.answer_choices[${i}] must be 1–500 chars (got ${c.length})`,
        file,
      )
    }
  }
  if (!isInt(obj.correct_answer) || obj.correct_answer < 0) {
    throw new QuizValidationError(`${path}.correct_answer must be a non-negative integer`, file)
  }
  if (obj.correct_answer >= obj.answer_choices.length) {
    throw new QuizValidationError(
      `${path}.correct_answer (${obj.correct_answer}) is out of range for ${obj.answer_choices.length} choices`,
      file,
    )
  }
  if (!isString(obj.explanation) || obj.explanation.length < 1 || obj.explanation.length > 2000) {
    throw new QuizValidationError(`${path}.explanation must be a string (1–2000 chars)`, file)
  }
  if (
    obj.source_reference !== undefined &&
    (!isString(obj.source_reference) || obj.source_reference.length > 500)
  ) {
    throw new QuizValidationError(
      `${path}.source_reference must be a string (≤500 chars) if present`,
      file,
    )
  }

  const out: QuizQuestion = {
    question: obj.question,
    answer_choices: obj.answer_choices,
    correct_answer: obj.correct_answer,
    explanation: obj.explanation,
  }
  if (obj.source_reference !== undefined) {
    out.source_reference = obj.source_reference
  }
  return out
}

export function validateQuiz(data: unknown, file?: string): Quiz {
  if (typeof data !== "object" || data === null) {
    throw new QuizValidationError("root must be an object", file)
  }
  const obj = data as Record<string, unknown>

  if (!isString(obj.title) || obj.title.length < 1 || obj.title.length > 200) {
    throw new QuizValidationError("title must be a string (1–200 chars)", file)
  }
  if (!isString(obj.description) || obj.description.length < 1 || obj.description.length > 1000) {
    throw new QuizValidationError("description must be a string (1–1000 chars)", file)
  }
  if (!isString(obj.category) || obj.category.length < 1 || obj.category.length > 100) {
    throw new QuizValidationError("category must be a string (1–100 chars)", file)
  }
  if (!isString(obj.difficulty) || !DIFFICULTIES.has(obj.difficulty as Difficulty)) {
    throw new QuizValidationError(
      `difficulty must be one of: ${[...DIFFICULTIES].join(", ")}`,
      file,
    )
  }
  if (!isStringArray(obj.tags)) {
    throw new QuizValidationError("tags must be an array of strings", file)
  }
  if (obj.tags.length > 20) {
    throw new QuizValidationError(`tags must have ≤20 items (got ${obj.tags.length})`, file)
  }
  for (let i = 0; i < obj.tags.length; i++) {
    const t = obj.tags[i]
    if (t.length < 1 || t.length > 40) {
      throw new QuizValidationError(`tags[${i}] must be 1–40 chars`, file)
    }
  }
  if (!Array.isArray(obj.questions)) {
    throw new QuizValidationError("questions must be an array", file)
  }
  if (obj.questions.length < 1 || obj.questions.length > 500) {
    throw new QuizValidationError(
      `questions must have 1–500 items (got ${obj.questions.length})`,
      file,
    )
  }

  return {
    title: obj.title,
    description: obj.description,
    category: obj.category,
    difficulty: obj.difficulty as Difficulty,
    tags: obj.tags,
    questions: obj.questions.map((q, i) => validateQuestion(q, i, file ?? "<quiz>")),
  }
}

export function quizToManifestEntry(slug: string, quiz: Quiz): QuizManifestEntry {
  return {
    slug,
    title: quiz.title,
    description: quiz.description,
    category: quiz.category,
    difficulty: quiz.difficulty,
    tags: quiz.tags,
    questionCount: quiz.questions.length,
  }
}
