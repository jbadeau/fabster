import { useEffect, useState } from 'react';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  linkPlugin,
  tablePlugin,
  codeBlockPlugin,
  codeMirrorPlugin,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';

// Languages used by skill guides; unknown languages fall back to "text".
const CODE_BLOCK_LANGUAGES: Record<string, string> = {
  '': 'Text',
  text: 'Text',
  js: 'JavaScript',
  jsx: 'JSX',
  ts: 'TypeScript',
  tsx: 'TSX',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  python: 'Python',
  py: 'Python',
  bash: 'Bash',
  sh: 'Shell',
  shell: 'Shell',
  html: 'HTML',
  css: 'CSS',
  md: 'Markdown',
  markdown: 'Markdown',
};

/** Track the app's dark mode (shadcn toggles a `.dark` class on <html>). */
function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(
    () =>
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark'),
  );
  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() =>
      setIsDark(el.classList.contains('dark')),
    );
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

/** Heavy MDXEditor render, loaded lazily so it stays out of the main bundle. */
export default function MarkdownViewImpl({ markdown }: { markdown: string }) {
  const isDark = useIsDark();
  return (
    <MDXEditor
      markdown={markdown}
      readOnly
      className={isDark ? 'dark-theme' : undefined}
      contentEditableClassName="fabster-markdown"
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        linkPlugin(),
        tablePlugin(),
        codeBlockPlugin({ defaultCodeBlockLanguage: 'text' }),
        codeMirrorPlugin({ codeBlockLanguages: CODE_BLOCK_LANGUAGES }),
      ]}
    />
  );
}
