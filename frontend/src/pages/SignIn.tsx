import { useState, type FormEvent } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  type Location,
} from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AuthError } from "../auth/authService";
import { validateSignIn, type FieldErrors } from "../auth/validation";
import ErrorMessage from "../components/ErrorMessage";
import FormField from "../components/FormField";

export default function SignIn() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Set by RequireAuth when it bounced the user here from a protected page.
  const from =
    (location.state as { from?: Location } | null)?.from?.pathname ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={from} replace />;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const found = validateSignIn(email, password);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(
        err instanceof AuthError
          ? err.message
          : "Something went wrong. Try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h2>Sign in</h2>
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {formError && <ErrorMessage message={formError} />}
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <FormField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <button
          type="submit"
          className="button button-primary"
          disabled={submitting}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="auth-switch">
        New to StackSprint?{" "}
        <Link to="/signup" state={location.state}>
          Create an account
        </Link>
      </p>
    </section>
  );
}
