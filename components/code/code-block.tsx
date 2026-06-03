import { codeToHtml } from "shiki";

interface CodeBlockProps {
  code: string;
  language: string;
}

export async function CodeBlock({ code, language }: CodeBlockProps) {
  const html = await codeToHtml(code, {
    lang: language,
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
