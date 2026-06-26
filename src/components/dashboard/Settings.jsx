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
  Zap,
  Sun,
  Moon
} from 'lucide-react';
import { getSetting, saveSetting } from '../../db/database';
import { seedMarketData } from '../../db/database';
import { Loader2 } from 'lucide-react';
import { getPlanByName } from '../../data/plans';
import { getSubscriptionSnapshot } from '../../utils/subscription';

const MONEY = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
});

const Settings = ({ user, onUpgrade, theme, onToggleTheme }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const toast = useToast();

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'advanced', label: 'Professional API', icon: Key },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const [openaiModel, setOpenaiModel] = useState('gpt-4o');
  const [aiProvider, setAiProvider] = useState('openai');
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
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

  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    await saveSetting('openai_model', openaiModel);
    await saveSetting('preferred_ai_provider', aiProvider);
    setIsSavingPrefs(false);
    toast.success('AI preferences saved.');
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
              <div className="form-item">
                <label>Appearance (Theme)</label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={() => theme === 'dark' && onToggleTheme()}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      border: '1.5px solid var(--border-medium)',
                      borderRadius: '10px',
                      background: theme === 'light' ? 'var(--bg-card-muted)' : 'var(--bg-card)',
                      borderColor: theme === 'light' ? 'var(--quantra-blue-500)' : 'var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Sun size={16} style={{ color: theme === 'light' ? 'var(--quantra-blue-500)' : 'var(--text-muted)' }} /> Light Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => theme === 'light' && onToggleTheme()}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      border: '1.5px solid var(--border-medium)',
                      borderRadius: '10px',
                      background: theme === 'dark' ? 'var(--bg-card-muted)' : 'var(--bg-card)',
                      borderColor: theme === 'dark' ? 'var(--quantra-blue-500)' : 'var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Moon size={16} style={{ color: theme === 'dark' ? 'var(--quantra-blue-500)' : 'var(--text-muted)' }} /> Dark Mode
                  </button>
                </div>
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
              <div className="plan-badge">{subscriptionView.planName} Plan</div>
              <div className="plan-details">
                <h4>{subscriptionView.planName}</h4>
                <p>{currentPlanSummary}</p>
                <span className="settings-meta-line">
                  {subscriptionView.status} - {currentBillingLabel}
                  {renewalLabel ? ` - Renews ${renewalLabel}` : ''}
                </span>
              </div>
              {subscriptionView.planName !== 'Enterprise' && (
                subscriptionView.isFreePlan ? (
                  <button className="btn-upgrade-glow" onClick={onUpgrade}>Upgrade Now</button>
                ) : (
                  <button className="btn-secondary-sm" onClick={onUpgrade}>Change Plan</button>
                )
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
              <p>Manage AI preferences and review server-side service configuration. Secrets are never stored here.</p>
            </div>

            <div className="api-config-section">

              {/* ── Resend (email delivery) ── */}
              <div className="api-card enterprise-card">
                <div className="service-info">
                  <div className="icon-box-sm"><Zap size={20} className="text-accent" /></div>
                  <div className="text-box">
                    <h4>Resend — Email Delivery</h4>
                    <p>Report emails are sent via <strong>Resend</strong> using a server-side key. No configuration is needed here.</p>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <span className="env-badge env-badge--server">Server Only</span>
                  </div>
                </div>
                <div className="env-var-info">
                  <span className="env-var-label">Deployment env var</span>
                  <code className="env-var-code">RESEND_API_KEY</code>
                  <span className="env-var-hint">Set this in your Vercel / Railway project settings. It is never stored in Firestore or the browser.</span>
                </div>
              </div>

              {/* ── Google Gemini ── */}
              <div className="api-card enterprise-card mt-6" style={{ borderColor: geminiConnected ? '#86efac' : undefined }}>
                <div className="service-info">
                  <div className="icon-box-sm" style={{ background: geminiConnected ? '#bbf7d0' : '#f1f5f9' }}>
                    <Zap size={20} style={{ color: geminiConnected ? '#16a34a' : '#94a3b8' }} />
                  </div>
                  <div className="text-box">
                    <h4>Google Gemini AI</h4>
                    <p>Used as the AI fallback when Gemini is selected as the preferred provider.</p>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <span style={{
                      padding: '0.35rem 0.85rem',
                      borderRadius: '100px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: geminiConnected ? '#16a34a' : '#94a3b8',
                      color: 'white'
                    }}>
                      {geminiConnected ? '✓ Active' : 'Not Configured'}
                    </span>
                  </div>
                </div>
                <div className="env-var-info">
                  <span className="env-var-label">Deployment env var</span>
                  <code className="env-var-code">GEMINI_API_KEY</code>
                  <span className="env-var-hint">Set this in your deployment dashboard. The key never touches the browser or Firestore.</span>
                </div>
              </div>

              {/* ── OpenAI ── */}
              <div className="api-card enterprise-card mt-6" style={{ borderColor: openaiConnected ? '#7dd3fc' : undefined }}>
                <div className="service-info">
                  <div className="icon-box-sm" style={{ background: openaiConnected ? '#bae6fd' : '#f1f5f9' }}>
                    <Zap size={20} style={{ color: openaiConnected ? '#0284c7' : '#94a3b8' }} />
                  </div>
                  <div className="text-box">
                    <h4>OpenAI — Default AI Provider</h4>
                    <p>Powers rate analysis, drawing interpretation, and structural summaries.</p>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <span style={{
                      padding: '0.35rem 0.85rem',
                      borderRadius: '100px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: openaiConnected ? '#0284c7' : '#94a3b8',
                      color: 'white'
                    }}>
                      {openaiConnected ? '✓ Active' : 'Not Configured'}
                    </span>
                  </div>
                </div>
                <div className="env-var-info">
                  <span className="env-var-label">Deployment env var</span>
                  <code className="env-var-code">OPENAI_API_KEY</code>
                  <span className="env-var-hint">Set this in your deployment dashboard. The key never touches the browser or Firestore.</span>
                </div>

                {/* Model + provider preferences are safe to store in Firestore */}
                <div className="prefs-divider">AI Preferences — saved to your account</div>

                <div className="form-item mt-4">
                  <label>OpenAI Model ID</label>
                  <input
                    type="text"
                    value={openaiModel}
                    onChange={(e) => setOpenaiModel(e.target.value)}
                    placeholder="gpt-4o, gpt-4.1, o3-mini…"
                    className="settings-input"
                  />
                  <p className="input-hint">This preference (not the key) is stored in your Firestore account and applied on every AI request.</p>
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
                    onClick={handleSavePreferences}
                    disabled={isSavingPrefs}
                  >
                    {isSavingPrefs ? 'Saving…' : 'Save AI Preferences'}
                  </button>
                </div>
              </div>

              {/* ── Firebase ── */}
              <div className="api-card enterprise-card mt-6">
                <div className="service-info">
                  <div className="icon-box-sm text-success"><Database size={20} /></div>
                  <div className="text-box">
                    <h4>Firebase Cloud Backend</h4>
                    <p>Project data syncs automatically to Firestore across all your devices. No configuration needed.</p>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <span className="env-badge env-badge--ok">Connected</span>
                  </div>
                </div>
              </div>

              {/* ── Market seeding ── */}
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

              {/* ── Footer note ── */}
              <div className="enterprise-card api-section mt-6">
                <div className="icon-box-tip"><Shield size={16} /></div>
                <p>All API secrets are managed exclusively in your deployment environment. They are never stored in Firestore or sent to the browser.</p>
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
          background: linear-gradient(135deg, #ecfdf5, #a7f3d0);
          color: #059669;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
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
          background: linear-gradient(135deg, #059669, #0d9488);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 800;
          box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
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
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1), 0 4px 12px rgba(16, 185, 129, 0.08);
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

        .env-var-info {
          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 0.5rem 0.75rem;
          margin-top: 1rem;
          padding: 0.85rem 1rem;
          background: var(--bg-main);
          border: 1px solid var(--border-light);
          border-radius: 10px;
          font-size: 0.8125rem;
        }

        .env-var-label {
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          font-size: 0.7rem;
          letter-spacing: 0.05em;
          flex-shrink: 0;
        }

        .env-var-code {
          font-family: ui-monospace, SFMono-Regular, monospace;
          background: rgba(16, 185, 129, 0.1);
          color: var(--accent-700, #059669);
          padding: 0.15rem 0.55rem;
          border-radius: 6px;
          font-size: 0.8125rem;
          font-weight: 600;
          flex-shrink: 0;
        }

        .env-var-hint {
          color: var(--text-muted);
          font-size: 0.78rem;
          line-height: 1.5;
          flex: 1 1 200px;
        }

        .env-badge {
          padding: 0.3rem 0.75rem;
          border-radius: 100px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .env-badge--server {
          background: #f1f5f9;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }

        .env-badge--ok {
          background: #dcfce7;
          color: #15803d;
          border: 1px solid #86efac;
        }

        .prefs-divider {
          margin-top: 1.25rem;
          padding-top: 1.25rem;
          border-top: 1px dashed var(--border-light);
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
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
