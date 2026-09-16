import { Component, lazy, Suspense, type ReactNode } from 'react';

// MDXEditor pulls in lexical + codemirror — load it only when a guide is shown.
const MarkdownViewImpl = lazy(() => import('./markdown-view-impl'));

/**
 * MDXEditor renders rich markdown but can throw on content it can't parse
 * (e.g. an unregistered code-fence language or stray JSX-like syntax). Fall
 * back to raw text so a single skill never blanks the page.
 */
class MarkdownErrorBoundary extends Component<
  { markdown: string; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (this.state.failed) {
      return (
        <pre className="whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed">
          {this.props.markdown}
        </pre>
      );
    }
    return this.props.children;
  }
}

/** Read-only markdown rendered with MDXEditor (https://mdxeditor.dev). */
export function MarkdownView({ markdown }: { markdown: string }) {
  return (
    <MarkdownErrorBoundary markdown={markdown}>
      <Suspense
        fallback={<div className="p-4 text-sm text-muted-foreground">Rendering…</div>}
      >
        <MarkdownViewImpl markdown={markdown} />
      </Suspense>
    </MarkdownErrorBoundary>
  );
}
