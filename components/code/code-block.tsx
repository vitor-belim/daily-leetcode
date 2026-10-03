import "server-only";
import { codeToHtml } from "shiki";
import { toShikiLanguage } from "@/lib/shiki-languages";

interface CodeBlockProps {
  code: string;
  language: string;
}

/**
 * Syntax-highlights a solution's code with Shiki on the server, so no
 * highlighter ships to the browser.
 *
 * @param code The source code to show.
 * @param language LeetCode's name for the code's language; unknown
 *   languages fall back to plain text.
 * @returns The highlighted code block.
 */
export async function CodeBlock({ code, language }: CodeBlockProps) {
  const html = await codeToHtml(code, {
    lang: toShikiLanguage(language),
    theme: "github-dark",
    rootStyle:
      "background-color: #24292e; color: #e1e4e8; padding: 1rem; overflow: auto;",
  });

  return (
    <div
      className="rounded-md overflow-hidden text-sm"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
