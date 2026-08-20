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
  const [step, setStep] = useState('upload'); // upload, processing, results, error
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [identifiedElements, setIdentifiedElements] = useState([]);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Extracting drawing layers...');
  const [contextHint, setContextHint] = useState('');


  useEffect(() => {
    const processingMessages = [
      'Extracting structural nodes...',
      'Identifying material layers...',
      'Mapping reinforcement bars...',
      'Analyzing concrete volumes...',
      'Finalizing structural breakdown...',
      'Almost there! Verifying BOQ metrics...'
    ];
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

  // OpenAI/Gemini vision endpoints take a raster image, not a PDF -- there is
  // no PDF-to-image rendering step anywhere in this pipeline, so a "PDF or
  // DWG" upload (as the copy used to claim) would silently send raw
  // PDF/CAD bytes mislabeled as a PNG, producing garbled or failed reads.
  // Restricting to what the pipeline actually supports.
  const SUPPORTED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
  // Vercel's serverless function request body limit is ~4.5MB for the whole
  // JSON payload (base64 inflates raw bytes by ~4/3, plus the JSON wrapper) --
  // the UI previously claimed "Max file size: 50MB", which would either be
  // rejected outright by the platform (413) or, worse, silently truncated
  // into a corrupted image by the server's own base64 length cap. 3MB raw
  // stays safely under that ceiling.
  const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024;

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    if (!SUPPORTED_MIME_TYPES.includes(uploadedFile.type)) {
      setError('Unsupported file type. Please upload a PNG, JPG, or WEBP image of the drawing (PDF/DWG are not supported yet).');
      e.target.value = '';
      return;
    }

    if (uploadedFile.size > MAX_FILE_SIZE_BYTES) {
      setError(`File is too large (${(uploadedFile.size / (1024 * 1024)).toFixed(1)}MB). Please upload an image under 3MB -- try compressing it or exporting at a lower resolution.`);
      e.target.value = '';
      return;
    }

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
      const results = await processEngineeringDrawing(b64, contextHint, uploadedFile.type);

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
      } else if (err.message?.includes('API key')) {
        setError('Gemini API key is invalid or not configured correctly.');
      } else if (err.message?.includes('unparseable')) {
        setError('AI returned a malformed response. Please try again with a clearer image.');
      } else if (err.message?.includes('<!doctype') || err.message?.includes('<html')) {
        setError('The AI backend is not reachable from this local app session. Set VITE_API_BASE_URL to your deployed backend URL, or run from the deployed app.');
      } else if (err.message?.includes('AI backend is not available')) {
        setError(err.message);
      } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        setError('The AI backend could not be reached. Please check your connection or backend deployment URL.');
      } else {
        setError(`Analysis failed: ${err.message || 'Unknown error'}. Please ensure your API config is correct.`);
      }
      setStep('error');
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
        <p>Upload a PNG, JPG, or WEBP image of your architectural or structural drawing to automatically extract project components.</p>

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
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileUpload}
          />
          
          <div className="hint-input-group">
            <label>Context Hint (Optional)</label>
            <input 
              type="text" 
              placeholder="e.g., First Floor Slab, Foundation Layout..."
              value={contextHint}
              onChange={(e) => setContextHint(e.target.value)}
              className="context-input"
            />
          </div>

        <label htmlFor="drawing-upload" className="btn-primary">
          Select Engineering Drawing
        </label>
          <span className="hint">PNG, JPG, or WEBP · Max file size: 3MB</span>
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
            <div className="progress-bar" style={{ width: `${Math.min(progress, 100)}%` }}></div>
          </div>
          <span className="percentage">{Math.round(Math.min(progress, 100))}% Complete</span>
        </div>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="analyzer-error view-fade-in">
      <div className="error-state-icon">
        <ShieldAlert size={34} />
      </div>
      <h3>Drawing Review Stopped</h3>
      <p>{error || 'The drawing analysis could not be completed.'}</p>
      <div className="error-actions">
        <button
          className="btn-secondary"
          onClick={() => {
            setError(null);
            setProgress(0);
            setStep('upload');
          }}
        >
          Try Another Drawing
        </button>
        <button className="btn-primary" onClick={onClose}>
          Close Review
        </button>
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
        {identifiedElements.map((el, idx) => (
          <div key={el.id || `${el.category || 'element'}-${el.item || idx}-${idx}`} className="identified-card">
            <div className="card-info">
              <div className="title-row">
                <h4>{el.item}</h4>
                {el.category && <span className="category-badge">{el.category}</span>}
              </div>
              {el.description && <p className="element-description">{el.description}</p>}

              {el.structuralDetails && (el.structuralDetails.dimensions || el.structuralDetails.reinforcement) && (
                <div className="structural-details-grid">
                  {el.structuralDetails.dimensions && (
                    <div className="detail-cell">
                      <span className="detail-label">Dimensions</span>
                      <span className="detail-value">{el.structuralDetails.dimensions}</span>
                    </div>
                  )}
                  {el.structuralDetails.reinforcement && (
                    <div className="detail-cell">
                      <span className="detail-label">Reinforcement</span>
                      <span className="detail-value">{el.structuralDetails.reinforcement}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="quantity-row">
                <span>Quantity Detected: <strong>{el.quantity}</strong></span>
              </div>
            </div>
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
        {step === 'error' && renderError()}
      </div>

      <style jsx="true">{`
        .analyzer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(14px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 2rem;
          animation: da-fade 0.25s ease;
        }

        @keyframes da-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .analyzer-modal {
          width: 100%;
          max-width: 580px;
          background: white;
          border-radius: 24px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.5);
          min-height: 500px;
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
          top: 1.5rem;
          right: 1.5rem;
          background: none;
          border: none;
          color: var(--primary-400);
          cursor: pointer;
          z-index: 10;
        }

        .analyzer-upload, .analyzer-processing, .analyzer-results, .analyzer-error {
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

        .analyzer-error {
          align-items: center;
          text-align: center;
          gap: 1rem;
        }

        .error-state-icon {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        .analyzer-error h3 {
          font-size: 1.35rem;
          color: var(--primary-950);
          margin: 0;
        }

        .analyzer-error p {
          max-width: 430px;
          color: var(--primary-600);
          line-height: 1.6;
          margin: 0;
        }

        .error-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.8rem;
          width: 100%;
          max-width: 420px;
          margin-top: 0.75rem;
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
          gap: 1.5rem;
          margin-bottom: 2.5rem;
          transition: all 0.3s;
        }

        .hint-input-group {
          width: 100%;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .hint-input-group label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--primary-600);
        }

        .context-input {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          border: 1.5px solid var(--border-medium);
          font-size: 0.875rem;
          background: white;
          transition: all 0.2s;
        }

        .context-input:focus {
          border-color: var(--accent-500);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          outline: none;
        }

        .details-text {
          margin-top: 0.25rem !important;
          color: var(--accent-600) !important;
          font-weight: 500;
        }

        .drop-area:hover {
          border-color: var(--accent-400);
          background: rgba(37, 99, 235, 0.03);
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
          background: linear-gradient(90deg, #2563eb, #7c3aed);
          transition: width 0.3s ease-out;
          border-radius: 100px;
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
          transition: all 0.2s;
        }

        .identified-card:hover {
          border-color: var(--accent-300);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.08);
          transform: translateX(4px);
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

        .category-badge {
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--accent-600);
          background: rgba(37, 99, 235, 0.1);
          border: 1px solid rgba(37, 99, 235, 0.2);
          padding: 0.1rem 0.5rem;
          border-radius: 999px;
          white-space: nowrap;
        }

        .element-description {
          margin: 0 0 0.5rem !important;
        }

        .structural-details-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          padding: 0.5rem;
          background: var(--bg-main);
          border: 1px solid var(--border-light);
          border-radius: 8px;
        }

        .detail-cell {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }

        .detail-label {
          font-size: 0.62rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--primary-400);
        }

        .detail-value {
          font-size: 0.75rem;
          font-family: 'SF Mono', 'Consolas', monospace;
          color: var(--primary-800);
        }

        .quantity-row {
          font-size: 0.75rem;
          color: var(--primary-500);
        }

        .quantity-row strong {
          color: var(--primary-800);
          font-weight: 700;
        }

        .results-actions { display: grid; grid-template-columns: 1fr 2fr; gap: 1rem; }
        .text-success { color: var(--success-600); }
        .text-accent-500 { color: var(--accent-500); }

        @media (max-width: 640px) {
          .analyzer-overlay {
            padding: 1rem;
          }

          .analyzer-modal {
            border-radius: 18px;
            min-height: 0;
            max-height: calc(100vh - 2rem);
            overflow-y: auto;
          }

          .analyzer-upload, .analyzer-processing, .analyzer-results, .analyzer-error {
            padding: 2.5rem 1.25rem 1.5rem;
          }

          .drop-area {
            padding: 1.35rem;
          }

          .analysis-features,
          .error-actions,
          .results-actions {
            grid-template-columns: 1fr;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default DrawingAnalyzer;
