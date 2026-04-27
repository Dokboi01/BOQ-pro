import React, { useState, useEffect } from 'react';
import { useToast } from '../ui/useToast';
import {
  User,
  CreditCard,
  Monitor,
  Moon,
  SunMedium,
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
import { THEME_OPTIONS } from '../../utils/theme';
import { getPlanByName } from '../../data/plans';
import { getSubscriptionSnapshot } from '../../utils/subscription';

const MONEY = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

const Settings = ({ user, onUpgrade, themePreference, resolvedTheme, onThemeChange }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const toast = useToast();

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Monitor },
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
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const geminiConnected = false;
  const openaiConnected = false;
  const subscriptionView = getSubscriptionSnapshot(user);
  const currentPlan = getPlanByName(subscriptionView.planName);
  const currentBillingLabel = subscriptionView.billingCycle === 'annual'
    ? 'Annual billing'
    : subscriptionView.billingCycle === 'monthly'
      ? 'Monthly billing'
      : 'Free plan';
  const renewalLabel = subscriptionView.renewalAt
    ? new Date(subscriptionView.renewalAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    : null;
  const currentPlanSummary = (() => {
    if (subscriptionView.isFreePlan) return 'Up to 3 active projects - free forever';
    if (currentPlan.priceMonthly === null) return 'Custom enterprise pricing and rollout terms';

    return currentBillingLabel === 'Annual billing'
      ? `${currentPlan.displayAnnual} per year`
      : `${currentPlan.displayMonthly} per month`;
  })();

  useEffect(() => {
    const loadSettings = async () => {
      const savedModel = await getSetting('openai_model');
      const savedProvider = await getSetting('preferred_ai_provider');
      
      if (savedModel) setOpenaiModel(savedModel);
      if (savedProvider) setAiProvider(savedProvider);
      else setAiProvider('openai');
    };
    loadSettings();
  }, []);

  const handleSaveAPI = async () => {
    setIsSaving(true);
    toast.info('Set RESEND_API_KEY in the server environment. It is not stored in Firestore.');
    setIsSaving(false);
  };

  const handleSaveOpenAI = async () => {
    setIsSavingOpenAI(true);
    await saveSetting('openai_model', openaiModel);
    await saveSetting('preferred_ai_provider', aiProvider);
    setIsSavingOpenAI(false);
    toast.success('AI preferences saved.');
  };

  const themeOptions = [
    {
      id: THEME_OPTIONS.LIGHT,
      label: 'Light',
      description: 'Keep the current BOQ Pro bright workspace look.',
      icon: SunMedium,
    },
    {
      id: THEME_OPTIONS.DARK,
      label: 'Dark',
      description: 'Use a darker commercial workspace for longer pricing sessions.',
      icon: Moon,
    },
    {
      id: THEME_OPTIONS.SYSTEM,
      label: 'System',
      description: 'Follow the device appearance automatically.',
      icon: Monitor,
    },
  ];

  const handleSelectTheme = async (nextTheme) => {
    if (!onThemeChange || nextTheme === themePreference) return;

    setIsSavingTheme(true);
    await onThemeChange(nextTheme);
    setIsSavingTheme(false);

    const label = nextTheme === THEME_OPTIONS.SYSTEM
      ? 'device preference'
      : `${nextTheme} mode`;
    toast.success(`Appearance updated to ${label}.`);
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
      case 'appearance':
        return (
          <div className="settings-panel view-fade-in">
            <div className="settings-header">
              <h3>Appearance</h3>
              <p>Choose how BOQ Pro looks across the landing pages, dashboard, workspace, and reports.</p>
            </div>

            <div className="appearance-hero">
              <div>
                <span className="appearance-badge">Theme active</span>
                <h4>{resolvedTheme === THEME_OPTIONS.DARK ? 'Dark workspace mode' : 'Light workspace mode'}</h4>
                <p>
                  {themePreference === THEME_OPTIONS.SYSTEM
                    ? 'The app is following your device appearance right now.'
                    : 'This preference is saved to your account and reused on your next login.'}
                </p>
              </div>
              <div className="appearance-preview">
                <div className={`preview-screen ${resolvedTheme}`}>
                  <div className="preview-toolbar" />
                  <div className="preview-cards">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            </div>

            <div className="theme-option-grid">
              {themeOptions.map(({ id, label, description, icon }) => (
                <button
                  key={id}
                  className={`theme-option-card ${themePreference === id ? 'active' : ''}`}
                  onClick={() => handleSelectTheme(id)}
                  disabled={isSavingTheme}
                >
                  <div className="theme-option-head">
                    <div className="theme-option-icon">
                      {React.createElement(icon, { size: 18 })}
                    </div>
                    <span className="theme-option-check">{themePreference === id ? 'Selected' : 'Choose'}</span>
                  </div>
                  <strong>{label}</strong>
                  <p>{description}</p>
                </button>
              ))}
            </div>

            <div className="appearance-note">
              <Monitor size={16} />
              <span>
                Current render mode: <strong>{resolvedTheme}</strong>
                {themePreference === THEME_OPTIONS.SYSTEM ? ' via system sync' : ' from your saved preference'}.
              </span>
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
              <div className="plan-badge">{subscriptionView.planName} Plan</div>
              <div className="plan-details">
                <h4>{subscriptionView.planName}</h4>
                <p>{currentPlanSummary}</p>
                <span className="settings-meta-line">
                  {subscriptionView.status} - {currentBillingLabel}
                  {renewalLabel ? ` - Renews ${renewalLabel}` : ''}
                </span>
              </div>
              {subscriptionView.isFreePlan ? (
                <button className="btn-upgrade-glow" onClick={onUpgrade}>Upgrade Now</button>
              ) : (
                <button className="btn-secondary-sm" onClick={onUpgrade}>Change Plan</button>
              )}
            </div>

            <div className="limits-section">
              <h4>Workspace Usage</h4>
              <div className="limit-item">
                <div className="limit-info">
                  <span>Active Projects</span>
                  <span>{subscriptionView.isFreePlan ? '3 / 3' : currentPlan.maxProjects === Infinity ? '3 / Unlimited' : `3 / ${currentPlan.maxProjects}`}</span>
                </div>
                <div className="limit-bar"><div className="limit-fill" style={{ width: subscriptionView.isFreePlan ? '100%' : subscriptionView.planName === 'Starter' ? '30%' : '5%', background: subscriptionView.isFreePlan ? 'var(--warning-600)' : 'var(--accent-600)' }}></div></div>
              </div>
              <div className="limit-item">
                <div className="limit-info">
                  <span>Price Library Exports</span>
                  <span>12 / {subscriptionView.isFreePlan ? '15' : 'Unlimited'}</span>
                </div>
                <div className="limit-bar"><div className="limit-fill" style={{ width: subscriptionView.isFreePlan ? '80%' : '2%' }}></div></div>
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
                {user?.lastPayment ? (
                  <div className="table-row">
                    <span>{new Date(user.lastPayment.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    <span>{subscriptionView.amountKobo ? MONEY.format(subscriptionView.amountKobo / 100) : 'NGN 0'}</span>
                    <span className="badge-success">Paid</span>
                    <button className="btn-icon" onClick={() => toast.info('Downloading invoice PDF...')}>
                      <ArrowUpCircle size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="table-row">
                    <span>-</span>
                    <span>NGN 0</span>
                    <span className="badge-success">Free Tier</span>
                    <span></span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'advanced':
        return (
          <div className="settings-panel view-fade-in">
            <div className="settings-header">
              <h3>Professional API Integration</h3>
              <p>Configure server-side services and AI preferences. Secrets stay in deployment env vars, not Firestore.</p>
            </div>

            <div className="api-config-section">
              <div className="api-card enterprise-card">
                <div className="service-info">
                  <div className="icon-box-sm"><Zap size={20} className="text-accent" /></div>
                  <div className="text-box">
                    <h4>Resend Configuration</h4>
                    <p>Configure `RESEND_API_KEY` on the server for email delivery. Nothing is stored in Firestore.</p>
                  </div>
                </div>
                <div className="form-item mt-4">
                  <label>Resend API Key (server only)</label>
                  <div className="input-group-pass">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="re_xxxxxxxxxxxxxxxxxxxx"
                      className="settings-input"
                    />
                  </div>
                  <p className="input-hint">Keep the key in deployment environment variables. Do not store it in Firestore.</p>
                </div>
                <div className="form-actions mt-4">
                  <button
                    className="btn-primary"
                    onClick={handleSaveAPI}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Server Only'}
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
                    <p>Configure `GEMINI_API_KEY` on the server if you want Gemini fallback support.</p>
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
                    <p>Configure `OPENAI_API_KEY` and `OPENAI_MODEL` on the server for the default AI path.</p>
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
                  <label>OpenAI API Key (server only)</label>
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
                  <p className="input-hint">This preference is stored in Firestore. The secret key itself stays in deployment env vars.</p>
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
                    {isSavingOpenAI ? 'Saving...' : 'Save AI Preferences'}
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
                  Connected to Firebase - project data sync is still handled by the app backend.
                </div>
                <div className="form-actions mt-4">
                  <button
                    className="btn-primary"
                    onClick={handleSaveAPI}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Update Cloud Notes'}
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
                <p>API keys now belong in deployment environment variables, not in the browser or Firestore.</p>
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
          color: var(--text-secondary);
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.875rem;
          text-align: left;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
        }

        .settings-tab:hover {
          background: var(--bg-main);
          color: var(--text-primary);
          transform: translateX(4px);
        }

        .settings-tab.active {
          background: linear-gradient(135deg, #eff6ff, #dbeafe);
          color: #2563eb;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
          font-weight: 700;
        }

        .settings-content {
          background: var(--bg-card);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
          padding: 2rem;
          box-shadow: var(--shadow-sm);
        }

        .settings-header {
          margin-bottom: 2rem;
          border-bottom: 1px solid var(--border-light);
          padding-bottom: 1.5rem;
        }

        .settings-header h3 { font-size: 1.25rem; margin-bottom: 0.5rem; }
        .settings-header p { color: var(--text-muted); font-size: 0.875rem; }

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
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .settings-input {
          padding: 0.75rem;
          border: 1.5px solid var(--border-medium);
          border-radius: 10px;
          font-size: 0.875rem;
          transition: all 0.3s;
          background: var(--bg-card);
          color: var(--text-primary);
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
          background: var(--bg-card-muted);
          border: 1px solid var(--border-light);
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
        .plan-details p { font-size: 0.875rem; color: var(--text-muted); }

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
          color: var(--text-muted);
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
          background: var(--bg-card);
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
          color: var(--text-muted);
          cursor: pointer;
        }

        .placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          color: var(--text-muted);
          text-align: center;
          gap: 1rem;
        }

        .appearance-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 220px;
          gap: 1rem;
          align-items: center;
          padding: 1.35rem;
          border: 1px solid var(--border-light);
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(15, 23, 42, 0.04));
          margin-bottom: 1.25rem;
        }

        .appearance-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 0.35rem 0.7rem;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--accent-600);
          background: rgba(37, 99, 235, 0.12);
          margin-bottom: 0.8rem;
        }

        .appearance-hero h4 {
          margin: 0 0 0.45rem;
          font-size: 1.15rem;
          color: var(--text-heading);
        }

        .appearance-hero p {
          margin: 0;
          color: var(--text-secondary);
          line-height: 1.65;
          max-width: 560px;
        }

        .appearance-preview {
          display: flex;
          justify-content: flex-end;
        }

        .preview-screen {
          width: 180px;
          padding: 0.9rem;
          border-radius: 18px;
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-lg);
        }

        .preview-screen.light {
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        }

        .preview-screen.dark {
          background: linear-gradient(180deg, #0f172a 0%, #111c2f 100%);
          border-color: rgba(148, 163, 184, 0.2);
        }

        .preview-toolbar {
          height: 22px;
          border-radius: 999px;
          margin-bottom: 0.7rem;
          background: rgba(148, 163, 184, 0.18);
        }

        .preview-cards {
          display: grid;
          gap: 0.45rem;
        }

        .preview-cards span {
          display: block;
          height: 30px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.65);
        }

        .preview-screen.dark .preview-cards span {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(148, 163, 184, 0.14);
        }

        .theme-option-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .theme-option-card {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1.15rem;
          border-radius: 18px;
          border: 1px solid var(--border-light);
          background: var(--bg-card);
          text-align: left;
          color: var(--text-primary);
          box-shadow: var(--shadow-sm);
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .theme-option-card:hover:not(:disabled) {
          transform: translateY(-2px);
          border-color: var(--accent-400);
          box-shadow: var(--shadow-md);
        }

        .theme-option-card:disabled {
          opacity: 0.72;
          cursor: wait;
        }

        .theme-option-card.active {
          border-color: var(--accent-500);
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(59, 130, 246, 0.04));
        }

        .theme-option-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }

        .theme-option-icon {
          width: 38px;
          height: 38px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: var(--bg-card-muted);
          color: var(--accent-600);
        }

        .theme-option-check {
          font-size: 0.72rem;
          font-weight: 800;
          color: var(--text-muted);
        }

        .theme-option-card strong {
          font-size: 0.98rem;
        }

        .theme-option-card p {
          margin: 0;
          color: var(--text-secondary);
          line-height: 1.55;
          font-size: 0.84rem;
        }

        .appearance-note {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.75rem 0.95rem;
          border-radius: 14px;
          background: var(--bg-card-muted);
          border: 1px solid var(--border-light);
          color: var(--text-secondary);
          font-size: 0.84rem;
        }

        .appearance-note strong {
          color: var(--text-primary);
        }

        @media (max-width: 900px) {
          .settings-wrapper {
            grid-template-columns: 1fr;
          }

          .settings-nav {
            flex-direction: row;
            overflow-x: auto;
            padding-bottom: 0.4rem;
          }

          .settings-tab {
            white-space: nowrap;
          }

          .appearance-hero {
            grid-template-columns: 1fr;
          }

          .appearance-preview {
            justify-content: flex-start;
          }
        }

        @media (max-width: 640px) {
          .settings-content {
            padding: 1.25rem;
          }

          .grid-2 {
            grid-template-columns: 1fr;
          }

          .current-plan-card {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default Settings;
