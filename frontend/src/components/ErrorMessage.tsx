type ErrorMessageProps = {
  message: string;
  // Pass this when retrying makes sense (e.g. a failed fetch) to show a button.
  onRetry?: () => void;
};

// role="alert" makes screen readers read the error out as soon as it appears.
export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="error-message" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
