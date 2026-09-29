import { useEffect, useState } from "react";

// Moved here from App.tsx. Hussain's Playwright smoke test asserts on the
// text "API: ok" at "/", so this check has to stay reachable on this page.
export default function Dashboard() {
  const [apiStatus, setApiStatus] = useState("checking...");

  useEffect(() => {
    fetch("http://localhost:3001/api/health")
      .then((res) => res.json())
      .then((data) => setApiStatus(data.status))
      .catch(() => setApiStatus("unreachable"));
  }, []);

  return (
    <section>
      <h2>Dashboard</h2>
      <p>API: {apiStatus}</p>
    </section>
  );
}
