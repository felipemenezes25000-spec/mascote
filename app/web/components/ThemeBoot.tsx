// Inline script that sets data-theme on <html> before paint to avoid FOUC.
// Reads localStorage and prefers-color-scheme.
export function ThemeBoot() {
  const code = `(function(){try{var t=localStorage.getItem('mascote-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
