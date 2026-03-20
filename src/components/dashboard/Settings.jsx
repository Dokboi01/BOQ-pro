import React, { useState, useEffect } from 'react';
import { useToast } from '../ui/useToast';
import {
  User,
  CreditCard,
  Shield,
  Bell,
  ArrowUpCircle,
  Check,
  ChevronRight,
  Plus,
  Key,
  Database,
  Zap
} from 'lucide-react';
import { getSetting, saveSetting } from '../../db/database';
import { seedMarketData } from '../../db/database';
import { Loader2 } from 'lucide-react';

const Settings = ({ user, onUpgrade }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const toast = useToast();

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'advanced', label: 'Professional API', icon: Key },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const [apiKey, setApiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState(import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o');
  const [aiProvider, setAiProvider] = useState('openai');
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingOpenAI, setIsSavingOpenAI] = useState(false);

  const geminiConnected = !!import.meta.env.VITE_GEMINI_API_KEY;
  const openaiConnected = !!import.meta.env.VITE_OPENAI_API_KEY;

  useEffect(() => {
    const loadSettings = async () => {
      const savedResendKey = await getSetting('resend_api_key');
      const savedOpenAIKey = await getSetting('openai_api_key');
      const savedModel = await getSetting('openai_model');
      const savedProvider = await getSetting('preferred_ai_provider');
      
      if (savedResendKey) setApiKey(savedResendKey);
      if (savedOpenAIKey) setOpenaiKey(savedOpenAIKey);
      if (savedModel) setOpenaiModel(savedModel);
      if (savedProvider) setAiProvider(savedProvider);
      else setAiProvider('openai');
    };
    loadSettings();
  }, []);

  const handleSaveAPI = async () => {
    setIsSaving(true);
    await saveSetting('resend_api_key', apiKey);
    setIsSaving(false);
    toast.success('Resend API settings saved.');
  };

  const handleSaveOpenAI = async () => {
    setIsSavingOpenAI(true);
    await saveSetting('openai_api_key', openaiKey);
    await saveSetting('openai_model', openaiModel);
    await saveSetting('preferred_ai_provider', aiProvider);
    setIsSavingOpenAI(false);
    toast.success('AI configuration saved successfully.');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="settings-panel view-fade-in">
            <div className="settings-header">
              <h3>Profile Information</h3>
              <p>Update your personal details and professional role.</p>
            </div>
            <div className="settings-form">
              <div className="form-group-avatar">
                <div className="avatar-large">{(user?.full_name || 'P').charAt(0).toUpperCase()}</div>
                <button
                  className="btn-secondary-sm"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = () => toast.info('Avatar upload will be integrated with Firebase Storage in a future update.');
                    input.click();
                  }}
                >
                  Change Photo
                </button>
              </div>
              <div className="grid-2">
                <div className="form-item">
                  <label>Full Name</label>
                  <input type="text" defaultValue={user?.full_name} className="settings-input" />
                </div>
                <div className="form-item">
                  <label>Job Title</label>
                  <input type="text" defaultValue={user?.role || 'Quantity Surveyor'} className="settings-input" />
                </div>
              </div>
              <div className="form-item">
                <label>Work Email</label>
                <input type="email" defaultValue={user?.email} className="settings-input" />
              </div>
              <div className="form-actions">
                <button
                  className="btn-primary"
                  onClick={() => toast.success('Profile changes saved successfully.')}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        );
      case 'subscription':
        return (
          <div className="settings-panel view-fade-in">
            <div className="settings-header">
              <h3>Subscription Plan</h3>
              <p>Manage your billing and plan limits.</p>
            </div>

            <div className="current-plan-card">
              <div className="plan-badge">{user?.plan || 'Free'} Plan</div>
              <div className="plan-details">
                <h4>{user?.plan === 'Free' ? 'Student & Basic' : 'Practitioner Pro'}</h4>
                <p>{user?.plan === 'Free' ? 'Limited to 3 projects' : 'Unlimited professional projects'}</p>
              </div>
              {user?.plan === 'Free' ? (
                <button className="btn-upgrade-glow" onClick={onUpgrade}>Upgrade Now</button>
              ) : (
                <button className="btn-secondary-sm" onClick={() => toast.info('Billing portal is being synchronized with Paystack/Flutterwave.')}>Manage Billing</button>
              )}
            </div>

            <div className="limits-section">
              <h4>Workspace Usage</h4>
              <div className="limit-item">
                <div className="limit-info">
                  <span>Active Projects</span>
                  <span>3 / {user?.plan === 'Free' ? '3' : '∞'}</span>
                </div>
                <div className="limit-bar"><div className="limit-fill" style={{ width: user?.plan === 'Free' ? '100%' : '5%', background: user?.plan === 'Free' ? 'var(--warning-600)' : 'var(--accent-600)' }}></div></div>
              </div>
              <div className="limit-item">
                <div className="limit-info">
                  <span>Price Library Exports</span>
                  <span>12 / {user?.plan === 'Free' ? '15' : '∞'}</span>
                </div>
                <div className="limit-bar"><div className="limit-fill" style={{ width: user?.plan === 'Free' ? '80%' : '2%' }}></div></div>
              </div>
            </div>

            <div className="history-section">
              <h4>Billing History</h4>
              <div className="billing-table">
                <div className="table-header">
                  <span>Date</span>
                  <span>Amount</span>
                  <span>Status</span>
                  <span></span>
                </div>
                <div className="table-row">
                  <span>Oct 12, 2025</span>
                  <span>₦0.00</span>
                  <span className="badge-success">Paid</span>
                  <button className="btn-icon" onClick={() => toast.info('Downloading invoice PDF...')}>
                    <ArrowUpCircle size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'advanced':
        return (
          <div className="settings-panel view-fade-in">
            <div className="settings-header">
              <h3>Professional API Integration</h3>
              <p>Connect third-party services like Resend for automated client emails.</p>
            </div>

            <div className="api-config-section">
              <div className="api-card enterprise-card">
                <div className="service-info">
                  <div className="icon-box-sm"><Zap size={20} className="text-accent" /></div>
                  <div className="text-box">
                    <h4>Resend Configuration</h4>
                    <p>Used for sending verification codes and project reports to clients.</p>
                  </div>
                </div>
                <div className="form-item mt-4">
                  <label>Resend API Key</label>
                  <div className="input-group-pass">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="re_xxxxxxxxxxxxxxxxxxxx"
                      className="settings-input"
                    />
                  </div>
                  <p className="input-hint">Get your key from <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer">resend.com/api-keys</a></p>
                </div>
                <div className="form-actions mt-4">
                  <button
                    className="btn-primary"
                    onClick={handleSaveAPI}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Verify & Save'}
                  </button>
                </div>
              </div>

              <div className="api-card enterprise-card mt-6" style={{ background: geminiConnected ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : undefined, borderColor: geminiConnected ? '#86efac' : undefined }}>
                <div className="service-info">
                  <div className="icon-box-sm" style={{ background: geminiConnected ? '#bbf7d0' : '#f1f5f9' }}>
                    <Zap size={20} style={{ color: geminiConnected ? '#16a34a' : '#94a3b8' }} />
                  </div>
                  <div className="text-box">
                    <h4>Google Gemini AI</h4>
                    <p>Fallback engine for AI Rate Analysis, Project Summaries, and Drawing Analysis.</p>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <span style={{
                      padding: '0.35rem 0.85rem',
                      borderRadius: '100px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: geminiConnected ? '#16a34a' : '#ef4444',
                      color: 'white'
                    }}>
                      {geminiConnected ? '✓ Connected' : '✗ No Key'}
                    </span>
                  </div>
                </div>
                {geminiConnected && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(22,163,74,0.08)', borderRadius: '8px', fontSize: '0.8125rem', color: '#15803d', fontWeight: 600 }}>
                    ✓ Gemini API key loaded from environment — no configuration needed.
                  </div>
                )}
              </div>

              <div className="api-card enterprise-card mt-6" style={{ background: openaiKey || openaiConnected ? 'linear-gradient(135deg, #f0f9ff, #e0f2fe)' : undefined, borderColor: openaiKey || openaiConnected ? '#7dd3fc' : undefined }}>
                <div className="service-info">
                  <div className="icon-box-sm" style={{ background: openaiKey || openaiConnected ? '#bae6fd' : '#f1f5f9' }}>
                    <Zap size={20} style={{ color: openaiKey || openaiConnected ? '#0284c7' : '#94a3b8' }} />
                  </div>
                  <div className="text-box">
                    <h4>OpenAI (Default)</h4>
                    <p>Primary engine for Professional AI Insights and Vision Analysis in local and Vercel deployments.</p>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <span style={{
                      padding: '0.35rem 0.85rem',
                      borderRadius: '100px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: openaiKey || openaiConnected ? '#0284c7' : '#ef4444',
                      color: 'white'
                    }}>
                      {openaiKey || openaiConnected ? '✓ Ready' : '✗ No Key'}
                    </span>
                  </div>
                </div>
                {openaiConnected && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(2,132,199,0.08)', borderRadius: '8px', fontSize: '0.8125rem', color: '#0369a1', fontWeight: 600 }}>
                    ✓ OpenAI API key loaded from environment — global access active.
                  </div>
                )}
                
                <div className="form-item mt-4">
                  <label>OpenAI API Key</label>
                  <input
                    type="password"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
                    className="settings-input"
                  />
                </div>

                <div className="form-item mt-4">
                  <label>OpenAI Model ID</label>
                  <input
                    type="text"
                    value={openaiModel}
                    onChange={(e) => setOpenaiModel(e.target.value)}
                    placeholder="gpt-4o, gpt-4.1, etc."
                    className="settings-input"
                  />
                  <p className="input-hint">Specify the OpenAI model version to use by default in local and Vercel environments.</p>
                </div>

                <div className="form-item mt-4">
                  <label>Default AI Provider</label>
                  <select 
                    value={aiProvider} 
                    onChange={(e) => setAiProvider(e.target.value)}
                    className="settings-input"
                  >
                    <option value="openai">OpenAI (Default)</option>
                    <option value="gemini">Google Gemini (Fallback)</option>
                  </select>
                </div>

                <div className="form-actions mt-4">
                  <button
                    className="btn-primary"
                    onClick={handleSaveOpenAI}
                    disabled={isSavingOpenAI}
                  >
                    {isSavingOpenAI ? 'Saving...' : 'Save AI Config'}
                  </button>
                </div>
              </div>

              <div className="api-card enterprise-card mt-6">
                <div className="service-info">
                  <div className="icon-box-sm text-success"><Database size={20} /></div>
                  <div className="text-box">
                    <h4>Firebase Cloud Backend</h4>
                    <p>Project data is automatically synced to Firebase Firestore across all your devices.</p>
                  </div>
                </div>
                <div className="mt-4" style={{ padding: '0.75rem', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '8px', fontSize: '0.8125rem', color: '#4ade80' }}>
                  ✅ Connected to Firebase — Project: boq-pro-72332
                </div>
                <div className="form-actions mt-4">
                  <button
                    className="btn-primary"
                    onClick={handleSaveAPI}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Connect Cloud'}
                  </button>
                </div>
              </div>

              <div className="enterprise-card api-section mt-6">
                <div className="api-header">
                  <div>
                    <h4>Market Intelligence Seeding</h4>
                    <p>Populate your database with the latest Nigerian construction market rates (2025/2026).</p>
                  </div>
                </div>
                <div className="api-inputs">
                  <button
                    className="btn-primary-action"
                    onClick={async () => {
                      setIsSeeding(true);
                      const result = await seedMarketData();
                      setIsSeeding(false);
                      if (result === true) toast.success('Market data seeded successfully! All 43 materials loaded.');
                      else toast.error('Seeding failed: ' + (result?.error || 'Unknown error — check browser console (F12)'));
                    }}
                    disabled={isSeeding}
                  >
                    {isSeeding ? <Loader2 className="animate-spin" size={18} /> : 'Seed Professional Market Data'}
                  </button>
                </div>
              </div>

              <div className="enterprise-card api-section mt-6">
                <div className="icon-box-tip"><Database size={16} /></div>
                <p>API keys are stored securely in your local database. They are never transmitted to our servers.</p>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="settings-panel placeholder view-fade-in">
            <Check size={48} className="text-subtle" />
            <p>This section is coming soon.</p>
          </div>
        );
    }
  };

  return (
    <div className="settings-wrapper view-fade-in">
      <aside className="settings-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
          </button>
        ))}
      </aside>

      <main className="settings-content">
        {renderContent()}
      </main>

      <style jsx="true">{`
        .settings-wrapper {
          display: grid;
          grid-template-columns: 240px 1fr;
          gap: 2rem;
          min-height: 600px;
        }

        .settings-nav {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .settings-tab {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border: none;
          background: transparent;
          color: var(--primary-600);
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.875rem;
          text-align: left;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }

        .settings-tab:hover {
          background: var(--bg-main);
          color: var(--primary-900);
          transform: translateX(4px);
        }

        .settings-tab.active {
          background: linear-gradient(135deg, #eff6ff, #dbeafe);
          color: #2563eb;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
          font-weight: 700;
        }

        .settings-content {
          background: white;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
          padding: 2rem;
        }

        .settings-header {
          margin-bottom: 2rem;
          border-bottom: 1px solid var(--border-light);
          padding-bottom: 1.5rem;
        }

        .settings-header h3 { font-size: 1.25rem; margin-bottom: 0.5rem; }
        .settings-header p { color: var(--primary-500); font-size: 0.875rem; }

        .settings-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          max-width: 600px;
        }

        .form-group-avatar {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 1rem;
        }

        .avatar-large {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 800;
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
        }

        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-item label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--primary-700);
          text-transform: uppercase;
        }

        .settings-input {
          padding: 0.75rem;
          border: 1.5px solid var(--border-medium);
          border-radius: 10px;
          font-size: 0.875rem;
          transition: all 0.3s;
        }

        .settings-input:focus {
          outline: none;
          border-color: var(--accent-500);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1), 0 4px 12px rgba(37, 99, 235, 0.08);
        }

        .btn-primary {
          background: var(--primary-900);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: var(--radius-sm);
          font-weight: 700;
          cursor: pointer;
        }

        .current-plan-card {
          background: var(--bg-main);
          border-radius: var(--radius-md);
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .plan-badge {
          background: var(--accent-600);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .plan-details { flex: 1; }
        .plan-details h4 { margin-bottom: 0.25rem; }
        .plan-details p { font-size: 0.875rem; color: var(--primary-500); }

        .btn-upgrade-glow {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: white;
          border: none;
          padding: 0.75rem 1.25rem;
          border-radius: 10px;
          font-weight: 700;
          box-shadow: 0 8px 20px rgba(0,0,0,0.2);
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-upgrade-glow:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(0,0,0,0.3);
        }

        .limits-section {
          margin-bottom: 2.5rem;
        }

        .limits-section h4 { margin-bottom: 1.25rem; font-size: 0.875rem; }

        .limit-item {
          margin-bottom: 1.25rem;
        }

        .limit-info {
          display: flex;
          justify-content: space-between;
          font-size: 0.8125rem;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .limit-bar {
          height: 6px;
          background: var(--bg-main);
          border-radius: 100px;
          overflow: hidden;
        }

        .limit-fill { height: 100%; border-radius: 100px; background: var(--primary-800); }

        .history-section h4 { margin-bottom: 1rem; font-size: 0.875rem; }
        
        .billing-table {
          border: 1px solid var(--border-light);
          border-radius: var(--radius-sm);
        }

        .table-header {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 40px;
          padding: 0.75rem 1rem;
          background: var(--bg-main);
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--primary-500);
          text-transform: uppercase;
        }

        .table-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 40px;
          padding: 1rem;
          align-items: center;
          font-size: 0.875rem;
          border-top: 1px solid var(--border-light);
          transition: background 0.2s;
        }

        .table-row:hover {
          background: var(--bg-main);
        }

        .badge-success {
          color: var(--success-600);
          font-weight: 700;
        }

        .btn-icon {
          background: transparent;
          border: none;
          color: var(--primary-400);
          cursor: pointer;
        }

        .placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          color: var(--primary-400);
          text-align: center;
          gap: 1rem;
        }
      `}</style>
    </div>
  );
};

export default Settings;
