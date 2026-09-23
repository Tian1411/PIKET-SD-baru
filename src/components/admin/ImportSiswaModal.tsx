import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../../services/api';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
} from 'lucide-react';

interface ImportSiswaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportSiswaModal: React.FC<ImportSiswaModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    total?: number;
    failed?: number;
    errors?: any[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    ws['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 30 }, { wch: 8 }, { wch: 10 }];

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
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          setImportResult({
            success: false,
            message: 'File Excel kosong atau tidak terbaca.',
          });
        } else {
          setFile(uploadedFile);
          setParsedRows(json);
        }
      } catch (err) {
        setImportResult({
          success: false,
          message: 'Format file tidak valid. Mohon gunakan file Excel (.xlsx atau .xls).',
        });
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

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    try {
      const res = await api.importStudents(parsedRows);
      setImportResult({
        success: true,
        message: res.message,
        total: res.total_imported,
        failed: res.failed_count,
        errors: res.errors,
      });
      if (res.total_imported > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setImportResult({
        success: false,
        message: err.message || 'Gagal mengimpor data siswa.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Import Data Siswa dari Excel</h3>
              <p className="text-xs text-slate-500">Unggah berkas untuk menambah siswa secara massal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template download notice */}
        <div className="my-4 p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3">
          <div className="text-xs text-blue-900 font-medium">
            Format kolom wajib: <strong>NIS, NISN, Nama Siswa, L/P, Kelas</strong>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shrink-0 shadow-2xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Template</span>
          </button>
        </div>

        {/* Upload Box with Drag and Drop */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="p-6 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl bg-slate-50/60 hover:bg-blue-50/30 text-center cursor-pointer transition"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />
          <Upload className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-800">
            Tarik dan lepas file Excel di sini, atau <span className="text-blue-600 underline">pilih file</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Mendukung format .xlsx, .xls, atau .csv</p>
        </div>

        {/* Loading Parse */}
        {isParsing && (
          <div className="py-4 text-center text-xs text-slate-500">
            Membaca data file Excel...
          </div>
        )}

        {/* Preview of Parsed Rows */}
        {parsedRows.length > 0 && !importResult?.success && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700">
                Pratinjau Data ({parsedRows.length} Baris Terbaca):
              </span>
              <span className="text-[11px] text-slate-400 font-medium">{file?.name}</span>
            </div>

            <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0">
                  <tr>
                    <th className="p-2">No</th>
                    <th className="p-2">NIS</th>
                    <th className="p-2">NISN</th>
                    <th className="p-2">Nama</th>
                    <th className="p-2">L/P</th>
                    <th className="p-2">Kelas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.slice(0, 8).map((row, i) => (
                    <tr key={i}>
                      <td className="p-2 text-slate-500">{i + 1}</td>
                      <td className="p-2 font-mono">{row.NIS || row.nis}</td>
                      <td className="p-2 font-mono">{row.NISN || row.nisn}</td>
                      <td className="p-2 font-semibold">{row['Nama Siswa'] || row.Nama || row.name}</td>
                      <td className="p-2 font-bold">{row['L/P'] || row.gender || 'L'}</td>
                      <td className="p-2 font-bold text-blue-700">{row.Kelas || row.kelas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {parsedRows.length > 8 && (
              <p className="text-[10px] text-slate-400 mt-1 italic text-right">
                dan {parsedRows.length - 8} baris lainnya...
              </p>
            )}

            <button
              onClick={handleExecuteImport}
              disabled={isImporting}
              className="w-full mt-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
            >
              {isImporting ? 'Mengimpor Data...' : `Proses Impor ${parsedRows.length} Siswa`}
            </button>
          </div>
        )}

        {/* Result Message */}
        {importResult && (
          <div
            className={`mt-4 p-4 rounded-2xl border text-xs ${
              importResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-start gap-2">
              {importResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <div>
                <p className="font-bold">{importResult.message}</p>
                {importResult.failed && importResult.failed > 0 ? (
                  <div className="mt-2 text-[11px] text-rose-700">
                    <p className="font-bold">Rincian baris gagal:</p>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 max-h-24 overflow-y-auto">
                      {importResult.errors?.map((err, i) => (
                        <li key={i}>
                          Baris {err.row}: {err.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
