import { SchoolClass, Student } from '../types';

export interface ExtractedStudentRow {
  rowNumber: number;
  rawNis: string;
  rawNisn: string;
  rawName: string;
  rawGender: string;
  rawClass: string;
  originalRow: Record<string, any>;
}

export interface ValidatedImportRow {
  rowNumber: number;
  nis: string;
  nisn: string;
  name: string;
  gender: 'L' | 'P';
  rawGender: string;
  classId: string;
  className: string;
  rawClass: string;
  isValid: boolean;
  reason?: string;
  error?: string;
}

/**
 * Normalizes gender value:
 * L / Laki-laki / Male / 1 -> 'L'
 * P / Perempuan / Female / 2 -> 'P'
 */
export function normalizeGender(val: any): { gender: 'L' | 'P'; raw: string; isValid: boolean } {
  const raw = String(val ?? '').trim();
  const lower = raw.toLowerCase().replace(/[\s\-_]/g, '');

  if (!lower) {
    return { gender: 'L', raw: '', isValid: false };
  }

  if (['l', 'lakilaki', 'laki', 'pria', 'male', 'm', '1', 'lk'].includes(lower)) {
    return { gender: 'L', raw, isValid: true };
  }

  if (['p', 'perempuan', 'wanita', 'female', 'f', '2', 'pr'].includes(lower)) {
    return { gender: 'P', raw, isValid: true };
  }

  return { gender: 'L', raw, isValid: false };
}

/**
 * Normalizes class representation and matches against database classes.
 * Handles "V B", "VB", "5B", "Kelas V B", "Kelas 5-B", "cls_v_b", etc.
 */
export function matchClass(
  rawClass: string | undefined | null,
  classes: SchoolClass[],
  fallbackClassId?: string
): SchoolClass | null {
  // If a valid fallbackClassId is provided, check if it exists in classes
  if (fallbackClassId) {
    const found = classes.find((c) => c.id === fallbackClassId);
    if (found) return found;
  }

  if (!rawClass) return null;
  const str = String(rawClass).trim();
  if (!str) return null;

  // 1. Direct ID match (e.g. cls_v_b)
  const byId = classes.find((c) => c.id.toLowerCase() === str.toLowerCase());
  if (byId) return byId;

  // 2. Direct Name match (e.g. "V B")
  const byName = classes.find((c) => c.class_name.toLowerCase() === str.toLowerCase());
  if (byName) return byName;

  // 3. Normalized string comparison (remove "kelas", "ruang", "rombel", spaces, dashes)
  const cleanStr = (s: string) =>
    s
      .toLowerCase()
      .replace(/\b(kelas|ruang|rombel|rombongan\s*belajar)\b/gi, '')
      .replace(/[\s\-_]/g, '');

  const cleanedTarget = cleanStr(str);

  for (const c of classes) {
    if (cleanStr(c.class_name) === cleanedTarget || cleanStr(c.id) === cleanedTarget) {
      return c;
    }
  }

  // 4. Convert Arabic numerals (1..6) to Roman numerals (i..vi)
  const romanMap: Record<string, string> = {
    '1': 'i',
    '2': 'ii',
    '3': 'iii',
    '4': 'iv',
    '5': 'v',
    '6': 'vi',
  };

  let convertedRoman = cleanedTarget;
  for (const [arabic, roman] of Object.entries(romanMap)) {
    if (convertedRoman.startsWith(arabic)) {
      convertedRoman = roman + convertedRoman.slice(arabic.length);
      break;
    }
  }

  for (const c of classes) {
    if (cleanStr(c.class_name) === convertedRoman) {
      return c;
    }
  }

  // 5. Convert Roman numerals to Arabic numerals
  const arabicMap: Record<string, string> = {
    'vi': '6',
    'iv': '4',
    'v': '5',
    'iii': '3',
    'ii': '2',
    'i': '1',
  };

  let convertedArabic = cleanedTarget;
  for (const [roman, arabic] of Object.entries(arabicMap)) {
    if (convertedArabic.startsWith(roman)) {
      convertedArabic = arabic + convertedArabic.slice(roman.length);
      break;
    }
  }

  for (const c of classes) {
    const cClean = cleanStr(c.class_name);
    let cArabic = cClean;
    for (const [roman, arabic] of Object.entries(arabicMap)) {
      if (cArabic.startsWith(roman)) {
        cArabic = arabic + cArabic.slice(roman.length);
        break;
      }
    }
    if (cArabic === convertedArabic) {
      return c;
    }
  }

  return null;
}

/**
 * Extracts fields from any row object, regardless of header casing or variation.
 */
export function extractFieldsFromRow(
  row: Record<string, any>,
  rowNumber: number
): ExtractedStudentRow {
  let rawNis = '';
  let rawNisn = '';
  let rawName = '';
  let rawGender = '';
  let rawClass = '';

  for (const [k, v] of Object.entries(row)) {
    const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    const valStr = String(v ?? '').trim();

    // Check NISN first before NIS
    if (
      cleanKey === 'nisn' ||
      cleanKey.startsWith('nisn') ||
      cleanKey.includes('nomorinduksiswanasional')
    ) {
      if (!rawNisn && valStr) rawNisn = valStr;
    } else if (
      cleanKey === 'nis' ||
      cleanKey === 'nissiswa' ||
      cleanKey === 'noinduk' ||
      cleanKey === 'nomorinduk' ||
      cleanKey === 'nomorinduksiswa' ||
      cleanKey === 'nisnnis'
    ) {
      if (!rawNis && valStr) rawNis = valStr;
    } else if (
      cleanKey === 'nama' ||
      cleanKey === 'namasiswa' ||
      cleanKey === 'namapesertadidik' ||
      cleanKey === 'namalengkap' ||
      cleanKey === 'studentname' ||
      cleanKey === 'name' ||
      cleanKey === 'fullname' ||
      cleanKey === 'namamurid'
    ) {
      if (!rawName && valStr) rawName = valStr;
    } else if (
      cleanKey === 'lp' ||
      cleanKey === 'jeniskelamin' ||
      cleanKey === 'jk' ||
      cleanKey === 'gender' ||
      cleanKey === 'sex' ||
      cleanKey === 'kelamin'
    ) {
      if (!rawGender && valStr) rawGender = valStr;
    } else if (
      cleanKey === 'kelas' ||
      cleanKey === 'rombel' ||
      cleanKey === 'rombonganbelajar' ||
      cleanKey === 'ruangkelas' ||
      cleanKey === 'class' ||
      cleanKey === 'grade' ||
      cleanKey === 'tingkat' ||
      cleanKey === 'classid' ||
      cleanKey === 'classname'
    ) {
      if (!rawClass && valStr) rawClass = valStr;
    }
  }

  // Direct fallbacks if standard properties exist
  if (!rawNis && row.nis !== undefined) rawNis = String(row.nis).trim();
  if (!rawNisn && row.nisn !== undefined) rawNisn = String(row.nisn).trim();
  if (!rawName && row.name !== undefined) rawName = String(row.name).trim();
  if (!rawGender && row.gender !== undefined) rawGender = String(row.gender).trim();
  if (!rawClass && (row.class_id || row.class_name || row.class)) {
    rawClass = String(row.class_id || row.class_name || row.class).trim();
  }

  return {
    rowNumber,
    rawNis,
    rawNisn,
    rawName,
    rawGender,
    rawClass,
    originalRow: row,
  };
}

/**
 * Validates a list of extracted rows against existing students and classes.
 */
export function validateStudentRows(
  extractedRows: ExtractedStudentRow[],
  classes: SchoolClass[],
  existingStudents: Student[],
  defaultClassId?: string
): ValidatedImportRow[] {
  const existingNisMap = new Map<string, Student>();
  const existingNisnMap = new Map<string, Student>();

  existingStudents.forEach((s) => {
    if (s.status === 'active') {
      if (s.nis) existingNisMap.set(String(s.nis).trim(), s);
      if (s.nisn && s.nisn !== '-') existingNisnMap.set(String(s.nisn).trim(), s);
    }
  });

  const fileNisSet = new Set<string>();
  const fileNisnSet = new Set<string>();

  return extractedRows.map((row) => {
    const { rowNumber, rawNis, rawNisn, rawName, rawGender, rawClass } = row;

    // Check if entire row is empty
    if (!rawNis && !rawNisn && !rawName && !rawGender && !rawClass) {
      return {
        rowNumber,
        nis: '',
        nisn: '-',
        name: '',
        gender: 'L',
        rawGender: '',
        classId: '',
        className: '',
        rawClass: '',
        isValid: false,
        reason: 'Baris kosong.',
        error: 'Baris kosong.',
      };
    }

    // 1. Validate Name
    if (!rawName) {
      return {
        rowNumber,
        nis: rawNis,
        nisn: rawNisn || '-',
        name: '',
        gender: 'L',
        rawGender,
        classId: '',
        className: '',
        rawClass,
        isValid: false,
        reason: 'Nama siswa wajib diisi.',
        error: 'Nama siswa wajib diisi.',
      };
    }

    // 2. Validate NIS
    if (!rawNis) {
      return {
        rowNumber,
        nis: '',
        nisn: rawNisn || '-',
        name: rawName,
        gender: 'L',
        rawGender,
        classId: '',
        className: '',
        rawClass,
        isValid: false,
        reason: 'NIS wajib diisi.',
        error: 'NIS wajib diisi.',
      };
    }

    // Duplicate NIS in existing database
    if (existingNisMap.has(rawNis)) {
      const existing = existingNisMap.get(rawNis);
      return {
        rowNumber,
        nis: rawNis,
        nisn: rawNisn || '-',
        name: rawName,
        gender: 'L',
        rawGender,
        classId: '',
        className: '',
        rawClass,
        isValid: false,
        reason: `NIS ${rawNis} sudah terdaftar di database (Siswa: ${existing?.name || '-'}).`,
        error: `NIS ${rawNis} sudah terdaftar di database (Siswa: ${existing?.name || '-'}).`,
      };
    }

    // Duplicate NIS within this file
    if (fileNisSet.has(rawNis)) {
      return {
        rowNumber,
        nis: rawNis,
        nisn: rawNisn || '-',
        name: rawName,
        gender: 'L',
        rawGender,
        classId: '',
        className: '',
        rawClass,
        isValid: false,
        reason: `NIS ${rawNis} duplikat di dalam file Excel ini.`,
        error: `NIS ${rawNis} duplikat di dalam file Excel ini.`,
      };
    }

    // 3. Validate NISN if provided
    const cleanNisn = rawNisn && rawNisn !== '-' ? rawNisn : '-';
    if (cleanNisn !== '-') {
      if (existingNisnMap.has(cleanNisn)) {
        const existing = existingNisnMap.get(cleanNisn);
        return {
          rowNumber,
          nis: rawNis,
          nisn: cleanNisn,
          name: rawName,
          gender: 'L',
          rawGender,
          classId: '',
          className: '',
          rawClass,
          isValid: false,
          reason: `NISN ${cleanNisn} sudah terdaftar di database (Siswa: ${existing?.name || '-'}).`,
          error: `NISN ${cleanNisn} sudah terdaftar di database (Siswa: ${existing?.name || '-'}).`,
        };
      }

      if (fileNisnSet.has(cleanNisn)) {
        return {
          rowNumber,
          nis: rawNis,
          nisn: cleanNisn,
          name: rawName,
          gender: 'L',
          rawGender,
          classId: '',
          className: '',
          rawClass,
          isValid: false,
          reason: `NISN ${cleanNisn} duplikat di dalam file Excel ini.`,
          error: `NISN ${cleanNisn} duplikat di dalam file Excel ini.`,
        };
      }
    }

    // 4. Validate Gender
    const gResult = normalizeGender(rawGender);
    if (!gResult.isValid && rawGender) {
      return {
        rowNumber,
        nis: rawNis,
        nisn: cleanNisn,
        name: rawName,
        gender: 'L',
        rawGender,
        classId: '',
        className: '',
        rawClass,
        isValid: false,
        reason: `Jenis kelamin '${rawGender}' tidak valid (harus L atau P).`,
        error: `Jenis kelamin '${rawGender}' tidak valid (harus L atau P).`,
      };
    }

    // 5. Match Class
    const targetClass = matchClass(rawClass, classes, defaultClassId);
    if (!targetClass) {
      const reasonMsg = rawClass
        ? `Kelas '${rawClass}' tidak ditemukan di database.`
        : 'Kelas tidak ditentukan. Pilih kelas tujuan di atas atau sertakan kolom Kelas pada Excel.';
      return {
        rowNumber,
        nis: rawNis,
        nisn: cleanNisn,
        name: rawName,
        gender: gResult.gender,
        rawGender,
        classId: '',
        className: '',
        rawClass,
        isValid: false,
        reason: reasonMsg,
        error: reasonMsg,
      };
    }

    // All valid!
    fileNisSet.add(rawNis);
    if (cleanNisn !== '-') fileNisnSet.add(cleanNisn);

    return {
      rowNumber,
      nis: rawNis,
      nisn: cleanNisn,
      name: rawName,
      gender: gResult.gender,
      rawGender,
      classId: targetClass.id,
      className: targetClass.class_name,
      rawClass,
      isValid: true,
    };
  });
}
