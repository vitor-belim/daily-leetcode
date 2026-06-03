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

  // Line breaks
  html = html.replace(/\r\n/g, "\n");
  html = html.replace(/\n\n/g, "</p><p>");
  html = html.replace(/\n/g, "<br />");

  return `<p>${html}</p>`;
}
