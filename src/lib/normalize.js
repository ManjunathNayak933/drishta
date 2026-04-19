/**
 * DRISHTA — Name & Data Normalisation
 * Standard: Title Case, no dots between initials, single spaces.
 * Used by ALL scrapers before storing to DB.
 */

const STRIP_PREFIXES = /^(shri|smt|dr|prof|adv|kumari|sh|mr|mrs|ms|late|col|capt|maj|brig|lt|gen|er|ex)\b\s*/gi;
const LOWER_WORDS = new Set(['and','of','the','in','for','at','by','to','from','on','with','a','an']);

export function toTitleCase(str) {
  if (!str) return '';
  return str
    .replace(/\b([A-Za-z])\.([A-Za-z])/g, '$1 $2') // D.K. → D K
    .replace(/\b([A-Za-z])\.\s*/g, '$1 ')           // trailing dot after initial
    .replace(/\s+/g, ' ').trim()
    .split(' ')
    .filter(Boolean)
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (i > 0 && LOWER_WORDS.has(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function normalizeName(str) {
  if (!str) return '';
  const stripped = str.replace(STRIP_PREFIXES, '').trim();
  return toTitleCase(stripped);
}

export function normalizeConstituency(str) {
  if (!str) return toTitleCase(str ?? '');
}

export function normalizeParty(str) {
  if (!str) return '';
  return str.replace(/\s+/g, ' ').trim();
}
