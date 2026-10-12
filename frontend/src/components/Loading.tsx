// Show while data is being fetched. role="status" makes screen readers
// announce the label without stealing focus.
export default function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="state" role="status">
      <span className="spinner" aria-hidden="true" />
      <p className="state-message">{label}</p>
    </div>
  );
}
