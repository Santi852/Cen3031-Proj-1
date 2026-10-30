import { useEffect, useState } from "react";

export default function DemoBanner() {
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/health", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { dataSource?: string }) => {
        if (!cancelled) setDemo(data.dataSource === "demo");
      })
      .catch(() => {
        /* The existing API status shows connection errors. */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return demo ? (
    <p role="status" className="demo-banner">
      Demo data · LeetCode profiles, solves and rankings are simulated.
    </p>
  ) : null;
}
