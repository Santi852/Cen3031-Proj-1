// Syntax highlighting with Prism, shared by the post editor (1-22) and the
// post views (1-23). Only the languages a post can use are loaded. Order
// matters: each language builds on the ones above it (cpp extends c, which
// extends clike; typescript extends javascript).
import Prism from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-java";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-go";

// Returns HTML. Prism escapes the code itself (< becomes &lt;), so a post
// can't inject markup; with no grammar we escape it the same way.
export function highlight(code: string, language: string): string {
  const grammar = Prism.languages[language];
  return grammar
    ? Prism.highlight(code, grammar, language)
    : Prism.util.encode(code).toString();
}

// One run of text and the Prism classes it should get ("" for plain text).
export type Segment = { text: string; className: string };

type PrismToken = string | Prism.Token;

// The same highlighting, split into lines, for views that number each line.
// Works on Prism's tokens rather than its HTML, so a token that spans
// several lines (a block comment, a docstring) is cut cleanly at each line
// break, and React escapes the text, so no raw HTML is involved.
export function highlightLines(code: string, language: string): Segment[][] {
  const grammar = Prism.languages[language];
  const tokens: PrismToken[] = grammar ? Prism.tokenize(code, grammar) : [code];

  const lines: Segment[][] = [[]];
  function add(token: PrismToken | PrismToken[], classes: string[]) {
    if (Array.isArray(token)) {
      for (const t of token) add(t, classes);
    } else if (typeof token === "string") {
      token.split("\n").forEach((text, i) => {
        if (i > 0) lines.push([]);
        if (text)
          lines[lines.length - 1].push({ text, className: classes.join(" ") });
      });
    } else {
      const alias = token.alias ?? [];
      add(token.content as PrismToken | PrismToken[], [
        ...classes,
        "token",
        token.type,
        ...(Array.isArray(alias) ? alias : [alias]),
      ]);
    }
  }
  add(tokens, []);
  return lines;
}
