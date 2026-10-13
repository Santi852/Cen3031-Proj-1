import { useAuth } from "../auth/AuthContext";

// The API health check that used to live here moved to the Layout footer
// (see the comment there).
export default function Dashboard() {
  const { user } = useAuth();

  return (
    <section>
      <h2>Dashboard</h2>
      <p>Signed in as {user?.email}.</p>
    </section>
  );
}
