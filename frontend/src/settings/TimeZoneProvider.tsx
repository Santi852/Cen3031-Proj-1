import { useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "../leetcode/apiClient";
import { TimeZoneContext } from "./TimeZoneContext";

export default function TimeZoneProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const [timeZone, setTimeZone] = useState("UTC");
  const [loaded, setLoaded] = useState(!enabled);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    apiFetch<{ timeZone: string }>("/settings/timezone").then(
      (data) => {
        if (!cancelled) {
          setTimeZone(data.timeZone);
          setLoaded(true);
        }
      },
      () => {
        if (!cancelled) {
          setError("Couldn't load your timezone. Dates are shown in UTC.");
          setLoaded(true);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  async function saveTimeZone(zone: string) {
    const data = await apiFetch<{ timeZone: string }>("/settings/timezone", {
      method: "PUT",
      body: { timeZone: zone },
    });
    setTimeZone(data.timeZone);
    setError("");
  }
  return (
    <TimeZoneContext.Provider value={{ timeZone, loaded, error, saveTimeZone }}>
      {children}
    </TimeZoneContext.Provider>
  );
}
