// Apply the saved theme before paint to avoid a light-mode flash.
// (A file, not an inline script, so the Content Security Policy can forbid inline scripts.)
try {
  if (localStorage.getItem('ofk-theme') === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  }
} catch (e) {
  /* storage unavailable (private mode) */
}
