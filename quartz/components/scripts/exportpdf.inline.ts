let generating = false

function waitForMermaid(timeoutMs = 3000): Promise<boolean> {
  const nodes = document.querySelectorAll("code.mermaid")
  if (nodes.length === 0) return Promise.resolve(true)

  const allProcessed = [...nodes].every((el) => el.hasAttribute("data-processed"))
  if (allProcessed) return Promise.resolve(true)

  return new Promise((resolve) => {
    const start = Date.now()
    const interval = setInterval(() => {
      const done = [...document.querySelectorAll("code.mermaid")].every((el) =>
        el.hasAttribute("data-processed"),
      )
      if (done || Date.now() - start > timeoutMs) {
        clearInterval(interval)
        resolve(done)
      }
    }, 100)
  })
}

function getFileName(): string {
  const title =
    document.querySelector(".article-title")?.textContent?.trim() ||
    document.title.split(" - ")[0]?.trim() ||
    "document"
  return title.replace(/[<>:"/\\|?*]/g, "_") + ".pdf"
}

const printStyle = document.createElement("style")
printStyle.id = "pdf-export-print"
printStyle.textContent = `
@media print {
  body * { visibility: hidden; }
  .center, .center * { visibility: visible !important; }
  .center .sidebar,
  .center .page-header,
  .center .graph,
  .center .backlinks,
  .center .table-of-contents,
  .center .dl-pdf,
  .center nav { display: none !important; }
  .center { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; }
  .article { margin: 0; padding: 0; }
  .graph-container { display: none !important; }
  @page { margin: 15mm; size: A4; }
  :root { --light: #ffffff; --lightgray: #e8e8e8; --darkgray: #2a2a2a; --dark: #1a1a1a; }
  * { color: #2a2a2a !important; background: transparent !important; }
  a { text-decoration: underline; }
  img, svg { max-width: 100% !important; }
  pre, code { border: 1px solid #e8e8e8 !important; }
  table { border-collapse: collapse !important; }
  table, th, td { border: 1px solid #e8e8e8 !important; padding: 6px 10px !important; }
  blockquote { border-left: 3px solid #e8e8e8 !important; padding-left: 12px !important; }
  .mermaid svg { zoom: 0.65; }
  .mermaid svg text { fill: #2a2a2a !important; color: #2a2a2a !important; }
  .mermaid svg .node rect, .mermaid svg .node polygon, .mermaid svg .node circle { fill: #f5f5f5 !important; stroke: #2a2a2a !important; }
  .mermaid svg .edgePath .path { stroke: #2a2a2a !important; }
  .mermaid svg .edgeLabel { background: #ffffff !important; color: #2a2a2a !important; }
}
`

async function handlePdfClick(e: Event) {
  const btn = (e.target as HTMLElement).closest(".dl-pdf") as HTMLButtonElement | null
  if (!btn || generating) return

  generating = true
  btn.disabled = true
  btn.classList.add("loading")
  const originalText = btn.querySelector(".dl-pdf-text")
  if (originalText) originalText.textContent = "Generating..."

  try {
    await waitForMermaid()
    document.head.appendChild(printStyle)
    window.print()
  } catch (err) {
    console.error("PDF export failed:", err)
    alert("Failed to generate PDF. Please try again.")
  } finally {
    printStyle.remove()
    generating = false
    btn.disabled = false
    btn.classList.remove("loading")
    if (originalText) originalText.textContent = "Download PDF"
  }
}

document.addEventListener("click", handlePdfClick)
