function escapeHtml(markdown: string): string {
  return markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function applyInlineFormatting(html: string): string {
  return html
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.*?)__/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/_(.*?)_/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>");
}

function applyMathSubstitutions(html: string): string {
  return html
    .replace(/\$2\^\{\\text\{distance} - 1}\$/g, "2<sup>distance - 1</sup>")
    .replace(/\$2\^\{\\text\{distance}}\$/g, "2<sup>distance</sup>")
    .replace(/\$10\^9 \+ 7\$/g, "10<sup>9</sup> + 7")
    .replace(/\$10\^9\+7\$/g, "10<sup>9</sup> + 7")
    .replace(/\$10\^9\$/g, "10<sup>9</sup>")
    .replace(/\$2\^\{([^}]*)}\$/g, "2<sup>$1</sup>")
    .replace(/\$2\^([^{}\s$]+)\$/g, "2<sup>$1</sup>")
    .replace(/\^\{([^}]*)}/g, "<sup>$1</sup>")
    .replace(/\^([^{}\s$]+)/g, "<sup>$1</sup>")
    .replace(/\$(.*?)\$/g, "$1");
}

function applyLineBreaks(html: string): string {
  return html
    .replace(/\r\n/g, "\n")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br />");
}

export function markdownToHtml(markdown: string): string {
  if (!markdown) return "";

  return applyLineBreaks(
    applyMathSubstitutions(applyInlineFormatting(escapeHtml(markdown))),
  );
}
