import { highlight } from "./highlight";

// Read-only code with highlighting. <pre> keeps every space, tab and line
// break exactly as written (1-23); long lines scroll sideways instead of
// wrapping, so indentation never breaks.
export default function CodeBlock({
  code,
  language,
  label,
}: {
  code: string;
  language: string;
  label: string;
}) {
  return (
    // tabIndex lets keyboard users focus the block and scroll it sideways.
    <pre className="code-block" tabIndex={0} aria-label={label}>
      {/* No "language-x" class on purpose: Prism scans the page for those
          on load and would rewrite this React-owned markup. */}
      <code
        // Safe: highlight() escapes the code before adding markup.
        dangerouslySetInnerHTML={{ __html: highlight(code, language) }}
      />
    </pre>
  );
}
