/* Theme initialization to prevent dark mode flash on page load */
(function() {
  try {
    const theme = localStorage.getItem('theme');
    const html = document.documentElement;

    if (theme === 'dark') {
      html.setAttribute('data-theme', 'dark');
      html.classList.add('dark');
    } else if (theme === 'light') {
      html.setAttribute('data-theme', 'light');
      html.classList.remove('dark');
    } else {
      // Use system preference
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        html.setAttribute('data-theme', 'dark');
        html.classList.add('dark');
      } else {
        html.setAttribute('data-theme', 'light');
        html.classList.remove('dark');
      }
    }
  } catch (e) {
    // Silently fail if localStorage is not available
  }
})();
