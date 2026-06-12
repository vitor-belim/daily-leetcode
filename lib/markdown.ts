export function markdownToHtml(markdown: string): string {
  if (!markdown) return "";

  let html = markdown
    // Escape HTML entities to prevent XSS (if markdown comes from untrusted source)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.*?)_/g, "<em>$1</em>");

  // Inline code
  html = html.replace(/`(.*?)`/g, "<code>$1</code>");

  // Simple LaTeX-like math support
  html = html.replace(
    /\$2\^\{\\text\{distance\} - 1\}\$/g,
    "2<sup>distance - 1</sup>",
  );
  html = html.replace(/\$2\^\{\\text\{distance\}\}\$/g, "2<sup>distance</sup>");
  html = html.replace(/\$10\^9 \+ 7\$/g, "10<sup>9</sup> + 7");
  html = html.replace(/\$10\^9\+7\$/g, "10<sup>9</sup> + 7");
  html = html.replace(/\$10\^9\$/g, "10<sup>9</sup>");
  html = html.replace(/\$2\^\{([^}]*)\}\$/g, "2<sup>$1</sup>");
  html = html.replace(/\$2\^([^{}\s$]+)\$/g, "2<sup>$1</sup>");
  html = html.replace(/\^\{([^}]*)\}/g, "<sup>$1</sup>");
  html = html.replace(/\^([^{}\s$]+)/g, "<sup>$1</sup>");
  html = html.replace(/\$(.*?)\$/g, "$1");

  // Line breaks
  html = html.replace(/\r\n/g, "\n");
  html = html.replace(/\n\n/g, "</p><p>");
  html = html.replace(/\n/g, "<br />");

  return html;
}
