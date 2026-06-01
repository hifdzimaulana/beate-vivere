import { QuartzComponent, QuartzComponentConstructor } from "../types"
import { classNames } from "../../util/lang"
import { QuizManifest } from "../../types/quiz"

interface Options {
  manifest: QuizManifest
}

export default ((opts?: Partial<Options>) => {
  const options: Options = {
    manifest: opts?.manifest ?? [],
  }
  const QuizIndex: QuartzComponent = ({ displayClass }) => {
    const manifestJson = JSON.stringify(options.manifest)
    const title = "Quizzes"
    return (
      <article class={classNames(displayClass, "quiz-index")}>
        <h1 class="article-title">{title}</h1>
        <p class="quiz-index-intro">
          A collection of quizzes. Pick one to test your knowledge. Progress is saved locally in
          your browser.
        </p>
        <noscript>
          <p class="quiz-noscript-warning">
            This page requires JavaScript to filter and search quizzes.
          </p>
        </noscript>
        <div id="quiz-list-root" class="quiz-list-container"></div>
        <script
          type="application/json"
          id="quiz-manifest"
          dangerouslySetInnerHTML={{ __html: manifestJson }}
        />
      </article>
    )
  }

  QuizIndex.css = `
.quiz-index-intro {
  margin: 0.5rem 0 1.5rem;
  color: var(--darkgray);
}

.quiz-noscript-warning {
  padding: 1rem;
  background: var(--highlight);
  border-radius: 4px;
  color: var(--darkgray);
}
`

  return QuizIndex
}) satisfies QuartzComponentConstructor
