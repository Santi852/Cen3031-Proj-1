import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  message?: string;
  // Optional next step, e.g. <Link className="button button-primary" to="/link-account">Link account</Link>
  action?: ReactNode;
};

// Show when a request succeeded but there's nothing to display yet.
export default function EmptyState({
  title,
  message,
  action,
}: EmptyStateProps) {
  return (
    <div className="state">
      <p className="state-title">{title}</p>
      {message && <p className="state-message">{message}</p>}
      {action}
    </div>
  );
}
