import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Editor from "react-simple-code-editor";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import ErrorMessage from "../components/ErrorMessage";
import { highlight } from "../components/highlight";
import Loading from "../components/Loading";
import {
  COMPLEXITIES,
  createPost,
  getPost,
  LANGUAGES,
  MAX_CODE_LENGTH,
  MAX_NOTES_LENGTH,
  updatePost,
  type PostDraft,
} from "../leetcode/postService";

type Field = keyof PostDraft;
type FieldErrors = Partial<Record<Field, string>>;

const EMPTY_DRAFT: PostDraft = {
  language: "",
  timeComplexity: "",
  spaceComplexity: "",
  code: "",
  notes: "",
};

// Each field's input id, so a failed submit can move focus to the first
// field that needs fixing.
const FIELD_IDS: Record<Field, string> = {
  language: "post-language",
  timeComplexity: "post-time",
  spaceComplexity: "post-space",
  code: "post-code",
  notes: "post-notes",
};

function validate(draft: PostDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (!draft.language) errors.language = "Pick the language you used.";
  if (!draft.timeComplexity)
    errors.timeComplexity = "Pick the time complexity.";
  if (!draft.spaceComplexity)
    errors.spaceComplexity = "Pick the space complexity.";
  if (!draft.code.trim()) errors.code = "Paste or write your solution.";
  else if (draft.code.length > MAX_CODE_LENGTH)
    errors.code = `Code can be at most ${MAX_CODE_LENGTH.toLocaleString()} characters.`;
  if (draft.notes.length > MAX_NOTES_LENGTH)
    errors.notes = `Notes can be at most ${MAX_NOTES_LENGTH.toLocaleString()} characters.`;
  return errors;
}

// Writes a new post (/problem/:slug/new) or edits your own
// (/problem/:slug/posts/:postId/edit) (1-22).
export default function PostEditor() {
  const { slug = "", postId } = useParams();
  const editing = postId !== undefined;
  const { user } = useAuth();
  const [loaded, setLoaded] = useState<
    | { key: string; ok: true; draft: PostDraft }
    | { key: string; ok: false; message: string }
    | null
  >(null);
  const key = `${slug}:${postId ?? "new"}`;

  // Editing starts from the saved post; a new post starts empty.
  useEffect(() => {
    if (!postId) return;
    const requestKey = `${slug}:${postId}`;
    let cancelled = false;
    getPost(slug, postId).then(
      (post) => {
        if (cancelled) return;
        setLoaded(
          post.authorId === user?.id
            ? { key: requestKey, ok: true, draft: { ...post } }
            : {
                key: requestKey,
                ok: false,
                message: "You can only edit your own posts.",
              },
        );
      },
      (err: unknown) => {
        if (cancelled) return;
        setLoaded({
          key: requestKey,
          ok: false,
          message: err instanceof Error ? err.message : "Something went wrong.",
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [slug, postId, user?.id]);

  const back = (
    <Link
      to={editing ? `/problem/${slug}/posts/${postId}` : `/problem/${slug}`}
      className="back-link"
    >
      ← Cancel
    </Link>
  );

  if (editing && (!loaded || loaded.key !== key)) {
    return <Loading label="Loading your post…" />;
  }
  if (editing && loaded && !loaded.ok) {
    return (
      <section className="post-page">
        {back}
        <ErrorMessage message={loaded.message} />
      </section>
    );
  }

  return (
    <section className="post-page" aria-labelledby="editor-title">
      {back}
      <h2 id="editor-title">{editing ? "Edit your post" : "Write a post"}</h2>
      <PostForm
        // A fresh form per post, so its fields start from that post.
        key={key}
        slug={slug}
        postId={postId}
        initial={loaded?.ok ? loaded.draft : EMPTY_DRAFT}
      />
    </section>
  );
}

function PostForm({
  slug,
  postId,
  initial,
}: {
  slug: string;
  postId: string | undefined;
  initial: PostDraft;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function set<K extends Field>(field: K, value: PostDraft[K]) {
    setDraft((d) => ({ ...d, [field]: value }));
    // Clear a field's message as soon as it's touched again.
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  }

  // react-simple-code-editor doesn't pass aria props to its <textarea>, so
  // they're set directly. Screen readers then announce the code error too.
  useEffect(() => {
    const textarea = document.getElementById(FIELD_IDS.code);
    if (!textarea) return;
    if (errors.code) {
      textarea.setAttribute("aria-invalid", "true");
      textarea.setAttribute(
        "aria-describedby",
        `${FIELD_IDS.code}-hint ${FIELD_IDS.code}-error`,
      );
    } else {
      textarea.removeAttribute("aria-invalid");
      textarea.setAttribute("aria-describedby", `${FIELD_IDS.code}-hint`);
    }
  }, [errors.code]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const found = validate(draft);
    setErrors(found);
    const firstInvalid = (Object.keys(FIELD_IDS) as Field[]).find(
      (f) => found[f],
    );
    if (firstInvalid) {
      document.getElementById(FIELD_IDS[firstInvalid])?.focus();
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const post = postId
        ? await updatePost(slug, postId, draft, user.id)
        : await createPost(slug, draft, user);
      navigate(`/problem/${slug}/posts/${post.id}`, { replace: true });
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Couldn't save. Try again.",
      );
      setSaving(false);
    }
  }

  return (
    <form
      className="post-form"
      onSubmit={(e) => void handleSubmit(e)}
      noValidate
    >
      {saveError && <ErrorMessage message={saveError} />}

      <div className="post-form-selects">
        <SelectField
          field="language"
          label="Language"
          value={draft.language}
          options={LANGUAGES}
          error={errors.language}
          disabled={saving}
          onChange={(v) => set("language", v as PostDraft["language"])}
        />
        <SelectField
          field="timeComplexity"
          label="Time complexity"
          value={draft.timeComplexity}
          options={COMPLEXITIES}
          error={errors.timeComplexity}
          disabled={saving}
          onChange={(v) =>
            set("timeComplexity", v as PostDraft["timeComplexity"])
          }
        />
        <SelectField
          field="spaceComplexity"
          label="Space complexity"
          value={draft.spaceComplexity}
          options={COMPLEXITIES}
          error={errors.spaceComplexity}
          disabled={saving}
          onChange={(v) =>
            set("spaceComplexity", v as PostDraft["spaceComplexity"])
          }
        />
      </div>

      <LabeledField field="code" label="Code" error={errors.code}>
        <p id={`${FIELD_IDS.code}-hint`} className="field-hint">
          Tab indents. Press Esc, then Tab, to leave the editor.
        </p>
        <Editor
          value={draft.code}
          onValueChange={(code) => set("code", code)}
          // Highlights as you type, in the language picked above.
          highlight={(code) => highlight(code, draft.language)}
          textareaId={FIELD_IDS.code}
          className={
            errors.code ? "code-editor code-editor-invalid" : "code-editor"
          }
          tabSize={4}
          insertSpaces
          padding={12}
          disabled={saving}
          placeholder="Paste your solution here"
        />
      </LabeledField>

      <LabeledField field="notes" label="Notes (optional)" error={errors.notes}>
        <textarea
          id={FIELD_IDS.notes}
          rows={4}
          value={draft.notes}
          onChange={(e) => set("notes", e.target.value)}
          aria-invalid={errors.notes ? true : undefined}
          aria-describedby={
            errors.notes ? `${FIELD_IDS.notes}-error` : undefined
          }
          disabled={saving}
          placeholder="Your approach, trade-offs, what tripped you up…"
        />
      </LabeledField>

      <button type="submit" className="button button-primary" disabled={saving}>
        {saving ? "Saving…" : postId ? "Save changes" : "Post solution"}
      </button>
    </form>
  );
}

// Label + control + error. The label points at the control by id; the code
// editor's <textarea> gets that id through textareaId.
function LabeledField({
  field,
  label,
  error,
  children,
}: {
  field: Field;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="form-field">
      <label htmlFor={FIELD_IDS[field]}>{label}</label>
      {children}
      {error && (
        <p id={`${FIELD_IDS[field]}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

function SelectField({
  field,
  label,
  value,
  options,
  error,
  disabled,
  onChange,
}: {
  field: Field;
  label: string;
  value: string;
  options: readonly { value: string; label: string }[];
  error?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const id = FIELD_IDS[field];
  return (
    <LabeledField field={field} label={label} error={error}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        disabled={disabled}
      >
        <option value="">Choose…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </LabeledField>
  );
}
