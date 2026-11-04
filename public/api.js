export function searchUrl(term) {
  return `/api/search?q=${encodeURIComponent(term)}`;
}
