import React from 'react';
import {
  Shield, ArrowRight, Mail, Phone, MapPin,
  Linkedin, Twitter, Instagram, ChevronRight
} from 'lucide-react';
import QuantraIcon from '../ui/QuantraIcon';

const NAV_LINKS = [
  { key: 'home', label: 'Home' },
  { key: 'features', label: 'Features' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'about', label: 'About' },
  { key: 'contact', label: 'Contact' },
];

const LandingLayout = ({
  children,
  currentView,
  onNavigate,
  onGetStarted,
  onLogin,
}) => {
  const isActive = (key) => currentView === key;

  return (
    <div className="landing-layout">
      <div className="landing-layout-atmosphere" />
      <div className="landing-layout-grid" />

      {/* ── Navigation ── */}
      <nav className="landing-nav-v2">
        <div className="landing-nav-inner">
          <button className="brand-mark-v2" onClick={() => onNavigate('home')}>
            <span className="brand-icon-v2">
              <QuantraIcon size={22} />
            </span>
            <span className="brand-copy-v2">
              <strong>Quantra</strong>
              <small>Rate · Quantity · Estimation</small>
            </span>
          </button>

          <div className="landing-nav-links">
            {NAV_LINKS.map((link) => (
              <button
                key={link.key}
                className={`landing-nav-link ${isActive(link.key) ? 'active' : ''}`}
                onClick={() => onNavigate(link.key)}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="landing-nav-actions">
            <button className="nav-link-v2" onClick={onLogin}>Log in</button>
            <button className="nav-cta-v2" onClick={onGetStarted}>
              Start free
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Page Content ── */}
      <main className="landing-main-v2">
        {children}
      </main>

      {/* ── Footer ── */}
      <footer className="landing-footer-v2">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-brand-mark">
              <QuantraIcon size={22} />
              <strong>Quantra</strong>
            </div>
            <p className="footer-brand-copy">
              The commercial workspace built specifically for Nigerian construction teams — from quantity surveyors and estimators to contractors and project managers.
            </p>
            <div className="footer-social">
              <a href="#" aria-label="LinkedIn"><Linkedin size={18} /></a>
              <a href="#" aria-label="Twitter"><Twitter size={18} /></a>
              <a href="#" aria-label="Instagram"><Instagram size={18} /></a>
            </div>
          </div>

          <div className="footer-columns">
            <div className="footer-col">
              <h4>Product</h4>
              <button onClick={() => onNavigate('features')}>Features</button>
              <button onClick={() => onNavigate('pricing')}>Pricing</button>
              <button onClick={() => onNavigate('home')}>BOQ Workspace</button>
              <button onClick={() => onNavigate('home')}>Material Library</button>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <button onClick={() => onNavigate('about')}>About Us</button>
              <button onClick={() => onNavigate('contact')}>Contact</button>
              <button onClick={() => onNavigate('home')}>Careers</button>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <button onClick={() => onNavigate('terms')}>Terms of Service</button>
              <button onClick={() => onNavigate('privacy')}>Privacy Policy</button>
            </div>
            <div className="footer-col">
              <h4>Contact</h4>
              <div className="footer-contact-row">
                <Mail size={14} />
                <span>hello@quantra.ng</span>
              </div>
              <div className="footer-contact-row">
                <Phone size={14} />
                <span>+234 800 Quantra</span>
              </div>
              <div className="footer-contact-row">
                <MapPin size={14} />
                <span>Lagos · Abuja · Port Harcourt</span>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Quantra. Built for Nigerian construction.</span>
          <span className="footer-bottom-trust">
            <Shield size={12} /> Secured by Firebase & Paystack
          </span>
        </div>
        <div className="footer-student">
          <span>A final year project by <strong>Hassan Adedokun AbdulMuiz</strong> · Civil Engineering · Adeleke University</span>
        </div>
      </footer>

      <style jsx="true">{`
        .landing-layout {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          background:
            radial-gradient(circle at top left, rgba(16, 185, 129, 0.07), transparent 28%),
            radial-gradient(circle at 90% 12%, rgba(5, 150, 105, 0.06), transparent 22%),
            linear-gradient(180deg, #ffffff 0%, #f8fafc 52%, #f0fdf4 100%);
          color: var(--primary-900);
          font-family: var(--font-main);
        }

        .landing-layout-atmosphere {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 18% 24%, rgba(52, 211, 153, 0.14), transparent 18%),
            radial-gradient(circle at 82% 74%, rgba(16, 185, 129, 0.10), transparent 18%);
          pointer-events: none;
        }

        .landing-layout-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(203, 213, 225, 0.35) 1px, transparent 1px),
            linear-gradient(90deg, rgba(203, 213, 225, 0.35) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.3), transparent 85%);
          pointer-events: none;
        }

        .landing-nav-v2 {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(203, 213, 225, 0.5);
        }

        .landing-nav-inner {
          width: min(1280px, calc(100% - 2rem));
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.9rem 0;
          gap: 1rem;
        }

        .brand-mark-v2 {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          border: none;
          background: transparent;
          color: inherit;
          cursor: pointer;
          padding: 0;
          text-align: left;
          flex-shrink: 0;
        }

        .brand-icon-v2 {
          width: 40px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--primary-900), var(--accent-600));
          box-shadow: 0 12px 28px rgba(16, 185, 129, 0.22);
          color: white;
        }

        .brand-copy-v2 {
          display: flex;
          flex-direction: column;
          gap: 0.05rem;
        }

        .brand-copy-v2 strong {
          font-size: 0.98rem;
          letter-spacing: 0.01em;
          color: var(--primary-950);
        }

        .brand-copy-v2 small {
          font-size: 0.68rem;
          color: var(--primary-500);
          font-weight: 600;
        }

        .landing-nav-links {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .landing-nav-link {
          padding: 0.55rem 0.9rem;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: var(--primary-600);
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .landing-nav-link:hover {
          background: rgba(16, 185, 129, 0.08);
          color: var(--primary-900);
        }

        .landing-nav-link.active {
          background: rgba(16, 185, 129, 0.12);
          color: var(--accent-600);
          font-weight: 700;
        }

        .landing-nav-actions {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-shrink: 0;
        }

        .nav-link-v2 {
          padding: 0.6rem 1rem;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: var(--primary-600);
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .nav-link-v2:hover {
          color: var(--primary-900);
          background: rgba(0,0,0,0.03);
        }

        .nav-cta-v2 {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.65rem 1.1rem;
          border-radius: 12px;
          border: none;
          background: var(--primary-900);
          color: white;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.14);
        }

        .nav-cta-v2:hover {
          transform: translateY(-1px);
          box-shadow: 0 14px 28px rgba(15, 23, 42, 0.18);
        }

        .landing-main-v2 {
          position: relative;
          z-index: 2;
          width: min(1280px, calc(100% - 2rem));
          margin: 0 auto;
          padding: 2.5rem 0 4rem;
          min-height: 60vh;
        }

        /* ── Footer ── */
        .landing-footer-v2 {
          position: relative;
          z-index: 2;
          background: linear-gradient(180deg, var(--obsidian-900), var(--obsidian-950));
          color: white;
          margin-top: 4rem;
        }

        .footer-inner {
          width: min(1280px, calc(100% - 2rem));
          margin: 0 auto;
          padding: 3.5rem 0 2.5rem;
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 4rem;
        }

        .footer-brand-mark {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          color: white;
          font-size: 1.1rem;
        }

        .footer-brand-mark svg {
          color: var(--accent-400);
        }

        .footer-brand-copy {
          margin: 1rem 0 1.5rem;
          color: var(--obsidian-300);
          font-size: 0.88rem;
          line-height: 1.7;
          max-width: 280px;
        }

        .footer-social {
          display: flex;
          gap: 0.75rem;
        }

        .footer-social a {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.08);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--obsidian-300);
          transition: all 0.2s ease;
        }

        .footer-social a:hover {
          background: var(--accent-600);
          color: white;
        }

        .footer-columns {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
        }

        .footer-col h4 {
          font-size: 0.82rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--obsidian-300);
          margin: 0 0 1rem;
        }

        .footer-col button {
          display: block;
          width: 100%;
          text-align: left;
          padding: 0.4rem 0;
          border: none;
          background: transparent;
          color: var(--obsidian-400);
          font-size: 0.86rem;
          cursor: pointer;
          transition: color 0.2s ease;
          font-family: inherit;
        }

        .footer-col button:hover {
          color: var(--accent-400);
        }

        .footer-contact-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0;
          color: var(--obsidian-400);
          font-size: 0.86rem;
        }

        .footer-contact-row svg {
          color: var(--accent-500);
          flex-shrink: 0;
        }

        .footer-bottom {
          width: min(1280px, calc(100% - 2rem));
          margin: 0 auto;
          padding: 1.25rem 0;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.78rem;
          color: var(--obsidian-500);
        }

        .footer-bottom-trust {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }

        .footer-bottom-trust svg {
          color: var(--accent-500);
        }

        @media (max-width: 900px) {
          .landing-nav-links { display: none; }
          .footer-inner { grid-template-columns: 1fr; gap: 2rem; }
          .footer-columns { grid-template-columns: repeat(2, 1fr); }
        }

        .footer-student {
          width: min(1280px, calc(100% - 2rem));
          margin: 0 auto;
          padding: 0.75rem 0 1.25rem;
          text-align: center;
          font-size: 0.75rem;
          color: var(--obsidian-400);
        }

        .footer-student strong {
          color: var(--accent-400);
          font-weight: 700;
        }

        @media (max-width: 600px) {
          .footer-columns { grid-template-columns: 1fr; }
          .footer-bottom { flex-direction: column; gap: 0.5rem; text-align: center; }
          .footer-student { padding: 0.5rem 1rem 1rem; }
        }
      `}</style>
    </div>
  );
};

export default LandingLayout;
