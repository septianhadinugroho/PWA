export function navigateWithTransition(page) {
  if (!document.startViewTransition) {
    window.location.hash = `#/${page}`;
    return;
  }

  document.startViewTransition(() => {
    window.location.hash = `#/${page}`;
  });
}