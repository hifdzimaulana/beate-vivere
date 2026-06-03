// @ts-ignore
import exportPDFScript from "./scripts/exportpdf.inline"
import styles from "./styles/exportpdf.inline.scss"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const ExportPDF: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <button class={`${displayClass ?? ""} dl-pdf`.trim()}>
      <svg
        class="dl-pdf-icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      <span class="dl-pdf-text">Download PDF</span>
    </button>
  )
}

ExportPDF.beforeDOMLoaded = exportPDFScript
ExportPDF.css = styles

export default (() => ExportPDF) satisfies QuartzComponentConstructor
