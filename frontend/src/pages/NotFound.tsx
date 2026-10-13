import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState";

export default function NotFound() {
  return (
    <section>
      <h2>Page not found</h2>
      <EmptyState
        title="That page doesn’t exist."
        action={
          <Link className="button button-secondary" to="/">
            Back to dashboard
          </Link>
        }
      />
    </section>
  );
}
