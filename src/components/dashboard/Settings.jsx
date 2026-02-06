import React, { useState, useEffect } from 'react';
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
import { seedMarketData } from '../../db/seed_materials';
import { Loader2 } from 'lucide-react';

const Settings = ({ user }) => {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'advanced', label: 'Professional API', icon: Key },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const [apiKey, setApiKey] = useState('');
  const [openAIKey, setOpenAIKey] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      const savedKey = await getSetting('resend_api_key');
      if (savedKey) setApiKey(savedKey);

      const savedAIKey = await getSetting('openai_api_key');
      if (savedAIKey) setOpenAIKey(savedAIKey);

      const sUrl = await getSetting('supabase_url');
      if (sUrl) setSupabaseUrl(sUrl);

      const sKey = await getSetting('supabase_anon_key');
      if (sKey) setSupabaseKey(sKey);
    };
    loadSettings();
  }, []);

  const handleSaveAPI = async () => {
    setIsSaving(true);
    await saveSetting('resend_api_key', apiKey);
    await saveSetting('openai_api_key', openAIKey);
    await saveSetting('supabase_url', supabaseUrl);
    await saveSetting('supabase_anon_key', supabaseKey);
    setIsSaving(false);
    alert('Cloud settings updated successfully.');
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
                <button className="btn-secondary-sm">Change Photo</button>
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
                <button className="btn-primary">Save Changes</button>
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
                <button className="btn-upgrade-glow">Upgrade Now</button>
              ) : (
                <button className="btn-secondary-sm">Manage Billing</button>
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
                  <button className="btn-icon"><ArrowUpCircle size={14} /></button>
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

              <div className="api-card enterprise-card mt-6">
                <div className="service-info">
                  <div className="icon-box-sm text-primary"><Zap size={20} /></div>
                  <div className="text-box">
                    <h4>OpenAI Intelligence</h4>
                    <p>Powers AI Rate Assistant and project summaries.</p>
                  </div>
                </div>
                <div className="form-item mt-4">
                  <label>OpenAI API Key</label>
                  <div className="input-group-pass">
                    <input
                      type="password"
                      value={openAIKey}
                      onChange={(e) => setOpenAIKey(e.target.value)}
                      placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
                      className="settings-input"
                    />
                  </div>
                  <p className="input-hint">Get your key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">platform.openai.com</a></p>
                </div>
                <div className="form-actions mt-4">
                  <button
                    className="btn-primary"
                    onClick={handleSaveAPI}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Connect AI Engine'}
                  </button>
                </div>
              </div>

              <div className="api-card enterprise-card mt-6">
                <div className="service-info">
                  <div className="icon-box-sm text-success"><Database size={20} /></div>
                  <div className="text-box">
                    <h4>Supabase Cloud Storage</h4>
                    <p>Enables centralized user management and project synchronization across devices.</p>
                  </div>
                </div>
                <div className="grid-2 mt-4">
                  <div className="form-item">
                    <label>Supabase URL</label>
                    <input
                      type="text"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="https://xxxx.supabase.co"
                      className="settings-input"
                    />
                  </div>
                  <div className="form-item">
                    <label>Anon Public Key</label>
                    <input
                      type="password"
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      placeholder="eyJhbGci..."
                      className="settings-input"
                    />
                  </div>
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
                      const success = await seedMarketData();
                      setIsSeeding(false);
                      if (success) alert('Market data seeded successfully!');
                      else alert('Seeding failed. Check console for details.');
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
          border-radius: var(--radius-sm);
          font-weight: 600;
          font-size: 0.875rem;
          text-align: left;
          transition: all 0.2s;
        }

        .settings-tab:hover {
          background: var(--bg-main);
          color: var(--primary-900);
        }

        .settings-tab.active {
          background: white;
          color: var(--accent-600);
          box-shadow: var(--shadow-sm);
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
          background: var(--accent-600);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 800;
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
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-sm);
          font-size: 0.875rem;
        }

        .settings-input:focus {
          outline: none;
          border-color: var(--accent-400);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
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
          background: var(--primary-950);
          color: white;
          border: none;
          padding: 0.75rem 1.25rem;
          border-radius: var(--radius-sm);
          font-weight: 700;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
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
