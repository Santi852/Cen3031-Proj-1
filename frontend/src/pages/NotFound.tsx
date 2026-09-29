import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section>
      <h2>Page not found</h2>
      <p>
        That page doesn&rsquo;t exist. <Link to="/">Back to dashboard</Link>
      </p>
    </section>
  );
}
