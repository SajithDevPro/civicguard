/**
 * CivicGuard Serial Number Normalization & Algorithmic Matching Utility
 * High-precision string sanitization, Levenshtein edit distance, OCR confusion weighting,
 * and fuzzy similarity scoring for asset recovery and anti-fencing verification.
 */

/**
 * Normalizes a serial number, VIN, IMEI, or SKU by removing all
 * non-alphanumeric characters (spaces, hyphens, slashes, punctuation)
 * and converting to uppercase.
 * 
 * Example: " ABC - 123 / XYZ-01 " -> "ABC123XYZ01"
 */
export function normalizeSerial(str?: string | null): string {
  if (!str) return '';
  return str.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Computes the Levenshtein distance (minimum single-character edits: insertions,
 * deletions, or substitutions) between two strings.
 * Space-optimized O(min(m, n)) implementation.
 */
export function calculateLevenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let s1 = a;
  let s2 = b;
  if (s1.length > s2.length) {
    s1 = b;
    s2 = a;
  }

  const m = s1.length;
  const n = s2.length;
  let prevRow = new Array(m + 1);
  let currRow = new Array(m + 1);

  for (let i = 0; i <= m; i++) {
    prevRow[i] = i;
  }

  for (let j = 1; j <= n; j++) {
    currRow[0] = j;
    const char2 = s2[j - 1];

    for (let i = 1; i <= m; i++) {
      const char1 = s1[i - 1];
      const cost = char1 === char2 ? 0 : 1;

      currRow[i] = Math.min(
        currRow[i - 1] + 1, // Insertion
        prevRow[i] + 1, // Deletion
        prevRow[i - 1] + cost // Substitution
      );
    }

    // Swap rows
    for (let i = 0; i <= m; i++) {
      prevRow[i] = currRow[i];
    }
  }

  return prevRow[m];
}

/**
 * Checks if two characters are commonly confused OCR / transcription pairs
 * (e.g., '0' and 'O', '1' and 'I'/'L', '8' and 'B', '5' and 'S').
 */
function isOcrConfusedPair(charA: string, charB: string): boolean {
  const confusions: Record<string, string[]> = {
    '0': ['O', 'Q', 'D'],
    'O': ['0', 'Q', 'D'],
    '1': ['I', 'L', 'T'],
    'I': ['1', 'L', 'T'],
    'L': ['1', 'I'],
    '8': ['B'],
    'B': ['8'],
    '5': ['S'],
    'S': ['5'],
    '2': ['Z'],
    'Z': ['2'],
    'V': ['U'],
    'U': ['V'],
  };

  return confusions[charA]?.includes(charB) ?? false;
}

/**
 * Calculates similarity percentage (0 to 100%) between two raw or normalized serial strings.
 * Incorporates OCR confusion heuristics to reward near-identical matches with common letter/number mixups.
 */
export function calculateSimilarityScore(rawA: string, rawB: string): number {
  const a = normalizeSerial(rawA);
  const b = normalizeSerial(rawB);

  if (!a || !b) return 0;
  if (a === b) return 100;

  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;

  // Check for OCR substitution discount
  let rawDistance = calculateLevenshteinDistance(a, b);

  // If length is the same or differs by at most 1, inspect character differences for OCR pairs
  if (Math.abs(a.length - b.length) <= 1 && rawDistance <= 2) {
    let ocrBonus = 0;
    const minLen = Math.min(a.length, b.length);
    for (let i = 0; i < minLen; i++) {
      if (a[i] !== b[i] && isOcrConfusedPair(a[i], b[i])) {
        ocrBonus += 0.5; // Half-cost substitution for OCR-confusable glyphs
      }
    }
    rawDistance = Math.max(0, rawDistance - ocrBonus);
  }

  const similarity = Math.max(0, (1 - rawDistance / maxLen) * 100);
  return Math.round(similarity * 10) / 10;
}

export interface SerialMatchEvaluation {
  isMatch: boolean;
  confidence: number; // 0 - 100
  matchType: 'exact' | 'fuzzy' | 'none';
  normalizedA: string;
  normalizedB: string;
}

/**
 * Evaluates whether two serial numbers match and assigns a classification.
 * - Exact Match: 100% confidence
 * - Fuzzy Match: >= 80% confidence (typically 1-2 char typo / OCR confusion)
 * - None: < 80% confidence
 */
export function evaluateSerialMatch(rawA: string, rawB: string): SerialMatchEvaluation {
  const normA = normalizeSerial(rawA);
  const normB = normalizeSerial(rawB);

  if (!normA || !normB) {
    return {
      isMatch: false,
      confidence: 0,
      matchType: 'none',
      normalizedA: normA,
      normalizedB: normB,
    };
  }

  if (normA === normB) {
    return {
      isMatch: true,
      confidence: 100,
      matchType: 'exact',
      normalizedA: normA,
      normalizedB: normB,
    };
  }

  const score = calculateSimilarityScore(normA, normB);
  if (score >= 80) {
    return {
      isMatch: true,
      confidence: score,
      matchType: 'fuzzy',
      normalizedA: normA,
      normalizedB: normB,
    };
  }

  return {
    isMatch: false,
    confidence: score,
    matchType: 'none',
    normalizedA: normA,
    normalizedB: normB,
  };
}

export interface DiffSegment {
  char: string;
  status: 'matched' | 'mismatched' | 'ocr_similar';
}

/**
 * Character-by-character alignment utility for side-by-side visual comparison in UI.
 */
export function alignSerialsForDiff(
  strA: string,
  strB: string
): { segmentsA: DiffSegment[]; segmentsB: DiffSegment[] } {
  const normA = normalizeSerial(strA);
  const normB = normalizeSerial(strB);

  const segmentsA: DiffSegment[] = [];
  const segmentsB: DiffSegment[] = [];

  const maxLen = Math.max(normA.length, normB.length);

  for (let i = 0; i < maxLen; i++) {
    const charA = normA[i] || '';
    const charB = normB[i] || '';

    if (charA === charB) {
      if (charA) segmentsA.push({ char: charA, status: 'matched' });
      if (charB) segmentsB.push({ char: charB, status: 'matched' });
    } else if (isOcrConfusedPair(charA, charB)) {
      if (charA) segmentsA.push({ char: charA, status: 'ocr_similar' });
      if (charB) segmentsB.push({ char: charB, status: 'ocr_similar' });
    } else {
      if (charA) segmentsA.push({ char: charA, status: 'mismatched' });
      if (charB) segmentsB.push({ char: charB, status: 'mismatched' });
    }
  }

  return { segmentsA, segmentsB };
}
