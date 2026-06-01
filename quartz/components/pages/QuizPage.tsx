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
          <p class="quiz-page-meta">
            <span class="quiz-category">{quiz.category}</span>
            <span class="quiz-difficulty" data-difficulty={quiz.difficulty}>
              {quiz.difficulty}
            </span>
          </p>
          <h1 class="article-title">{quiz.title}</h1>
          <p class="quiz-page-description">{quiz.description}</p>
          <ul class="quiz-tags">
            {quiz.tags.map((tag) => (
              <li class="quiz-tag">{tag}</li>
            ))}
          </ul>
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

.quiz-page-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0 0 0.5rem 0;
  font-size: 0.85rem;
}

.quiz-category {
  padding: 0.15rem 0.5rem;
  background: var(--highlight);
  border-radius: 3px;
  color: var(--darkgray);
}

.quiz-difficulty {
  padding: 0.15rem 0.5rem;
  border-radius: 3px;
  text-transform: capitalize;
  font-weight: 500;
}

.quiz-difficulty[data-difficulty="easy"] {
  background: rgba(46, 204, 113, 0.2);
  color: #27ae60;
}

.quiz-difficulty[data-difficulty="medium"] {
  background: rgba(243, 156, 18, 0.2);
  color: #d68910;
}

.quiz-difficulty[data-difficulty="hard"] {
  background: rgba(231, 76, 60, 0.2);
  color: #c0392b;
}

:root[saved-theme="dark"] .quiz-difficulty[data-difficulty="easy"] {
  color: #2ecc71;
}

:root[saved-theme="dark"] .quiz-difficulty[data-difficulty="medium"] {
  color: #f39c12;
}

:root[saved-theme="dark"] .quiz-difficulty[data-difficulty="hard"] {
  color: #e74c3c;
}

.quiz-page-description {
  margin: 0.5rem 0;
  color: var(--darkgray);
  line-height: 1.5;
}

.quiz-tags {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.quiz-tag {
  font-size: 0.75rem;
  padding: 0.1rem 0.4rem;
  background: var(--lightgray);
  border-radius: 3px;
  color: var(--gray);
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
