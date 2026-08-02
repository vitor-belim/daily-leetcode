import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: false, breaks: true });

/**
 * Renders one `$...$` LaTeX-ish segment (the subset `/explain` actually
 * emits) into HTML.
 *
 * @param expr The segment's inner text, already entity-escaped by
 *   markdown-it. `\text{...}` unwraps to its content; `^{...}` becomes a
 *   `<sup>`; a braceless `^` superscripts only the alphanumeric run right
 *   after the caret, so `$10^9+7$` renders as 10⁹+7, not 10^(9+7).
 * @returns The segment as HTML, trimmed.
 */
function renderMathSegment(expr: string): string {
  return expr
    .replace(/\\text\{([^}]*)}/g, "$1")
    .replace(/\^\{([^}]*)}/g, "<sup>$1</sup>")
    .replace(/\^([A-Za-z0-9]+)/g, "<sup>$1</sup>")
    .trim();
}

/**
 * Replaces `$...$` math segments in rendered HTML, leaving `<pre>`/`<code>`
 * segments untouched so a `$` or `^` inside a code span is never rewritten.
 * Carets are only superscripted inside `$...$`, never in plain prose.
 *
 * @param html The HTML produced by markdown-it.
 * @returns The HTML with math segments substituted.
 */
function applyMathSubstitutions(html: string): string {
  return html
    .split(/(<pre[\s\S]*?<\/pre>|<code[^>]*>[\s\S]*?<\/code>)/g)
    .map((segment, index) =>
      index % 2 === 1
        ? segment
        : segment.replace(/\$([^$\n]+)\$/g, (_, expr: string) =>
            renderMathSegment(expr),
          ),
    )
    .join("");
}

/**
 * Renders markdown (solution notes and AI explanations) to HTML via
 * markdown-it, then substitutes `$...$` math segments. Raw HTML in the
 * source is rendered as escaped literal text (`html: false`), and single
 * newlines become `<br>` (`breaks: true`).
 *
 * @param markdown The markdown source.
 * @returns The rendered HTML, trimmed; empty string for empty input.
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return "";

  return applyMathSubstitutions(md.render(markdown)).trim();
}
