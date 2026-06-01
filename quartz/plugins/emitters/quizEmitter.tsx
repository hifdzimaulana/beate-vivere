import fs from "fs"
import path from "path"
import { Root } from "hast"
import { FilePath, FullSlug, joinSegments, pathToRoot, slugifyFilePath } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import { QuartzComponent, QuartzComponentProps } from "../../components/types"
import { pageResources, renderPage } from "../../components/renderPage"
import { FullPageLayout } from "../../cfg"
import { sharedPageComponents } from "../../../quartz.layout"
import { defaultProcessedContent } from "../vfile"
import { write } from "./helpers"
import { Quiz, QuizManifest, quizToManifestEntry, validateQuiz } from "../../types/quiz"
import QuizIndex from "../../components/pages/QuizIndex"
import QuizPage from "../../components/pages/QuizPage"
import { BuildCtx } from "../../util/ctx"
import { StaticResources } from "../../util/resources"

// @ts-ignore
import quizListScript from "../../components/scripts/quizList.inline"
// @ts-ignore
import quizTakerScript from "../../components/scripts/quizTaker.inline"
// @ts-ignore
import quizListStyle from "../../components/styles/quizList.inline.scss"
// @ts-ignore
import quizTakerStyle from "../../components/styles/quizTaker.inline.scss"

const QUIZ_DATA_DIR = "data/quizzes"
const QUIZ_OUT_DIR = "quizzes"
const QUIZ_INDEX_SLUG = "quizzes/index" as FullSlug

interface LoadedQuiz {
  slug: string
  quiz: Quiz
}

function readAllQuizzes(ignorePatterns: string[]): LoadedQuiz[] {
  const fullDir = path.join(process.cwd(), QUIZ_DATA_DIR)
  if (!fs.existsSync(fullDir)) {
    if (ignorePatterns.length === 0) {
      console.warn(`[quizEmitter] No ${QUIZ_DATA_DIR} directory found at ${fullDir}`)
    }
    return []
  }
  const entries = fs.readdirSync(fullDir, { withFileTypes: true })
  const quizzes: LoadedQuiz[] = []
  const seenSlugs = new Set<string>()

  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (!entry.name.endsWith(".json")) continue

    const sourcePath = path.join(fullDir, entry.name)
    const raw = fs.readFileSync(sourcePath, "utf-8")
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch (e) {
      throw new Error(`[quizEmitter] ${entry.name} is not valid JSON: ${(e as Error).message}`)
    }
    const slug = slugifyFilePath(entry.name.replace(/\.json$/, "") as FilePath) as string
    if (seenSlugs.has(slug)) {
      throw new Error(`[quizEmitter] duplicate quiz slug: ${slug} (from ${entry.name})`)
    }
    seenSlugs.add(slug)
    const quiz = validateQuiz(parsed, entry.name)
    quizzes.push({ slug, quiz })
  }
  return quizzes
}

function buildPageResources(
  base: StaticResources,
  scripts: string[],
  styles: string[],
): StaticResources {
  return {
    ...base,
    js: [
      ...base.js,
      ...scripts.map((s) => ({
        loadTime: "afterDOMReady" as const,
        contentType: "inline" as const,
        script: s,
        spaPreserve: true,
      })),
    ],
    css: [...base.css, ...styles.map((s) => ({ content: s, inline: true }))],
  }
}

async function* emitQuizPage(
  ctx: BuildCtx,
  slug: FullSlug,
  frontmatterTitle: string,
  description: string,
  pageBody: QuartzComponent,
  pageResources: StaticResources,
): AsyncGenerator<FilePath, void, unknown> {
  const cfg = ctx.cfg.configuration
  const [tree, vfile] = defaultProcessedContent({
    slug,
    text: description,
    description,
    frontmatter: { title: frontmatterTitle, tags: [] },
  })

  const layout: FullPageLayout = {
    ...sharedPageComponents,
    pageBody,
    beforeBody: [],
    left: [],
    right: [],
  }

  const componentData: QuartzComponentProps = {
    ctx,
    fileData: vfile.data,
    externalResources: pageResources,
    cfg,
    children: [],
    tree: tree as Root,
    allFiles: [],
  }
  yield write({
    ctx,
    slug,
    ext: ".html",
    content: renderPage(cfg, slug, componentData, layout, componentData.externalResources),
  })
}

export const QuizEmitter: QuartzEmitterPlugin = () => {
  return {
    name: "QuizEmitter",
    getQuartzComponents() {
      return []
    },
    async *emit(ctx, _content, resources) {
      const quizzes = readAllQuizzes(ctx.cfg.configuration.ignorePatterns)
      const manifest: QuizManifest = quizzes.map((q) => quizToManifestEntry(q.slug, q.quiz))

      yield write({
        ctx,
        slug: joinSegments(QUIZ_OUT_DIR, "manifest") as FullSlug,
        ext: ".json",
        content: Buffer.from(JSON.stringify(manifest, null, 2)),
      })

      for (const { slug, quiz } of quizzes) {
        yield write({
          ctx,
          slug: joinSegments(QUIZ_OUT_DIR, slug) as FullSlug,
          ext: ".json",
          content: Buffer.from(JSON.stringify(quiz, null, 2)),
        })
      }

      const indexPageRes = buildPageResources(
        pageResources(pathToRoot(QUIZ_INDEX_SLUG), resources),
        [quizListScript],
        [quizListStyle],
      )
      yield* emitQuizPage(
        ctx,
        QUIZ_INDEX_SLUG,
        "Quizzes",
        "Browse and take quizzes on various topics.",
        QuizIndex({ manifest }),
        indexPageRes,
      )

      for (const { slug, quiz } of quizzes) {
        const pageSlug = joinSegments(QUIZ_OUT_DIR, slug, "index") as FullSlug
        const takerPageRes = buildPageResources(
          pageResources(pathToRoot(pageSlug), resources),
          [quizTakerScript],
          [quizTakerStyle],
        )
        yield* emitQuizPage(
          ctx,
          pageSlug,
          quiz.title,
          quiz.description,
          QuizPage({ slug, quiz }),
          takerPageRes,
        )
      }
    },
    async *partialEmit(ctx, _content, resources, changeEvents) {
      const relevant = changeEvents.filter(
        (e) => e.path.startsWith(`${QUIZ_DATA_DIR}/`) && e.path.endsWith(".json"),
      )
      if (relevant.length === 0) return

      const allQuizzes = readAllQuizzes(ctx.cfg.configuration.ignorePatterns)
      const manifest: QuizManifest = allQuizzes.map((q) => quizToManifestEntry(q.slug, q.quiz))

      yield write({
        ctx,
        slug: joinSegments(QUIZ_OUT_DIR, "manifest") as FullSlug,
        ext: ".json",
        content: Buffer.from(JSON.stringify(manifest, null, 2)),
      })

      for (const { slug, quiz } of allQuizzes) {
        yield write({
          ctx,
          slug: joinSegments(QUIZ_OUT_DIR, slug) as FullSlug,
          ext: ".json",
          content: Buffer.from(JSON.stringify(quiz, null, 2)),
        })
      }

      const indexPageRes = buildPageResources(
        pageResources(pathToRoot(QUIZ_INDEX_SLUG), resources),
        [quizListScript],
        [quizListStyle],
      )
      yield* emitQuizPage(
        ctx,
        QUIZ_INDEX_SLUG,
        "Quizzes",
        "Browse and take quizzes on various topics.",
        QuizIndex({ manifest }),
        indexPageRes,
      )

      const changedFiles = new Set(relevant.map((e) => path.basename(e.path)))
      const touchedByDelete = relevant.some((e) => e.type === "delete")
      for (const { slug, quiz } of allQuizzes) {
        const jsonName = `${slug}.json`
        if (!touchedByDelete && !changedFiles.has(jsonName)) continue
        const pageSlug = joinSegments(QUIZ_OUT_DIR, slug, "index") as FullSlug
        const takerPageRes = buildPageResources(
          pageResources(pathToRoot(pageSlug), resources),
          [quizTakerScript],
          [quizTakerStyle],
        )
        yield* emitQuizPage(
          ctx,
          pageSlug,
          quiz.title,
          quiz.description,
          QuizPage({ slug, quiz }),
          takerPageRes,
        )
      }
    },
  }
}
