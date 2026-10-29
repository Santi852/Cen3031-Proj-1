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
