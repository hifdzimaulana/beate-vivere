import { QuartzComponent, QuartzComponentConstructor } from "../types"
import { classNames } from "../../util/lang"
import { Quiz } from "../../types/quiz"

interface Options {
  slug: string
  quiz: Quiz
}

export default ((opts?: Partial<Options>) => {
  const options: Options = {
    slug: opts?.slug ?? "",
    quiz: opts?.quiz ?? {
      title: "",
      description: "",
      category: "",
      difficulty: "medium",
      tags: [],
      questions: [],
    },
  }
  const { slug, quiz } = options

  const QuizPage: QuartzComponent = ({ displayClass }) => {
    const metaJson = JSON.stringify({
      slug,
      title: quiz.title,
      description: quiz.description,
      category: quiz.category,
      difficulty: quiz.difficulty,
      tags: quiz.tags,
      questionCount: quiz.questions.length,
    })

    return (
      <article class={classNames(displayClass, "quiz-page")}>
        <header class="quiz-page-header">
          <p class="quiz-page-category">{quiz.category}</p>
          <h1 class="article-title">{quiz.title}</h1>
          {quiz.tags.length > 0 && (
            <ul class="quiz-tags">
              {quiz.tags.map((tag) => (
                <li class="quiz-tag">#{tag}</li>
              ))}
            </ul>
          )}
        </header>

        <noscript>
          <p class="quiz-noscript-warning">
            This quiz requires JavaScript. Please enable it to take the quiz.
          </p>
        </noscript>

        <div id="quiz-taker-root" class="quiz-taker-container"></div>
        <script
          type="application/json"
          id="quiz-meta"
          dangerouslySetInnerHTML={{ __html: metaJson }}
        />
      </article>
    )
  }

  QuizPage.css = `
.quiz-page-header {
  margin-bottom: 1.5rem;
}

.quiz-page-category {
  margin: 0 0 0.35rem 0;
  font-size: 0.85rem;
  color: var(--gray);
}

.quiz-tags {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.quiz-tag {
  font-size: 0.8rem;
  color: var(--secondary);
  font-weight: 500;
}

.quiz-noscript-warning {
  padding: 1rem;
  background: var(--highlight);
  border-radius: 4px;
  color: var(--darkgray);
}
`

  return QuizPage
}) satisfies QuartzComponentConstructor
