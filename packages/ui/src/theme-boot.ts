export const theme_storage_key = 'blog.theme';
export const locale_storage_key = 'blog.interface-language';

export const theme_boot_script = `(function () {
  try {
    var theme = localStorage.getItem('${theme_storage_key}');
    var locale = localStorage.getItem('${locale_storage_key}');
    var root = document.documentElement;
    var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    var system_dark = media ? media.matches : false;
    var dark = theme === 'dark' || ((theme === null || theme === 'system') && system_dark);
    root.classList.remove('light', 'dark');
    if (theme === 'light') {
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
    } else if (dark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    }
    if (locale === 'en' || locale === 'sr-Latn' || locale === 'ru') {
      root.lang = locale;
    }
  } catch (error) {
    void error;
  }
})();`;
