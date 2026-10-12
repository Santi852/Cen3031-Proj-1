import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate, type Location } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AuthError } from "../auth/authService";
import { MIN_PASSWORD_LENGTH, validateSignUp, type FieldErrors } from "../auth/validation";
import ErrorMessage from "../components/ErrorMessage";
import FormField from "../components/FormField";

export default function SignUp() {
  const { user, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location } | null)?.from?.pathname ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={from} replace />;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const found = validateSignUp(email, password, confirmPassword);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await signUp(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(err instanceof AuthError ? err.message : "Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h2>Create your account</h2>
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
          autoComplete="new-password"
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters, with a letter and a number`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <FormField
          id="confirm-password"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
        />
        <button type="submit" className="button button-primary" disabled={submitting}>
          {submitting ? "Creating account…" : "Sign up"}
        </button>
      </form>
      <p className="auth-switch">
        Already have an account?{" "}
        <Link to="/signin" state={location.state}>
          Sign in
        </Link>
      </p>
    </section>
  );
}
