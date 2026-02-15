import React, { useState, useEffect } from 'react';
import {
  FileSearch,
  Upload,
  Cpu,
  CheckCircle2,
  ShieldAlert,
  Layers,
  Maximize2,
  X,
  FileCheck,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { processEngineeringDrawing } from '../../utils/aiService';

const DrawingAnalyzer = ({ onComplete, onClose }) => {
  const [step, setStep] = useState('upload'); // upload, processing, results
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [identifiedElements, setIdentifiedElements] = useState([]);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Extracting drawing layers...');

  const processingMessages = [
    'Extracting structural nodes...',
    'Identifying material layers...',
    'Mapping reinforcement bars...',
    'Analyzing concrete volumes...',
    'Finalizing structural breakdown...',
    'Almost there! Verifying BOQ metrics...'
  ];

  useEffect(() => {
    let msgIndex = 0;
    let msgInterval;
    if (step === 'processing') {
      msgInterval = setInterval(() => {
        msgIndex = (msgIndex + 1) % processingMessages.length;
        setStatusMessage(processingMessages[msgIndex]);
      }, 5000);
    }
    return () => clearInterval(msgInterval);
  }, [step]);

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setStep('processing');
    setProgress(10);
    setError(null);

    // Dynamic progress interval to prevent "stalling"
    let progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev < 85) return prev + Math.random() * 2;
        if (prev < 95) return prev + Math.random() * 0.5; // Crawl much slower after 85
        return prev;
      });
    }, 500);

    try {
      // 1. Convert to Base64
      const b64 = await fileToBase64(uploadedFile);
      setProgress(40);

      // 2. Real AI Analysis
      const results = await processEngineeringDrawing(b64);

      clearInterval(progressInterval);
      setProgress(90);

      setIdentifiedElements(results);
      setProgress(100);
      setTimeout(() => setStep('results'), 800);
    } catch (err) {
      clearInterval(progressInterval);
      console.error('Analysis failed:', err);
      if (err.code === 'INVALID_DRAWING') {
        setError(err.message);
      } else {
        setError('AI Analysis failed. Please ensure the file is a clear drawing and your API configuration is correct.');
      }
      setStep('upload');
    }
  };

  const renderUpload = () => (
    <div className="analyzer-upload view-fade-in">
      <div className="upload-zone">
        <div className="icon-stack">
          <Upload className="upload-icon" size={48} />
          <FileSearch className="search-icon" size={24} />
        </div>
        <h3>AI Drafting Assistant</h3>
        <p>Upload your architectural or structural drawing (PDF, DWG, or PNG) to automatically extract project components.</p>

        {error && (
          <div className="error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="drop-area">
          <input
            type="file"
            id="drawing-upload"
            hidden
            accept="image/*,.pdf"
            onChange={handleFileUpload}
          />
          <label htmlFor="drawing-upload" className="btn-primary">
            Select Engineering Drawing
          </label>
          <span className="hint">Max file size: 50MB</span>
        </div>

        <div className="analysis-features">
          <div className="feat">
            <CheckCircle2 size={16} className="text-success" />
            <span>Layer Identification</span>
          </div>
          <div className="feat">
            <CheckCircle2 size={16} className="text-success" />
            <span>Material Takeoff</span>
          </div>
          <div className="feat">
            <CheckCircle2 size={16} className="text-success" />
            <span>Structural Mapping</span>
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
            <Layers className="bg-icon" size={120} />
          </div>
        </div>
        <div className="processing-status">
          <Loader2 className="animate-spin text-accent-500" size={32} />
          <h3>{statusMessage}</h3>
          <p>Extracting structural nodes and material quantities from {file?.name}</p>
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          </div>
          <span className="percentage">{progress}% Complete</span>
        </div>
      </div>
    </div>
  );

  const renderResults = () => (
    <div className="analyzer-results view-fade-in">
      <header className="results-header">
        <div className="file-pill">
          <FileCheck size={16} />
          <span>{file?.name}</span>
        </div>
        <h3>Analysis Complete</h3>
        <p>We've identified {identifiedElements.length} major structural sections.</p>
      </header>

      <div className="results-list">
        {identifiedElements.map(el => (
          <div key={el.id} className="identified-card">
            <div className="card-info">
              <div className="title-row">
                <h4>{el.title}</h4>
                <div className="confidence-badge">
                  <Cpu size={12} />
                  {el.confidence}% Confidence
                </div>
              </div>
              <p>{el.items} items identified in this layer</p>
            </div>
            <CheckCircle2 className="text-success" size={20} />
          </div>
        ))}
      </div>

      <div className="results-actions">
        <button className="btn-secondary" onClick={() => setStep('upload')}>Rescan</button>
        <button className="btn-primary" onClick={() => onComplete(identifiedElements)}>
          Construct BOQ Workspace
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
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 2rem;
        }

        .analyzer-modal {
          width: 100%;
          max-width: 560px;
          background: white;
          border-radius: 24px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          min-height: 500px;
          display: flex;
          flex-direction: column;
        }

        .btn-close {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          background: none;
          border: none;
          color: var(--primary-400);
          cursor: pointer;
          z-index: 10;
        }

        .analyzer-upload, .analyzer-processing, .analyzer-results {
          padding: 3rem;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .upload-zone { text-align: center; }

        .icon-stack {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
        }

        .upload-icon { color: var(--accent-600); }
        .search-icon { 
          position: absolute; 
          bottom: 0; 
          right: 0; 
          background: white;
          border-radius: 50%;
          padding: 4px;
          color: var(--primary-900);
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .error-banner {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
          padding: 0.75rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          text-align: left;
        }

        .upload-zone h3 { font-size: 1.5rem; margin-bottom: 0.75rem; color: var(--primary-950); }
        .upload-zone p { color: var(--primary-500); margin-bottom: 2rem; line-height: 1.6; }

        .drop-area {
          background: var(--bg-main);
          border: 2px dashed var(--border-medium);
          border-radius: 16px;
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          margin-bottom: 2.5rem;
        }

        .hint { font-size: 0.75rem; color: var(--primary-400); }

        .analysis-features { display: flex; gap: 1.5rem; justify-content: center; }
        .feat { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 700; color: var(--primary-600); }

        .scanner-container {
          position: relative;
          width: 200px;
          height: 140px;
          background: var(--primary-50);
          border-radius: 12px;
          margin: 0 auto 2rem;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mock-drawing { position: relative; color: var(--primary-200); }
        .scan-line {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: var(--accent-500);
          box-shadow: 0 0 10px var(--accent-400);
          animation: scan 2s linear infinite;
          z-index: 2;
        }

        @keyframes scan { 0% { top: 0%; } 100% { top: 100%; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }

        .processing-status { text-align: center; }
        .processing-status h3 { margin-bottom: 0.5rem; }
        .processing-status p { font-size: 0.875rem; color: var(--primary-500); margin-bottom: 2rem; }

        .progress-bar-container {
          width: 100%;
          height: 8px;
          background: var(--primary-100);
          border-radius: 100px;
          overflow: hidden;
          margin-bottom: 0.75rem;
        }

        .progress-bar {
          height: 100%;
          background: var(--accent-600);
          transition: width 0.3s ease-out;
        }

        .percentage { font-size: 0.75rem; font-weight: 800; color: var(--accent-600); }

        .results-header { text-align: center; margin-bottom: 2rem; }
        .results-list { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 2.5rem; max-height: 300px; overflow-y: auto; padding-right: 0.5rem; }

        .identified-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: var(--bg-main);
          border: 1px solid var(--border-light);
          border-radius: 12px;
        }

        .card-info { flex: 1; text-align: left; }
        .title-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem; }
        .card-info h4 { font-size: 0.875rem; margin: 0; }
        .card-info p { font-size: 0.75rem; color: var(--primary-500); margin: 0; }

        .confidence-badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.625rem;
          font-weight: 800;
          color: var(--success-600);
          background: rgba(22, 163, 74, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .results-actions { display: grid; grid-template-columns: 1fr 2fr; gap: 1rem; }
        .text-success { color: var(--success-600); }
        .text-accent-500 { color: var(--accent-500); }
      `}</style>
    </div>
  );
};

export default DrawingAnalyzer;
