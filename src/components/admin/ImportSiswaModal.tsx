import React, { useState, useRef, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../../services/api';
import { SchoolClass, Student } from '../../types';
import {
  extractFieldsFromRow,
  validateStudentRows,
  ValidatedImportRow,
} from '../../utils/excelImport';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  Users,
  Check,
  RefreshCw,
  HelpCircle,
  FolderPlus,
} from 'lucide-react';

interface ImportSiswaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialClassId?: string;
}

export const ImportSiswaModal: React.FC<ImportSiswaModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialClassId = '',
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [existingStudents, setExistingStudents] = useState<Student[]>([]);
  const [isPreloading, setIsPreloading] = useState(false);

  // Target class selector
  const [targetClassId, setTargetClassId] = useState<string>(initialClassId);

  // Raw parsed rows from sheet_to_json
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    total?: number;
    failed?: number;
    errors?: { row: number; reason: string; error?: string; nis?: string; name?: string }[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync initialClassId whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setTargetClassId(initialClassId || '');
      setFile(null);
      setRawRows([]);
      setImportResult(null);

      // Load classes and existing students for client-side preview validation
      async function loadMeta() {
        setIsPreloading(true);
        try {
          const [cRes, sRes] = await Promise.all([
            api.getClasses(),
            api.getStudents(),
          ]);
          setClasses(cRes.classes || []);
          setExistingStudents(sRes.students || []);
        } catch (err) {
          console.warn('Gagal memuat metadata kelas/siswa untuk validasi:', err);
        } finally {
          setIsPreloading(false);
        }
      }

      loadMeta();
    }
  }, [isOpen, initialClassId]);

  // Compute live validated preview rows based on rawRows & targetClassId
  const validatedRows: ValidatedImportRow[] = useMemo(() => {
    if (rawRows.length === 0) return [];

    const extracted = rawRows
      .map((row, idx) => extractFieldsFromRow(row, idx + 1))
      // Filter out completely blank rows
      .filter((r) => r.rawNis || r.rawNisn || r.rawName || r.rawGender || r.rawClass);

    return validateStudentRows(extracted, classes, existingStudents, targetClassId || undefined);
  }, [rawRows, classes, existingStudents, targetClassId]);

  const validCount = useMemo(() => validatedRows.filter((r) => r.isValid).length, [validatedRows]);
  const errorCount = useMemo(() => validatedRows.filter((r) => !r.isValid).length, [validatedRows]);

  if (!isOpen) return null;

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const templateData = [
      ['NIS', 'NISN', 'Nama Siswa', 'L/P', 'Kelas'],
      ['2021001', '0091234567', 'Agustinus Da Silva', 'L', 'V B'],
      ['2021002', '0091234568', 'Beatrix Yohana Lada', 'P', 'V B'],
      ['2021003', '0091234569', 'Cornelis Fransiskus', 'L', 'V B'],
      ['2021004', '0091234570', 'Dina Natalia Koro', 'P', 'I A'],
      ['2021005', '0091234571', 'Emanuel Bria', 'L', 'I A'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 30 }, { wch: 8 }, { wch: 12 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
    XLSX.writeFile(wb, 'Template_Import_Siswa_SD_Oehendak.xlsx');
  };

  const processExcelFile = (uploadedFile: File) => {
    setIsParsing(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('Berkas Excel tidak memiliki sheet yang dapat dibaca.');
        }

        const worksheet = workbook.Sheets[firstSheetName];
        // Use raw: false so numbers like 001 or 0091234567 preserve leading zeros as strings
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

        if (json.length === 0) {
          setImportResult({
            success: false,
            message: 'File Excel kosong atau tidak terbaca. Pastikan baris data ada di bawah header.',
          });
          setFile(null);
          setRawRows([]);
        } else {
          setFile(uploadedFile);
          setRawRows(json);
        }
      } catch (err: any) {
        setImportResult({
          success: false,
          message:
            err.message ||
            'Format file tidak valid. Mohon gunakan file Excel standar (.xlsx atau .xls).',
        });
        setFile(null);
        setRawRows([]);
      } finally {
        setIsParsing(false);
      }
    };

    reader.readAsArrayBuffer(uploadedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processExcelFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processExcelFile(e.dataTransfer.files[0]);
    }
  };

  const handleResetFile = () => {
    setFile(null);
    setRawRows([]);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExecuteImport = async () => {
    if (rawRows.length === 0) return;
    setIsImporting(true);
    setImportResult(null);

    try {
      const res = await api.importStudents(rawRows, targetClassId || undefined);

      setImportResult({
        success: res.total_imported > 0,
        message: res.message,
        total: res.total_imported,
        failed: res.failed_count,
        errors: res.errors,
      });

      if (res.total_imported > 0) {
        // Refresh master student list in parent
        onSuccess();
      }
    } catch (err: any) {
      setImportResult({
        success: false,
        message: err.message || 'Gagal menyimpan data siswa ke Firestore.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-3xl rounded-3xl bg-white p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Import Data Siswa dari Excel
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Tambah siswa secara massal ke database sekolah
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Top Options: Class Selector & Template Download */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Target Class Dropdown */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <FolderPlus className="w-3.5 h-3.5 text-blue-600" />
                <span>Pilih Kelas Tujuan:</span>
              </label>
              <select
                value={targetClassId}
                disabled={isImporting}
                onChange={(e) => setTargetClassId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">-- Gunakan Kolom Kelas pada Excel --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    Kelas {c.class_name} (Otomatis untuk semua baris)
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500 mt-1">
                {targetClassId
                  ? 'Semua siswa yang diimpor akan langsung dimasukkan ke kelas ini.'
                  : 'Siswa dimasukkan ke kelas sesuai nilai kolom "Kelas" di file Excel.'}
              </p>
            </div>

            {/* Template Download Box */}
            <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-blue-700" />
                  <span>Format Kolom Excel Wajib:</span>
                </p>
                <p className="text-[11px] text-blue-800 font-mono mt-0.5">
                  NIS | NISN | Nama Siswa | L/P | Kelas
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-2xs transition self-start"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Template Excel</span>
              </button>
            </div>
          </div>

          {/* Upload Area (Shown when no file uploaded yet) */}
          {!file && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="p-8 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-3xl bg-slate-50/60 hover:bg-blue-50/20 text-center cursor-pointer transition group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, .xls, .csv"
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2.5 group-hover:scale-110 transition">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                Pilih atau tarik file Excel ke sini
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Mendukung file spreadsheet <span className="font-semibold">.xlsx, .xls, .csv</span>
              </p>
              <span className="inline-block mt-3 px-3.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                Klik untuk Memilih File
              </span>
            </div>
          )}

          {/* Parsing State */}
          {isParsing && (
            <div className="py-6 text-center text-xs text-slate-600 font-semibold flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span>Membaca dan memvalidasi baris Excel...</span>
            </div>
          )}

          {/* Preview & Validation Phase */}
          {file && rawRows.length > 0 && !importResult && (
            <div className="space-y-3">
              {/* File Info & Statistics Bar */}
              <div className="p-3.5 rounded-2xl bg-slate-100/80 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800 truncate max-w-xs">
                    {file.name}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-200 font-mono text-slate-600">
                    {validatedRows.length} Baris
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>{validCount} Siap Diimpor</span>
                  </span>
                  {errorCount > 0 && (
                    <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-rose-100 text-rose-800 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{errorCount} Error</span>
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={isImporting}
                    onClick={handleResetFile}
                    className="px-2.5 py-1 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 transition"
                  >
                    Ganti File
                  </button>
                </div>
              </div>

              {/* Warning if any errors exist */}
              {errorCount > 0 && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      Terdapat {errorCount} baris yang tidak memenuhi syarat validasi.
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Baris yang valid ({validCount} siswa) tetap dapat disimpan ke database. Baris
                      dengan status error akan dilewati dan dilaporkan secara rinci.
                    </p>
                  </div>
                </div>
              )}

              {/* Data Preview Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/90 text-slate-700 font-bold sticky top-0 backdrop-blur-xs z-10">
                      <tr>
                        <th className="p-2.5 w-12 text-center">No</th>
                        <th className="p-2.5">NIS</th>
                        <th className="p-2.5">NISN</th>
                        <th className="p-2.5">Nama Siswa</th>
                        <th className="p-2.5 text-center">L/P</th>
                        <th className="p-2.5">Kelas</th>
                        <th className="p-2.5">Status Validasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {validatedRows.map((row) => (
                        <tr
                          key={row.rowNumber}
                          className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/30 hover:bg-rose-50/60'}
                        >
                          <td className="p-2.5 text-center font-mono text-slate-400">
                            {row.rowNumber}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-slate-800">
                            {row.nis || <span className="text-rose-400 italic">kosong</span>}
                          </td>
                          <td className="p-2.5 font-mono text-slate-600">{row.nisn}</td>
                          <td className="p-2.5 font-semibold text-slate-900">
                            {row.name || <span className="text-rose-400 italic">kosong</span>}
                          </td>
                          <td className="p-2.5 text-center font-bold">
                            <span
                              className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                                row.gender === 'P'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {row.gender}
                            </span>
                          </td>
                          <td className="p-2.5 font-bold text-blue-700">
                            {row.className ? (
                              `Kelas ${row.className}`
                            ) : (
                              <span className="text-rose-500 font-normal italic">
                                {row.rawClass || 'Tidak ditentukan'}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span>Valid</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200"
                                title={row.reason}
                              >
                                <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                <span className="truncate max-w-[200px]">{row.reason}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Import Result Notification */}
          {importResult && (
            <div
              className={`p-4 rounded-3xl border text-xs ${
                importResult.success
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50/80 border-rose-200 text-rose-950'
              }`}
            >
              <div className="flex items-start gap-3">
                {importResult.success ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
                )}
                <div className="flex-1">
                  <h4 className="text-sm font-black">{importResult.message}</h4>

                  {/* Failure details */}
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-3 p-3 rounded-2xl bg-white border border-rose-200/80">
                      <p className="font-black text-rose-800 text-xs mb-1.5 flex items-center gap-1">
                        <span>Rincian Baris Gagal ({importResult.errors.length} Baris):</span>
                      </p>
                      <ul className="divide-y divide-rose-100 max-h-40 overflow-y-auto text-[11px] text-rose-900 pr-1">
                        {importResult.errors.map((err, i) => (
                          <li key={i} className="py-1 flex items-start gap-1.5">
                            <span className="font-mono font-bold shrink-0 text-rose-700">
                              Baris {err.row}:
                            </span>
                            <span className="font-medium text-slate-800">
                              {err.reason || err.error || 'Data tidak memenuhi syarat validasi.'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div>
            {file && !importResult && (
              <p className="text-[11px] text-slate-500 font-medium">
                {validCount} dari {validatedRows.length} data siswa siap disimpan.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isImporting}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
            >
              {importResult?.success ? 'Selesai' : 'Batal'}
            </button>

            {file && !importResult && (
              <button
                type="button"
                id="btn-confirm-import"
                disabled={isImporting || validCount === 0}
                onClick={handleExecuteImport}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black shadow-md transition ${
                  isImporting || validCount === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/20'
                }`}
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan ke Firestore...</span>
                  </>
                ) : (
                  <>
                    <Users className="w-3.5 h-3.5" />
                    <span>
                      {errorCount > 0
                        ? `Impor ${validCount} Siswa Valid`
                        : `Proses Impor ${validCount} Siswa`}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
