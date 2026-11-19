export function normalizeTitle(t?: string | null): string {
  if (!t) return '';
  return t
    .toLowerCase()
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/[^a-z0-9]/g, '');
}
