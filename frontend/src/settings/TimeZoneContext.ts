import { createContext, useContext } from "react";

export type TimeZoneValue = {
  timeZone: string;
  loaded: boolean;
  error: string;
  saveTimeZone: (timeZone: string) => Promise<void>;
};
export const TimeZoneContext = createContext<TimeZoneValue | null>(null);
export function useTimeZone() {
  const value = useContext(TimeZoneContext);
  if (!value) throw new Error("TimeZoneProvider is required.");
  return value;
}
