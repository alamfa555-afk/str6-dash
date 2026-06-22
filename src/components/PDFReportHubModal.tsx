import React, { useState } from 'react';
import { InventoryItem, IssueTransaction, ReceiveTransaction } from '../types';
import { X, FileText, Download, Calendar, Tag, User, CheckCircle2, ExternalLink } from 'lucide-react';
import { generateInventoryPDF } from '../utils/pdfGenerator';

interface PDFReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  issues: IssueTransaction[];
  receives: ReceiveTransaction[];
}

export function PDFReportHubModal({ isOpen, onClose, items, issues, receives }: PDFReportModalProps) {
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('all');
  const [selectedItemCode, setSelectedItemCode] = useState('all');
  const [generatedBy, setGeneratedBy] = useState('');
  const [pdfResult, setPdfResult] = useState<{ blobURL: string; filename: string } | null>(null);

  if (!isOpen) return null;

  const handleDownloadReport = () => {
    // Collect user details to stamp on PDF
    const userName = generatedBy.trim() || localStorage.getItem('last_issuer_name')?.trim() || 'Store Operator';
    
    const result = generateInventoryPDF({
      reportType,
      selectedItemCode,
      items,
      issues,
      receives,
      generatedBy: userName,
    });

    setPdfResult({
      blobURL: result.blobURL,
      filename: result.filename
    });
  };

  const handleClose = () => {
    setPdfResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div 
        id="pdf-report-hub-modal"
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-sky-50/70 border-b border-sky-100 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="text-sky-700" size={20} />
            <h3 className="font-bold text-slate-800">
              Generate & Download PDF Report
            </h3>
          </div>
          <button 
            type="button"
            onClick={handleClose} 
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body / Success Panel */}
        {!pdfResult ? (
          <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
            <p className="text-xs text-slate-500 leading-relaxed font-sans">
              Compile your official store records including <strong>Ajanta Construction Company</strong> corporate letterhead, inventory balance status, low stock warnings, and transaction release logs.
            </p>

            {/* Report Type Selector */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Calendar size={13} className="text-slate-400" />
                1. Choose Report Period
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'daily', label: 'Daily', desc: 'Today\'s actions' },
                  { id: 'weekly', label: 'Weekly', desc: 'Past 7 days' },
                  { id: 'monthly', label: 'Monthly', desc: 'Past 30 days' },
                  { id: 'all', label: 'All-Time', desc: 'Complete history' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setReportType(p.id as any)}
                    className={`p-3 text-left rounded-xl border transition-all flex flex-col justify-between cursor-pointer ${
                      reportType === p.id
                        ? 'border-sky-600 bg-sky-50/20 shadow-neutral-100 shadow-sm'
                        : 'border-slate-100 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span className={`text-xs font-bold font-sans ${reportType === p.id ? 'text-sky-800' : 'text-slate-700'}`}>
                      {p.label}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Item Selector */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Tag size={13} className="text-slate-400" />
                2. Filter Item / Product Selection
              </label>
              <select
                value={selectedItemCode}
                onChange={(e) => setSelectedItemCode(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="all" className="font-semibold">📁 All registered items</option>
                {items.map((it) => (
                  <option key={it.id} value={it.itemCode} className="font-semibold text-slate-900">
                    [{it.itemCode}] {it.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Signature/Name */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <User size={13} className="text-slate-400" />
                3. Certified Operator Name (Optional)
              </label>
              <input
                type="text"
                value={generatedBy}
                onChange={(e) => setGeneratedBy(e.target.value)}
                placeholder="e.g. Amit Sharma / Store Manager"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none bg-white text-slate-950 font-semibold"
              />
              <p className="text-[10px] text-slate-400 mt-1">This name will be stamped on the PDF footer metadata.</p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDownloadReport}
                className="flex-grow px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Download size={15} />
                Generate & Download PDF
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5 text-center">
            <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mb-2">
              <CheckCircle2 size={28} />
            </div>
            
            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-800">PDF Compiled Successfully!</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                The document has been compiled and is downloading to your device automatically.
              </p>
            </div>

            {/* Direct Backups in case of standard browser frame block */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-left space-y-2.5">
              <span className="text-[10px] block font-extrabold uppercase text-slate-400 tracking-wider">Report Details</span>
              <div className="text-xs text-slate-700 space-y-1 font-medium">
                <div>📂 <span className="font-semibold text-slate-950">Filename:</span> {pdfResult.filename}</div>
                <div>📍 <span className="font-semibold text-slate-950">Company:</span> Ajanta Construction Company</div>
              </div>

              {/* Secure Secondary Action Option to handle Sandbox blocks */}
              <div className="pt-2 border-t border-slate-200/60 flex flex-col gap-2">
                <a
                  href={pdfResult.blobURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <ExternalLink size={14} />
                  Open & Save PDF dynamically
                </a>
                <a
                  href={pdfResult.blobURL}
                  download={pdfResult.filename}
                  className="w-full text-center px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download size={14} />
                  Download Backup File
                </a>
              </div>
            </div>

            <p className="text-[10px] text-slate-400">
              Note: If browser blocks automatic downloads, click "Open & Save PDF dynamically" or "Download Backup File" to bypass.
            </p>

            <button
              type="button"
              onClick={handleClose}
              className="w-full px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Done & Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
