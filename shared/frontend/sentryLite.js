// Only the two Sentry functions the stores use. SentryInit imports this file
// (not '@sentry/browser' itself), so the build leaves out everything else in
// the SDK — session replay, feedback widget, tracing — which had made the
// error reporter ~150 KB of download on every page.
export { init, captureException } from '@sentry/browser';
