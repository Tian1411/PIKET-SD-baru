import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DailyReport, SchoolSettings } from '../types';

export function exportRekapToExcel(
  reports: DailyReport[],
  settings: SchoolSettings,
  filterInfo?: { startDate?: string; endDate?: string; className?: string }
) {
  const wb = XLSX.utils.book_new();

  // Prepare metadata headers
  const headerData = [
    [settings.school_name.toUpperCase()],
    ['REKAPITULASI LAPORAN PIKET HARIAN & KEHADIRAN SISWA'],
    [
      `Periode: ${filterInfo?.startDate || 'Awal'} s/d ${filterInfo?.endDate || 'Akhir'} | Kelas: ${
        filterInfo?.className || 'Semua Kelas'
      } | Tahun Pelajaran: ${settings.academic_year} (${settings.semester})`,
    ],
    [],
    [
      'No',
      'Tanggal',
      'Hari',
      'Kelas',
      'Guru Piket/Wali Kelas',
      'Total Siswa',
      'Hadir (H)',
      'Sakit (S)',
      'Izin (I)',
      'Alpa (A)',
      '% Kehadiran',
      'Kebersihan',
      'Status Laporan',
      'Catatan Kejadian',
      'Tindak Lanjut',
    ],
  ];

  const rowData = reports.map((r, idx) => [
    idx + 1,
    r.date,
    r.day_name,
    r.class_name || '-',
    r.teacher_name || '-',
    r.total_students,
    r.present_count,
    r.sick_count,
    r.permit_count,
    r.absent_count,
    `${r.attendance_percentage || 0}%`,
    r.cleanliness_status,
    r.status.toUpperCase(),
    r.incident_notes || '-',
    r.follow_up || '-',
  ]);

  // Summary Row
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

  // Set column widths
  ws['!cols'] = [
    { wch: 5 }, // No
    { wch: 12 }, // Tanggal
    { wch: 10 }, // Hari
    { wch: 10 }, // Kelas
    { wch: 28 }, // Guru
    { wch: 12 }, // Total Siswa
    { wch: 10 }, // Hadir
    { wch: 10 }, // Sakit
    { wch: 10 }, // Izin
    { wch: 10 }, // Alpa
    { wch: 14 }, // % Kehadiran
    { wch: 16 }, // Kebersihan
    { wch: 16 }, // Status
    { wch: 35 }, // Catatan
    { wch: 30 }, // Tindak Lanjut
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Piket');
  const filename = `Rekap_Piket_${settings.school_name.replace(/\s+/g, '_')}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, filename);
}

async function loadLogoElement(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

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

  const pageWidth = doc.internal.pageSize.getWidth();

  // Try to load school logo
  const logoSrc = settings.logo_url || '/school-logo.png';
  const logoImg = await loadLogoElement(logoSrc);
  if (logoImg) {
    try {
      doc.addImage(logoImg, 'PNG', 16, 11, 20, 20);
    } catch (err) {
      console.warn('Could not render logo on PDF kop:', err);
    }
  }

  // === KOP SURAT SEKOLAH ===
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PEMERINTAH KOTA KUPANG', pageWidth / 2, 14, { align: 'center' });
  doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', pageWidth / 2, 19, { align: 'center' });
  doc.setFontSize(14);
  doc.text(settings.school_name.toUpperCase(), pageWidth / 2, 25, { align: 'center' });

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `${settings.address} | Telp: ${settings.phone} | NPSN: ${settings.npsn}`,
    pageWidth / 2,
    30,
    { align: 'center' }
  );

  // Garis Kop Ganda
  doc.setLineWidth(0.8);
  doc.line(14, 33, pageWidth - 14, 33);
  doc.setLineWidth(0.2);
  doc.line(14, 34, pageWidth - 14, 34);

  // === JUDUL LAPORAN ===
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('LAPORAN PIKET HARIAN & PRESENSI SISWA', pageWidth / 2, 41, { align: 'center' });

  // Metadata Box
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);

  const metaLeftX = 16;
  const metaRightX = pageWidth / 2 + 10;
  let metaY = 48;

  doc.text(`Kelas`, metaLeftX, metaY);
  doc.text(`: ${report.class_name}`, metaLeftX + 28, metaY);

  doc.text(`Semester`, metaRightX, metaY);
  doc.text(`: ${report.semester}`, metaRightX + 32, metaY);

  metaY += 5;
  doc.text(`Hari / Tanggal`, metaLeftX, metaY);
  doc.text(`: ${report.day_name}, ${report.date}`, metaLeftX + 28, metaY);

  doc.text(`Tahun Pelajaran`, metaRightX, metaY);
  doc.text(`: ${report.academic_year}`, metaRightX + 32, metaY);

  metaY += 5;
  doc.text(`Guru Piket/Kelas`, metaLeftX, metaY);
  doc.text(`: ${teacher.name || report.teacher_name}`, metaLeftX + 28, metaY);

  doc.text(`Kebersihan Kelas`, metaRightX, metaY);
  doc.text(`: ${report.cleanliness_status}`, metaRightX + 32, metaY);

  // === TABEL KEHADIRAN SISWA ===
  const tableRows = attendance.map((att, idx) => [
    idx + 1,
    att.nis || '-',
    att.nisn || '-',
    att.name || '-',
    att.gender || 'L',
    att.status || 'H',
    att.note || '-',
  ]);

  autoTable(doc, {
    startY: metaY + 8,
    head: [['No', 'NIS', 'NISN', 'Nama Siswa', 'L/P', 'Status', 'Keterangan']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      lineColor: [200, 200, 200],
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'center', cellWidth: 26 },
      3: { cellWidth: 60 },
      4: { halign: 'center', cellWidth: 12 },
      5: { halign: 'center', cellWidth: 16 },
      6: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14 },
  });

  // Position after table
  const finalY = (doc as any).lastAutoTable.finalY + 6;

  // Ringkasan Kehadiran Box
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Ringkasan Kehadiran:', 16, finalY);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Total: ${report.total_students} | Hadir: ${report.present_count} | Sakit: ${report.sick_count} | Izin: ${report.permit_count} | Alpa: ${report.absent_count} | Persentase: ${report.attendance_percentage}%`,
    16,
    finalY + 4
  );

  // Catatan & Tindak Lanjut
  doc.setFont('Helvetica', 'bold');
  doc.text('Catatan Kejadian / Kondisi Kelas:', 16, finalY + 11);
  doc.setFont('Helvetica', 'normal');
  const incidentLines = doc.splitTextToSize(report.incident_notes || 'Tidak ada kejadian khusus.', pageWidth - 32);
  doc.text(incidentLines, 16, finalY + 15);

  let afterNotesY = finalY + 17 + incidentLines.length * 4;

  if (report.activity_notes && report.activity_notes.length > 0) {
    doc.setFont('Helvetica', 'bold');
    doc.text('Kegiatan Piket Terlaksana:', 16, afterNotesY);
    doc.setFont('Helvetica', 'normal');
    doc.text(report.activity_notes.join(', '), 16, afterNotesY + 4);
    afterNotesY += 9;
  }

  // TANDA TANGAN RESMI
  const signY = Math.max(afterNotesY + 8, 230);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Kupang, ${report.date}`, pageWidth - 60, signY);

  doc.text('Mengetahui,', 25, signY + 5);
  doc.text('Kepala Sekolah', 25, signY + 9);

  doc.text('Guru Piket / Wali Kelas', pageWidth - 65, signY + 9);

  // Space for sign
  doc.setFont('Helvetica', 'bold');
  doc.text(settings.principal_name, 25, signY + 30);
  doc.setFont('Helvetica', 'normal');
  doc.text(`NIP. ${settings.principal_nip}`, 25, signY + 34);

  doc.setFont('Helvetica', 'bold');
  doc.text(teacher?.name || report.teacher_name || 'Guru Piket', pageWidth - 65, signY + 30);
  doc.setFont('Helvetica', 'normal');
  doc.text(`NIP. ${teacher?.nip || '-'}`, pageWidth - 65, signY + 34);

  const filename = `Laporan_Piket_${report.class_name?.replace(/\s+/g, '_')}_${report.date}.pdf`;
  doc.save(filename);
}
