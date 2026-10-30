import type { CSSProperties } from "react";
import { highlightLines, type Segment } from "./highlight";

const TAB = "    ";

// Splits a line's leading spaces off its other segments, so the indent can
// get its own span (which draws the guide lines) and tabs show as 4 spaces.
function splitIndent(segments: Segment[]) {
  const raw = segments.map((s) => s.text).join("");
  const indentRaw = /^[ \t]*/.exec(raw)?.[0] ?? "";
  let toSkip = indentRaw.length;
  const rest: Segment[] = [];
  for (const segment of segments) {
    if (toSkip >= segment.text.length) {
      toSkip -= segment.text.length;
    } else {
      rest.push({ ...segment, text: segment.text.slice(toSkip) });
      toSkip = 0;
    }
  }
  return { indent: indentRaw.replaceAll("\t", TAB), rest };
}

// Read-only code like an editor: a line number beside every line and a faint
// guide at each indent level. Every space and line break is kept exactly as
// written (1-23). Long lines never wrap; the block scrolls sideways instead,
// numbers and all.
export default function CodeBlock({
  code,
  language,
  label,
}: {
  code: string;
  language: string;
  label: string;
}) {
  const lines = highlightLines(code, language);
  // The number column fits the longest number (2 characters up to line 99).
  const gutter = `${String(lines.length).length}ch`;

  return (
    // tabIndex lets keyboard users focus the block and scroll it with the
    // arrow keys.
    <pre
      className="code-block"
      aria-label={label}
      tabIndex={0}
      style={{ "--gutter": gutter } as CSSProperties}
    >
      {/* No "language-x" class on purpose: Prism scans the page for those
          on load and would rewrite this React-owned markup. */}
      <code>
        {lines.map((segments, i) => {
          const { indent, rest } = splitIndent(segments);
          return (
            <span key={i} className="code-line">
              {/* Hidden from screen readers and from copy/paste, so copying
                  the code doesn't drag the numbers along. */}
              <span className="line-number" aria-hidden="true">
                {i + 1}
              </span>
              <span className="line-content">
                {indent && <span className="code-indent">{indent}</span>}
                {rest.map((s, j) =>
                  s.className ? (
                    <span key={j} className={s.className}>
                      {s.text}
                    </span>
                  ) : (
                    s.text
                  ),
                )}
                {/* Keeps the line break when the code is copied. */}
                {"\n"}
              </span>
            </span>
          );
        })}
      </code>
    </pre>
  );
}
