import { useState, type FormEvent } from "react";
import ErrorMessage from "../components/ErrorMessage";
import { useTimeZone } from "./TimeZoneContext";

const zones = ["UTC", ...Intl.supportedValuesOf("timeZone")];
export default function TimeZoneSettings() {
  const { timeZone, loaded, error, saveTimeZone } = useTimeZone();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setSaveError("");
    try {
      await saveTimeZone(draft || timeZone);
      setDraft("");
      setMessage("Timezone saved.");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Couldn't save your timezone.",
      );
    } finally {
      setBusy(false);
    }
  }
  const options = zones.includes(timeZone) ? zones : [timeZone, ...zones];
  return (
    <section className="profile-card" aria-labelledby="timezone-title">
      <h3 id="timezone-title">Date and time</h3>
      <p>
        Dates use your selected timezone. Weekly competitions reset on Monday at
        00:00 UTC.
      </p>
      <form className="auth-form" onSubmit={(event) => void save(event)}>
        <label htmlFor="time-zone">Timezone</label>
        <select
          id="time-zone"
          value={draft || timeZone}
          onChange={(event) => {
            setDraft(event.target.value);
            setMessage("");
          }}
          disabled={!loaded || busy}
        >
          {options.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <button
          className="button button-secondary"
          type="submit"
          disabled={!loaded || busy}
        >
          {busy ? "Saving…" : "Save timezone"}
        </button>
      </form>
      {(saveError || error) && <ErrorMessage message={saveError || error} />}
      <p role="status">{message}</p>
    </section>
  );
}
