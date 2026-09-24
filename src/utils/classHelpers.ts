import { SchoolClass } from '../types';

export const ROMAN_TO_NUMBER: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
};

export const NUMBER_TO_ROMAN: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
};

// Rombel letters A to Z (requirement 3 & 19: A-Z)
export const ROMBEL_LETTERS: string[] = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y', 'Z'
];

export const GRADE_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

/**
 * Extracts grade and section from a class name (supports both Arabic e.g. "5 B" and Roman e.g. "V B" or "Kelas 5 B")
 */
export function parseGradeAndSection(className: string): { grade: number; section: string } {
  if (!className) return { grade: 1, section: 'A' };

  const cleaned = className.replace(/^kelas\s+/i, '').trim();
  const parts = cleaned.split(/\s+/);

  if (parts.length >= 2) {
    const rawGrade = parts[0].toUpperCase();
    const section = parts.slice(1).join(' ').trim().toUpperCase();
    const grade = ROMAN_TO_NUMBER[rawGrade] || parseInt(rawGrade, 10) || 1;
    return { grade, section };
  }

  // Handle formats like "5B" or "VB"
  const match = cleaned.match(/^(VI|IV|V|III|II|I|\d+)\s*([A-Za-z]+)?$/i);
  if (match) {
    const rawGrade = match[1].toUpperCase();
    const section = (match[2] || 'A').toUpperCase();
    const grade = ROMAN_TO_NUMBER[rawGrade] || parseInt(rawGrade, 10) || 1;
    return { grade, section };
  }

  return { grade: 1, section: 'A' };
}

/**
 * Formats standard display name (e.g. 5 + B => "5 B")
 */
export function formatClassName(grade: number, section: string): string {
  const cleanSec = (section || 'A').trim().toUpperCase();
  return `${grade} ${cleanSec}`.trim();
}

/**
 * Finds a matching class from a classes array given a grade (1-6) and section (A-Z).
 * Supports:
 * - Direct grade and section match
 * - Class name matches e.g. "5 B", "V B", "Kelas 5 B", "Kelas V B"
 */
export function findMatchingClass(
  classes: SchoolClass[],
  grade: number,
  section: string
): SchoolClass | undefined {
  if (!classes || classes.length === 0) return undefined;

  const cleanSec = (section || '').trim().toUpperCase();
  const roman = NUMBER_TO_ROMAN[grade] || '';

  return classes.find((c) => {
    // 1. Direct field match if available
    const cGrade = c.grade || parseGradeAndSection(c.class_name).grade;
    if (cGrade !== grade) return false;

    const cSec = (c.section || parseGradeAndSection(c.class_name).section).toUpperCase();
    if (cSec && cSec === cleanSec) {
      return true;
    }

    // 2. Normalized class name match
    const cName = (c.class_name || c.className || '')
      .replace(/^kelas\s+/i, '')
      .trim()
      .toUpperCase();

    const expectedArabic = `${grade} ${cleanSec}`;
    const expectedRoman = roman ? `${roman} ${cleanSec}` : '';

    return cName === expectedArabic || cName === expectedRoman;
  });
}
