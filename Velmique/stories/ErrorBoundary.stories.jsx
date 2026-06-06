import ErrorBoundary from '@/components/ui/ErrorBoundary';

function Boom({ shouldBoom = true }) {
  if (shouldBoom) throw new Error('Intentional render error for the ErrorBoundary story');
  return <p>This child rendered fine.</p>;
}

export default {
  title: 'UI/ErrorBoundary',
  component: ErrorBoundary,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

/**
 * The "Crashed" story renders a child that throws, so the boundary's
 * fallback UI (apologise screen, try-again, copy details, support link)
 * is the visible state.
 */
export const Crashed = {
  render: () => (
    <ErrorBoundary>
      <Boom />
    </ErrorBoundary>
  ),
};

export const Healthy = {
  render: () => (
    <ErrorBoundary>
      <Boom shouldBoom={false} />
    </ErrorBoundary>
  ),
};
