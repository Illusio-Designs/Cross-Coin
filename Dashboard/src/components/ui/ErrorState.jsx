import clsx from '../Dashboard/primitives/_clsx';

/**
 * ErrorState — a load failed; say what in plain words and offer a retry.
 *
 *   <ErrorState message="Couldn’t load payments — the server didn’t answer." onRetry={refetch} retrying={isFetching} />
 */
export default function ErrorState({
  message = 'Something went wrong while loading this.',
  onRetry,
  retrying = false,
  retryLabel = 'Try again',
  className,
}) {
  return (
    <div className={clsx('ui-error', className)} role="alert">
      <span className="ui-error__msg">{message}</span>
      {onRetry && (
        <button type="button" className="ui-error__retry" onClick={onRetry} disabled={retrying} aria-busy={retrying || undefined}>
          {retrying ? 'Trying again…' : retryLabel}
        </button>
      )}
    </div>
  );
}
