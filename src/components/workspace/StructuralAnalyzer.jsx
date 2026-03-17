import React, { useState, useEffect } from 'react';
import {
    FileText,
    Upload,
    Cpu,
    CheckCircle2,
    X,
    FileCheck,
    ChevronRight,
    Loader2,
    AlertCircle,
    Database,
    Zap
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { processStructuralFile } from '../../utils/aiService';

const StructuralAnalyzer = ({ onComplete, onClose }) => {
    const [step, setStep] = useState('upload'); // upload, processing, results
    const [file, setFile] = useState(null);
    const [progress, setProgress] = useState(0);
    const [extractedSections, setExtractedSections] = useState([]);
    const [error, setError] = useState(null);
    const [statusMessage, setStatusMessage] = useState('Initializing structural parser...');

    useEffect(() => {
        const processingMessages = [
            'Reading design file...',
            'Extracting member marks (C1, B1, S1)...',
            'Identifying structural categories...',
            'Parsing quantities and dimensions...',
            'Mapping to BOQ standards...',
            'Gemini AI finalizing structural groups...'
        ];
        
        let msgIndex = 0;
        let msgInterval;
        if (step === 'processing') {
            msgInterval = setInterval(() => {
                msgIndex = (msgIndex + 1) % processingMessages.length;
                setStatusMessage(processingMessages[msgIndex]);
            }, 3000);
        }
        return () => clearInterval(msgInterval);
    }, [step]);

    const readFile = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            if (file.name.endsWith('.xlsx')) {
                reader.readAsArrayBuffer(file);
                reader.onload = async () => {
                    try {
                        const workbook = new ExcelJS.Workbook();
                        await workbook.xlsx.load(reader.result);
                        let csvContent = '';
                        workbook.eachSheet((worksheet) => {
                            worksheet.eachRow((row) => {
                                csvContent += row.values.join(',') + '\n';
                            });
                        });
                        resolve(csvContent);
                    } catch (err) {
                        reject(err);
                    }
                };
            } else {
                reader.readAsText(file);
                reader.onload = () => resolve(reader.result);
            }
            reader.onerror = (error) => reject(error);
        });
    };

    const handleFileUpload = async (e) => {
        const uploadedFile = e.target.files[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        setStep('processing');
        setProgress(15);
        setError(null);

        let progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev < 90) return prev + Math.random() * 5;
                return prev;
            });
        }, 800);

        try {
            const content = await readFile(uploadedFile);
            setProgress(40);

            const results = await processStructuralFile(content, uploadedFile.name);

            clearInterval(progressInterval);
            setProgress(100);
            setExtractedSections(results);
            setTimeout(() => setStep('results'), 800);
        } catch (err) {
            clearInterval(progressInterval);
            console.error('Structural analysis failed:', err);
            setError('Failed to parse structural file. Please ensure it is a valid export (CSV, TXT, or Excel-CSV).');
            setStep('upload');
        }
    };

    const renderUpload = () => (
        <div className="analyzer-upload view-fade-in">
            <div className="upload-zone">
                <div className="icon-stack">
                    <Database className="upload-icon" size={48} />
                    <Upload className="search-icon" size={24} />
                </div>
                <h3>Structural Import</h3>
                <p>Upload your structural design file (CSV, TXT, or XLS) to automatically extract members from Prota, Orion, or Tekla.</p>

                {error && (
                    <div className="error-banner">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="drop-area">
                    <input
                        type="file"
                        id="structural-upload"
                        hidden
                        accept=".csv,.txt,.xlsx"
                        onChange={handleFileUpload}
                    />
                    <label htmlFor="structural-upload" className="btn-primary">
                        Select Project Design File
                    </label>
                    <span className="hint">Supported: Prota Structural Exports, Orion, Text Reports</span>
                </div>

                <div className="analysis-features">
                    <div className="feat">
                        <CheckCircle2 size={16} className="text-success" />
                        <span>Automatic Member Grouping</span>
                    </div>
                    <div className="feat">
                        <CheckCircle2 size={16} className="text-success" />
                        <span>Qty Extraction</span>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderProcessing = () => (
        <div className="analyzer-processing view-fade-in">
            <div className="processing-visual">
                <div className="scanner-container">
                    <div className="scan-line"></div>
                    <div className="mock-drawing">
                        <FileText className="bg-icon" size={120} />
                    </div>
                </div>
                <div className="processing-status">
                    <Loader2 className="animate-spin text-accent-500" size={32} />
                    <h3>{statusMessage}</h3>
                    <p>AI is mapping structural elements from {file?.name}</p>
                    <div className="progress-bar-container">
                        <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                    </div>
                    <span className="percentage">{Math.round(progress)}% Complete</span>
                </div>
            </div>
        </div>
    );

    const renderResults = () => (
        <div className="analyzer-results view-fade-in">
            <header className="results-header">
                <div className="file-pill">
                    <Zap size={16} className="text-accent-500" />
                    <span>AI Engine Active</span>
                </div>
                <h3>Mapping Success</h3>
                <p>Gemini AI identified {extractedSections.length} structural sections for your BOQ.</p>
            </header>

            <div className="results-list">
                {extractedSections.map(section => (
                    <div key={section.id} className="identified-card">
                        <div className="card-info">
                            <div className="title-row">
                                <h4>{section.title}</h4>
                                <div className="confidence-badge">
                                    <Cpu size={12} />
                                    {section.items.length} Elements
                                </div>
                            </div>
                            <p>{section.items.map(i => i.description.split(' ')[0]).slice(0, 3).join(', ')}...</p>
                        </div>
                        <CheckCircle2 className="text-success" size={20} />
                    </div>
                ))}
            </div>

            <div className="results-actions">
                <button className="btn-secondary" onClick={() => setStep('upload')}>Rescan</button>
                <button className="btn-primary" onClick={() => onComplete(extractedSections)}>
                    Import to BOQ Workspace
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );

    return (
        <div className="analyzer-overlay">
            <div className="analyzer-modal glass-card">
                <button className="btn-close" onClick={onClose}><X size={20} /></button>
                {step === 'upload' && renderUpload()}
                {step === 'processing' && renderProcessing()}
                {step === 'results' && renderResults()}
            </div>

            <style jsx="true">{`
        .analyzer-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(14px);
          display: flex; align-items: center; justify-content: center;
          z-index: 2100; padding: 2rem;
          animation: da-fade 0.25s ease;
        }

        @keyframes da-fade { from { opacity: 0; } to { opacity: 1; } }

        .analyzer-modal {
          width: 100%;
          max-width: 580px;
          background: white;
          border-radius: 24px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.5);
          min-height: 520px;
          display: flex;
          flex-direction: column;
          animation: da-pop 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes da-pop {
          from { transform: scale(0.93) translateY(15px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }

        .btn-close {
          position: absolute;
          top: 1.5rem; right: 1.5rem;
          background: none; border: none;
          color: #94a3b8; cursor: pointer; z-index: 10;
        }

        .analyzer-upload, .analyzer-processing, .analyzer-results {
          padding: 3rem; flex: 1; display: flex; flex-direction: column; justify-content: center;
        }

        .upload-zone { text-align: center; }

        .icon-stack {
          position: relative; width: 80px; height: 80px; margin: 0 auto 1.5rem;
        }

        .upload-icon { color: #3b82f6; }
        .search-icon { 
          position: absolute; bottom: 0; right: 0; 
          background: white; border-radius: 50%; padding: 4px;
          color: #0f172a; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .error-banner {
          background: #fef2f2; border: 1px solid #fecaca; color: #991b1b;
          padding: 0.75rem; border-radius: 8px; margin-bottom: 1.5rem;
          display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem;
        }

        .upload-zone h3 { font-size: 1.5rem; margin-bottom: 0.75rem; color: #0f172a; font-weight: 800; }
        .upload-zone p { color: #64748b; margin-bottom: 2rem; line-height: 1.6; }

        .drop-area {
          background: #f8fafc; border: 2px dashed #cbd5e1;
          border-radius: 16px; padding: 2.5rem;
          display: flex; flex-direction: column; align-items: center; gap: 1rem;
          margin-bottom: 2.5rem; transition: all 0.3s;
        }

        .drop-area:hover {
          border-color: #3b82f6; background: rgba(59, 130, 246, 0.03);
        }

        .hint { font-size: 0.75rem; color: #94a3b8; font-weight: 600; }

        .analysis-features { display: flex; gap: 1.5rem; justify-content: center; }
        .feat { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 700; color: #475569; }

        .scanner-container {
          position: relative; width: 220px; height: 160px;
          background: #f1f5f9; border-radius: 12px;
          margin: 0 auto 2rem; overflow: hidden;
          display: flex; align-items: center; justify-content: center;
        }

        .mock-drawing { position: relative; color: #cbd5e1; }
        .scan-line {
          position: absolute; top: 0; left: 0; width: 100%; height: 2px;
          background: #3b82f6; box-shadow: 0 0 10px #3b82f6;
          animation: scan 2.5s linear infinite; z-index: 2;
        }

        @keyframes scan { 0% { top: 0%; } 100% { top: 100%; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }

        .processing-status { text-align: center; }
        .processing-status h3 { margin-bottom: 0.5rem; font-weight: 800; }
        .processing-status p { font-size: 0.875rem; color: #64748b; margin-bottom: 2rem; }

        .progress-bar-container {
          width: 100%; height: 8px; background: #e2e8f0;
          border-radius: 100px; overflow: hidden; margin-bottom: 0.75rem;
        }

        .progress-bar {
          height: 100%; background: linear-gradient(90deg, #3b82f6, #2563eb);
          transition: width 0.3s ease-out; border-radius: 100px;
        }

        .percentage { font-size: 0.75rem; font-weight: 800; color: #2563eb; }

        .results-header { text-align: center; margin-bottom: 2rem; }
        .file-pill {
            display: inline-flex; align-items: center; gap: 0.5rem;
            background: #f1f5f9; padding: 4px 12px; border-radius: 100px;
            font-size: 0.65rem; font-weight: 800; color: #475569; margin-bottom: 1rem;
        }

        .results-list { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 2.5rem; max-height: 280px; overflow-y: auto; padding-right: 0.5rem; }

        .identified-card {
          display: flex; align-items: center; gap: 1rem;
          padding: 1rem 1.25rem; background: #f8fafc;
          border: 1px solid #e2e8f0; border-radius: 16px;
          transition: all 0.2s;
        }

        .identified-card:hover {
          border-color: #3b82f6; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.08);
          transform: translateX(4px);
        }

        .card-info { flex: 1; text-align: left; }
        .title-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem; }
        .card-info h4 { font-size: 0.875rem; margin: 0; font-weight: 800; }
        .card-info p { font-size: 0.75rem; color: #64748b; margin: 0; }

        .confidence-badge {
          display: flex; align-items: center; gap: 0.25rem;
          font-size: 0.625rem; font-weight: 800;
          color: #16a34a; background: #f0fdf4;
          padding: 2px 8px; border-radius: 6px;
        }

        .results-actions { display: grid; grid-template-columns: 1fr 2fr; gap: 1rem; }

        .btn-primary { 
            background: #1e293b; color: white; border: none; 
            padding: 0.875rem; border-radius: 12px; font-weight: 700;
            display: flex; align-items: center; justify-content: center; gap: 0.5rem;
            cursor: pointer; transition: all 0.2s;
        }
        .btn-primary:hover { background: #0f172a; transform: translateY(-1px); }

        .btn-secondary {
            background: white; border: 1px solid #e2e8f0; padding: 0.875rem;
            border-radius: 12px; font-weight: 700; color: #64748b; cursor: pointer;
        }
        .btn-secondary:hover { background: #f8fafc; color: #0f172a; }

        .text-success { color: #16a34a; }
        .text-accent-500 { color: #3b82f6; }
      `}</style>
        </div>
    );
};

export default StructuralAnalyzer;
