import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DailyReport, SchoolSettings } from '../types';

/**
 * Format YYYY-MM-DD to Indonesian formal date: e.g. "13 Oktober 2026"
 */
export function formatIndonesianDate(dateStr?: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  if (monthIdx >= 0 && monthIdx < 12 && !isNaN(day)) {
    return `${day} ${months[monthIdx]} ${year}`;
  }
  return dateStr;
}

/**
 * Asynchronous image loader with anonymous CORS
 */
async function loadLogoElement(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * -------------------------------------------------------------
 * 1. EXPORT REKAPITULASI PIKET TO EXCEL (.xlsx)
 * -------------------------------------------------------------
 */
export function exportRekapToExcel(
  reports: DailyReport[],
  settings: SchoolSettings,
  filterInfo?: { startDate?: string; endDate?: string; className?: string }
) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet 1: Rekapitulasi Ringkasan Laporan
  const headerData = [
    [settings.school_name.toUpperCase()],
    ['REKAPITULASI LAPORAN PIKET HARIAN & PRESENSI SISWA'],
    [
      `Periode: ${filterInfo?.startDate ? formatIndonesianDate(filterInfo.startDate) : 'Awal'} s/d ${
        filterInfo?.endDate ? formatIndonesianDate(filterInfo.endDate) : 'Akhir'
      } | Kelas: ${filterInfo?.className || 'Semua Kelas'} | Tahun Pelajaran: ${settings.academic_year} (${settings.semester})`,
    ],
    [],
    [
      'No',
      'Tanggal',
      'Hari',
      'Kelas',
      'Guru Piket / Wali Kelas',
      'Koordinator Piket',
      'Total Siswa',
      'Hadir (H)',
      'Sakit (S)',
      'Izin (I)',
      'Alpa (A)',
      '% Kehadiran',
      'Kebersihan Kelas',
      'Status Laporan',
      'Catatan Kejadian Khusus',
      'Tindak Lanjut',
    ],
  ];

  const rowData = reports.map((r, idx) => [
    idx + 1,
    formatIndonesianDate(r.date),
    r.day_name || '-',
    r.class_name || '-',
    r.teacher_name || '-',
    r.coordinator_name || (r as any).coordinatorName || '-',
    r.total_students || 0,
    r.present_count || 0,
    r.sick_count || 0,
    r.permit_count || 0,
    r.absent_count || 0,
    `${r.attendance_percentage || 0}%`,
    r.cleanliness_status || 'Baik',
    (r.status || 'SUBMITTED').toUpperCase(),
    r.incident_notes || 'Tidak ada kejadian khusus.',
    r.follow_up || '-',
  ]);

  // Summary calculation
  const totalStudents = reports.reduce((acc, r) => acc + (r.total_students || 0), 0);
  const totalPresent = reports.reduce((acc, r) => acc + (r.present_count || 0), 0);
  const totalSick = reports.reduce((acc, r) => acc + (r.sick_count || 0), 0);
  const totalPermit = reports.reduce((acc, r) => acc + (r.permit_count || 0), 0);
  const totalAbsent = reports.reduce((acc, r) => acc + (r.absent_count || 0), 0);
  const avgPct = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;

  const summaryRow = [
    '',
    'TOTAL KESELURUHAN',
    '',
    '',
    `${reports.length} Laporan`,
    '',
    totalStudents,
    totalPresent,
    totalSick,
    totalPermit,
    totalAbsent,
    `${avgPct}%`,
    '',
    '',
    '',
    '',
  ];

  const sheetData = [...headerData, ...rowData, [], summaryRow];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Generous column widths so text is never truncated
  ws['!cols'] = [
    { wch: 6 }, // No
    { wch: 18 }, // Tanggal
    { wch: 12 }, // Hari
    { wch: 12 }, // Kelas
    { wch: 32 }, // Guru Piket
    { wch: 28 }, // Koordinator
    { wch: 14 }, // Total Siswa
    { wch: 12 }, // Hadir
    { wch: 12 }, // Sakit
    { wch: 12 }, // Izin
    { wch: 12 }, // Alpa
    { wch: 16 }, // % Kehadiran
    { wch: 18 }, // Kebersihan
    { wch: 18 }, // Status
    { wch: 40 }, // Catatan
    { wch: 35 }, // Tindak Lanjut
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Piket');

  // 2. Sheet 2: Detail Presensi Siswa
  const detailAttendanceRows: any[] = [];
  let attCounter = 1;

  reports.forEach((rep) => {
    if (rep.attendance && rep.attendance.length > 0) {
      rep.attendance.forEach((att: any) => {
        const studentNis = att.student_nis || att.nis || att.studentNis || '-';
        const studentNisn = att.student_nisn || att.nisn || att.studentNisn || '-';
        const studentName = att.student_name || att.name || att.studentName || 'Siswa';
        const studentGender = att.student_gender || att.gender || att.studentGender || 'L';
        const rawStatus = String(att.status || 'H').toUpperCase();
        const statusLabel =
          rawStatus === 'H'
            ? 'Hadir (H)'
            : rawStatus === 'S'
            ? 'Sakit (S)'
            : rawStatus === 'I'
            ? 'Izin (I)'
            : rawStatus === 'A'
            ? 'Alpa (A)'
            : rawStatus;

        detailAttendanceRows.push([
          attCounter++,
          formatIndonesianDate(rep.date),
          rep.day_name || '-',
          rep.class_name || '-',
          studentNis,
          studentNisn,
          studentName,
          studentGender === 'L' ? 'L (Laki-laki)' : 'P (Perempuan)',
          statusLabel,
          att.note || '-',
        ]);
      });
    }
  });

  if (detailAttendanceRows.length > 0) {
    const detailHeaders = [
      [settings.school_name.toUpperCase()],
      ['DAFTAR PRESENSI SISWA - REKAPITULASI PIKET HARIAN'],
      [`Tahun Pelajaran: ${settings.academic_year} (${settings.semester})`],
      [],
      [
        'No',
        'Tanggal Presensi',
        'Hari',
        'Kelas',
        'NIS',
        'NISN',
        'Nama Lengkap Siswa',
        'Jenis Kelamin',
        'Status Kehadiran',
        'Keterangan Tambahan',
      ],
    ];

    const detailSheetData = [...detailHeaders, ...detailAttendanceRows];
    const wsDetail = XLSX.utils.aoa_to_sheet(detailSheetData);
    wsDetail['!cols'] = [
      { wch: 6 }, // No
      { wch: 18 }, // Tanggal
      { wch: 12 }, // Hari
      { wch: 12 }, // Kelas
      { wch: 16 }, // NIS
      { wch: 18 }, // NISN
      { wch: 35 }, // Nama Siswa
      { wch: 16 }, // L/P
      { wch: 18 }, // Status
      { wch: 30 }, // Keterangan
    ];
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail Presensi Siswa');
  }

  const filename = `Rekap_Piket_${settings.school_name.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * -------------------------------------------------------------
 * 2. EXPORT SINGLE REPORT TO EXCEL (.xlsx)
 * -------------------------------------------------------------
 */
export function exportSingleReportToExcel(data: {
  settings: SchoolSettings;
  report: DailyReport;
  teacher: { name: string; nip: string };
  attendance: any[];
}) {
  const { settings, report, teacher, attendance } = data;
  const wb = XLSX.utils.book_new();

  const formattedDate = formatIndonesianDate(report.date);

  const headerRows = [
    [settings.school_name.toUpperCase()],
    ['LAPORAN PIKET HARIAN & PRESENSI SISWA'],
    [`Alamat: ${settings.address} | Telp: ${settings.phone} | NPSN: ${settings.npsn}`],
    [],
    ['DATA LAPORAN KELAS'],
    ['Kelas', report.class_name, '', 'Semester', report.semester],
    ['Hari / Tanggal', `${report.day_name}, ${formattedDate}`, '', 'Tahun Pelajaran', report.academic_year],
    ['Guru Piket / Wali Kelas', teacher.name || report.teacher_name, '', 'Kebersihan Kelas', report.cleanliness_status],
    ['Koordinator Piket', report.coordinator_name || (report as any).coordinatorName || '-', '', 'Status Laporan', (report.status || 'SUBMITTED').toUpperCase()],
    [],
    ['RINGKASAN KEHADIRAN SISWA'],
    ['Total Siswa', 'Hadir (H)', 'Sakit (S)', 'Izin (I)', 'Alpa (A)', 'Tingkat Kehadiran'],
    [
      report.total_students || 0,
      report.present_count || 0,
      report.sick_count || 0,
      report.permit_count || 0,
      report.absent_count || 0,
      `${report.attendance_percentage || 0}%`,
    ],
    [],
    ['DAFTAR PRESENSI SISWA'],
    ['No', 'NIS', 'NISN', 'Nama Lengkap Siswa', 'L/P', 'Status Kehadiran', 'Keterangan'],
  ];

  const studentRows =
    attendance && attendance.length > 0
      ? attendance.map((att: any, idx: number) => {
          const nis = att.student_nis || att.nis || att.studentNis || '-';
          const nisn = att.student_nisn || att.nisn || att.studentNisn || '-';
          const name = att.student_name || att.name || att.studentName || 'Siswa';
          const gender = att.student_gender || att.gender || att.studentGender || 'L';
          const rawStatus = String(att.status || 'H').toUpperCase();
          const statusLabel =
            rawStatus === 'H'
              ? 'Hadir (H)'
              : rawStatus === 'S'
              ? 'Sakit (S)'
              : rawStatus === 'I'
              ? 'Izin (I)'
              : rawStatus === 'A'
              ? 'Alpa (A)'
              : rawStatus;
          const note = att.note || '-';
          return [idx + 1, nis, nisn, name, gender === 'L' ? 'L' : 'P', statusLabel, note];
        })
      : [['-', '-', '-', 'Tidak ada data presensi siswa yang tersimpan.', '-', '-', '-']];

  const footerRows = [
    [],
    ['CATATAN & EVALUASI PIKET'],
    ['Catatan Kejadian Khusus:', report.incident_notes || 'Tidak ada kejadian khusus hari ini.'],
    ['Tindak Lanjut:', report.follow_up || 'Tidak ada tindak lanjut khusus.'],
    ['Kegiatan Piket Terlaksana:', Array.isArray(report.activity_notes) && report.activity_notes.length > 0 ? report.activity_notes.join(', ') : '-'],
    [],
    [],
    ['', '', '', '', `Kupang, ${formattedDate}`],
    ['Mengetahui,', '', '', '', 'Guru Piket / Wali Kelas,'],
    ['Kepala Sekolah,', '', '', '', ''],
    [],
    [],
    [settings.principal_name, '', '', '', teacher.name || report.teacher_name || 'Guru Piket'],
    [`NIP. ${settings.principal_nip}`, '', '', '', `NIP. ${teacher.nip || '-'}`],
  ];

  const sheetData = [...headerRows, ...studentRows, ...footerRows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  ws['!cols'] = [
    { wch: 8 }, // No / Label
    { wch: 18 }, // NIS / Value
    { wch: 20 }, // NISN
    { wch: 38 }, // Nama Siswa / Label 2
    { wch: 12 }, // L/P / Value 2
    { wch: 22 }, // Status
    { wch: 35 }, // Keterangan
  ];

  XLSX.utils.book_append_sheet(wb, ws, `Laporan ${report.class_name || 'Kelas'}`);
  const filename = `Laporan_Piket_${report.class_name?.replace(/\s+/g, '_')}_${report.date}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * -------------------------------------------------------------
 * 3. EXPORT SINGLE REPORT TO OFFICIAL PDF (.pdf)
 * -------------------------------------------------------------
 */
export async function exportSingleReportPDF(data: {
  settings: SchoolSettings;
  report: DailyReport;
  teacher: { name: string; nip: string };
  attendance: any[];
}) {
  const { settings, report, teacher, attendance } = data;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm
  const formattedDate = formatIndonesianDate(report.date);

  // 1. Try to load school logo
  const logoSrc = settings.logo_url || '/school-logo.png';
  const logoImg = await loadLogoElement(logoSrc);
  const hasLogo = !!logoImg;

  if (hasLogo && logoImg) {
    try {
      doc.addImage(logoImg, 'PNG', marginX, 10, 22, 22);
    } catch (err) {
      console.warn('Could not render logo on PDF kop:', err);
    }
  }

  // 2. KOP SURAT SEKOLAH
  // Center header cleanly between logo and right margin (or whole page if no logo)
  const headerCenterX = hasLogo ? (marginX + 24 + (pageWidth - marginX)) / 2 : pageWidth / 2;

  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.setFontSize(10);
  doc.text('PEMERINTAH KOTA KUPANG', headerCenterX, 13, { align: 'center' });
  doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', headerCenterX, 18, { align: 'center' });

  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(settings.school_name.toUpperCase(), headerCenterX, 24, { align: 'center' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // Slate-600
  const addressLine = `${settings.address} | Telp: ${settings.phone} | NPSN: ${settings.npsn}`;
  const maxAddressWidth = hasLogo ? pageWidth - marginX * 2 - 26 : contentWidth;
  const wrappedAddress = doc.splitTextToSize(addressLine, maxAddressWidth);
  doc.text(wrappedAddress, headerCenterX, 29, { align: 'center' });

  // Garis Kop Surat Ganda Resmi
  const lineY = 35;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.8);
  doc.line(marginX, lineY, pageWidth - marginX, lineY);
  doc.setLineWidth(0.25);
  doc.line(marginX, lineY + 1.2, pageWidth - marginX, lineY + 1.2);

  // 3. JUDUL LAPORAN
  let currentY = lineY + 8;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(30, 58, 138); // Blue-900
  doc.text('LAPORAN PIKET HARIAN & PRESENSI SISWA', pageWidth / 2, currentY, { align: 'center' });

  currentY += 4.5;
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(
    `Sistem Informasi Laporan Piket Harian Sekolah Dasar - ${settings.school_name}`,
    pageWidth / 2,
    currentY,
    { align: 'center' }
  );

  // 4. METADATA CARD (Box Informasi Laporan)
  currentY += 4;
  const metaBoxY = currentY;
  const metaBoxHeight = report.coordinator_name || (report as any).coordinatorName ? 26 : 22;

  // Background Box
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, metaBoxY, contentWidth, metaBoxHeight, 2, 2, 'FD');

  // Text inside metadata box - 2 cleanly aligned columns
  doc.setFontSize(8.5);
  const leftLabelX = marginX + 4;
  const leftColonX = marginX + 34;
  const leftValX = leftColonX + 3;

  const rightLabelX = pageWidth / 2 + 4;
  const rightColonX = pageWidth / 2 + 34;
  const rightValX = rightColonX + 3;

  let rowY = metaBoxY + 5.5;

  // Row 1
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Hari, Tanggal', leftLabelX, rowY);
  doc.text(':', leftColonX, rowY);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${report.day_name || '-'}, ${formattedDate}`, leftValX, rowY);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Tahun Pelajaran', rightLabelX, rowY);
  doc.text(':', rightColonX, rowY);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(report.academic_year || '-', rightValX, rowY);

  // Row 2
  rowY += 5;
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Kelas', leftLabelX, rowY);
  doc.text(':', leftColonX, rowY);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(report.class_name || '-', leftValX, rowY);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Semester', rightLabelX, rowY);
  doc.text(':', rightColonX, rowY);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(report.semester || '-', rightValX, rowY);

  // Row 3
  rowY += 5;
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Guru Piket / Wali', leftLabelX, rowY);
  doc.text(':', leftColonX, rowY);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(teacher?.name || report.teacher_name || 'Guru Piket', leftValX, rowY);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Kebersihan Kelas', rightLabelX, rowY);
  doc.text(':', rightColonX, rowY);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(report.cleanliness_status || 'Baik', rightValX, rowY);

  // Optional Row 4: Koordinator & Status
  if (report.coordinator_name || (report as any).coordinatorName) {
    rowY += 5;
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Koordinator Piket', leftLabelX, rowY);
    doc.text(':', leftColonX, rowY);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text(report.coordinator_name || (report as any).coordinatorName, leftValX, rowY);

    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Status Laporan', rightLabelX, rowY);
    doc.text(':', rightColonX, rowY);
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text((report.status || 'SUBMITTED').toUpperCase(), rightValX, rowY);
  }

  // 5. TABEL PRESENSI SISWA
  const tableStartY = metaBoxY + metaBoxHeight + 5;

  const tableRows =
    attendance && attendance.length > 0
      ? attendance.map((att: any, idx: number) => {
          const nis = att.student_nis || att.nis || att.studentNis || '-';
          const nisn = att.student_nisn || att.nisn || att.studentNisn || '-';
          const name = att.student_name || att.name || att.studentName || 'Siswa';
          const gender = att.student_gender || att.gender || att.studentGender || 'L';
          const rawStatus = String(att.status || 'H').toUpperCase();
          const statusLabel =
            rawStatus === 'H'
              ? 'Hadir'
              : rawStatus === 'S'
              ? 'Sakit'
              : rawStatus === 'I'
              ? 'Izin'
              : rawStatus === 'A'
              ? 'Alpa'
              : rawStatus;
          const note = att.note || '-';
          return [idx + 1, nis, nisn, name, gender === 'L' ? 'L' : 'P', statusLabel, note];
        })
      : [['-', '-', '-', 'Tidak ada data presensi siswa yang tersimpan.', '-', '-', '-']];

  autoTable(doc, {
    startY: tableStartY,
    head: [['No', 'NIS', 'NISN', 'Nama Siswa', 'L/P', 'Presensi', 'Keterangan']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      lineColor: [226, 232, 240], // Slate-200
      textColor: [30, 41, 59], // Slate-800
      valign: 'middle',
    },
    headStyles: {
      fillColor: [30, 58, 138], // Navy Blue
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate-50
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'left', cellWidth: 60, fontStyle: 'bold' },
      4: { halign: 'center', cellWidth: 12 },
      5: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
      6: { halign: 'left', cellWidth: 'auto' },
    },
    margin: { left: marginX, right: marginX },
    didParseCell: (data) => {
      // Colorize the presensi column (index 5)
      if (data.section === 'body' && data.column.index === 5) {
        const val = String(data.cell.raw || '');
        if (val === 'Hadir') {
          data.cell.styles.textColor = [5, 150, 105]; // Emerald-600
        } else if (val === 'Sakit') {
          data.cell.styles.textColor = [217, 119, 6]; // Amber-600
        } else if (val === 'Izin') {
          data.cell.styles.textColor = [2, 132, 199]; // Sky-600
        } else if (val === 'Alpa') {
          data.cell.styles.textColor = [225, 29, 72]; // Rose-600
        }
      }
    },
  });

  // 6. RINGKASAN KEHADIRAN (STAT KPI BOXES)
  let afterTableY = (doc as any).lastAutoTable.finalY + 5;

  // Check if summary cards fit on current page; if not, add page
  if (afterTableY + 45 > pageHeight - 20) {
    doc.addPage();
    afterTableY = 20;
  }

  // Draw 5 Stat Cards in a neat horizontal grid
  const statBoxWidth = (contentWidth - 10) / 5; // 5 boxes with 2.5mm spacing
  const statBoxHeight = 13;
  const statGap = 2.5;

  const stats = [
    { label: 'TOTAL SISWA', value: String(report.total_students || 0), bg: [241, 245, 249], border: [203, 213, 225], text: [15, 23, 42] },
    { label: 'HADIR (H)', value: String(report.present_count || 0), bg: [236, 253, 245], border: [167, 243, 208], text: [4, 120, 87] },
    { label: 'SAKIT (S)', value: String(report.sick_count || 0), bg: [254, 252, 232], border: [254, 240, 138], text: [161, 98, 7] },
    { label: 'IZIN (I)', value: String(report.permit_count || 0), bg: [240, 249, 255], border: [186, 230, 253], text: [3, 105, 161] },
    { label: 'ALPA (A)', value: String(report.absent_count || 0), bg: [255, 241, 242], border: [254, 205, 211], text: [190, 18, 60] },
  ];

  stats.forEach((st, idx) => {
    const boxX = marginX + idx * (statBoxWidth + statGap);
    doc.setFillColor(st.bg[0], st.bg[1], st.bg[2]);
    doc.setDrawColor(st.border[0], st.border[1], st.border[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(boxX, afterTableY, statBoxWidth, statBoxHeight, 1.5, 1.5, 'FD');

    // Label
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(st.text[0], st.text[1], st.text[2]);
    doc.text(st.label, boxX + statBoxWidth / 2, afterTableY + 4.5, { align: 'center' });

    // Value
    doc.setFontSize(10.5);
    doc.text(st.value, boxX + statBoxWidth / 2, afterTableY + 10.5, { align: 'center' });
  });

  // 7. CATATAN KEJADIAN & KEGIATAN PIKET CARD
  let notesY = afterTableY + statBoxHeight + 4;

  const incidentText = report.incident_notes || 'Tidak ada kejadian khusus hari ini.';
  const followUpText = report.follow_up || 'Tidak ada tindak lanjut khusus.';
  const activitiesText =
    Array.isArray(report.activity_notes) && report.activity_notes.length > 0
      ? report.activity_notes.join(' • ')
      : 'Tidak ada kegiatan khusus yang dicatat.';

  const splitIncident = doc.splitTextToSize(incidentText, contentWidth - 8);
  const splitFollowUp = doc.splitTextToSize(followUpText, contentWidth - 8);
  const splitActivities = doc.splitTextToSize(activitiesText, contentWidth - 8);

  const notesCardHeight = 12 + splitIncident.length * 3.8 + splitFollowUp.length * 3.8 + splitActivities.length * 3.8 + 6;

  // Check page overflow for notes card
  if (notesY + notesCardHeight > pageHeight - 35) {
    doc.addPage();
    notesY = 20;
  }

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, notesY, contentWidth, notesCardHeight, 2, 2, 'FD');

  let curCardY = notesY + 5;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  // Activities
  doc.text('✓ Kegiatan Piket Terlaksana:', marginX + 4, curCardY);
  curCardY += 4;
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(splitActivities, marginX + 4, curCardY);
  curCardY += splitActivities.length * 3.8 + 2;

  // Incidents
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('• Catatan Kejadian Khusus:', marginX + 4, curCardY);
  curCardY += 4;
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(splitIncident, marginX + 4, curCardY);
  curCardY += splitIncident.length * 3.8 + 2;

  // Follow-up
  if (report.follow_up) {
    doc.setFont('Helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('→ Tindak Lanjut:', marginX + 4, curCardY);
    curCardY += 4;
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(splitFollowUp, marginX + 4, curCardY);
  }

  // 8. TANDA TANGAN RESMI
  let signY = notesY + notesCardHeight + 6;

  // Make sure at least 42mm is left for signatures; otherwise break page cleanly
  if (signY + 38 > pageHeight - 14) {
    doc.addPage();
    signY = 25;
  }

  const leftSignCenterX = marginX + 38;
  const rightSignCenterX = pageWidth - marginX - 38;

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  // Right block date
  doc.text(`Kupang, ${formattedDate}`, rightSignCenterX, signY, { align: 'center' });

  // Roles
  doc.text('Mengetahui,', leftSignCenterX, signY + 4.5, { align: 'center' });
  doc.text('Kepala Sekolah', leftSignCenterX, signY + 8.5, { align: 'center' });

  doc.text('Guru Piket / Wali Kelas', rightSignCenterX, signY + 4.5, { align: 'center' });

  // Signature names & NIP (with generous space for real signature/stamp)
  const nameY = signY + 28;

  // Principal (Left)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(settings.principal_name, leftSignCenterX, nameY, { align: 'center' });
  const principalWidth = doc.getTextWidth(settings.principal_name);
  doc.setLineWidth(0.2);
  doc.line(leftSignCenterX - principalWidth / 2, nameY + 0.8, leftSignCenterX + principalWidth / 2, nameY + 0.8);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`NIP. ${settings.principal_nip}`, leftSignCenterX, nameY + 4.5, { align: 'center' });

  // Teacher (Right)
  const teacherName = teacher?.name || report.teacher_name || 'Guru Piket';
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(teacherName, rightSignCenterX, nameY, { align: 'center' });
  const teacherWidth = doc.getTextWidth(teacherName);
  doc.setLineWidth(0.2);
  doc.line(rightSignCenterX - teacherWidth / 2, nameY + 0.8, rightSignCenterX + teacherWidth / 2, nameY + 0.8);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`NIP. ${teacher?.nip || '-'}`, rightSignCenterX, nameY + 4.5, { align: 'center' });

  // 9. FOOTER ON ALL PAGES (Page X of Y)
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(
      `Halaman ${i} dari ${totalPages}  |  Dokumen Resmi Laporan Piket Harian SD  |  Dicetak pada ${formatIndonesianDate(
        new Date().toISOString().split('T')[0]
      )}`,
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' }
    );
  }

  // Save the PDF file
  const filename = `Laporan_Piket_${report.class_name?.replace(/\s+/g, '_')}_${report.date}.pdf`;
  doc.save(filename);
}
