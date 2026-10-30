import { useEffect, useState } from "react";

// "checking..." until the backend answers, then "ok" or "unreachable".
// Used by the signed-out footer (Hussain's Playwright smoke test looks for
// "API: ok" there) and by the Profile page.
export function useApiStatus() {
  const [status, setStatus] = useState("checking...");

  useEffect(() => {
    let cancelled = false;
    // Relative URL, like the auth calls: Vite's dev proxy forwards /api to
    // the backend. A hard-coded localhost:3001 broke on other devices, where
    // "localhost" means the phone, not the dev machine.
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: { status: string }) => {
        if (!cancelled) setStatus(data.status);
      })
      .catch(() => {
        if (!cancelled) setStatus("unreachable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}
