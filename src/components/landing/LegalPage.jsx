import React from 'react';
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Database,
  FileText,
  Shield,
  Sparkles
} from 'lucide-react';

const EFFECTIVE_DATE = 'April 5, 2026';

const TERMS_SECTIONS = [
  {
    title: '1. Acceptance of these Terms',
    body: [
      'These Terms and Conditions govern access to and use of BOQ Pro, including the web application, pricing workspace, benchmark rate tools, reporting tools, integrations, and related services.',
      'By creating an account, purchasing a plan, accessing a company workspace, or using BOQ Pro, you agree to be bound by these Terms. If you use BOQ Pro on behalf of a company, consultancy, contractor, or other organization, you confirm that you have authority to bind that organization to these Terms.'
    ]
  },
  {
    title: '2. What BOQ Pro provides',
    body: [
      'BOQ Pro is a construction pricing and commercial workflow platform built to help users create, manage, review, and export bills of quantities, benchmark-driven estimates, custom rate build-ups, reports, and related project records.',
      'Certain parts of the Service may use benchmark market data, regional adjustments, project templates, automated calculations, collaboration tools, and AI-assisted features to speed up estimating and commercial review.'
    ]
  },
  {
    title: '3. Accounts and company workspaces',
    body: [
      'You are responsible for maintaining the confidentiality of your login credentials and for activities that occur under your account or company workspace.',
      'You must provide accurate signup and billing information, keep your contact details reasonably current, and ensure that only authorized users access your company workspace.',
      'We may suspend or restrict accounts that are used fraudulently, deceptively, unlawfully, or in a way that threatens the security or integrity of the Service.'
    ]
  },
  {
    title: '4. Benchmark pricing and professional responsibility',
    body: [
      'BOQ Pro is designed to automate pricing visibility by combining user-entered quantities with benchmark rates, regional pricing logic, and other commercial inputs. Unless an item is switched to a custom pricing mode, users should expect BOQ Pro to calculate an amount from the available benchmark rate and entered quantity.',
      'Benchmark rates, material intelligence, market signals, and automated amounts are provided as decision-support tools only. They are not a guarantee of market availability, procurement cost, tender outcome, final contract sum, or site performance.',
      'You remain responsible for reviewing all quantities, assumptions, rates, exclusions, taxes, preliminaries, logistics, wastage, scope interpretation, and final commercial outputs before relying on them for procurement, tendering, valuation, negotiation, or contract administration.'
    ]
  },
  {
    title: '5. Custom pricing, project data, and exports',
    body: [
      'You retain responsibility for the content you upload or create in BOQ Pro, including drawings, BOQ descriptions, pricing notes, rates, reports, exports, comments, and task records.',
      'You represent that you have the necessary rights to upload, process, share, and export your project data using the Service.',
      'Exports, reports, and shared project links should be reviewed before being sent to clients, consultants, contractors, or other third parties.'
    ]
  },
  {
    title: '6. AI features and third-party services',
    body: [
      'Some BOQ Pro features may rely on third-party infrastructure or services, including hosting, authentication, analytics, payment processing, AI providers, cloud databases, and email delivery providers.',
      'AI-generated suggestions, summaries, classifications, or recommendations may be incomplete or inaccurate and must be reviewed by a human user before adoption.',
      'Third-party services may also have their own terms, privacy policies, and technical limits that apply to your use of those services through BOQ Pro.'
    ]
  },
  {
    title: '7. Fees, subscriptions, billing, and refunds',
    body: [
      'Paid features may be offered on subscription or quoted commercial terms. Where applicable, fees are payable in advance and may be billed monthly, annually, or on another agreed commercial cycle.',
      'Payments processed through BOQ Pro may be handled by a third-party payment processor, including Paystack. You authorize BOQ Pro and its payment processor to collect the applicable charges, taxes, and any permitted adjustments for your chosen plan.',
      'Except where required by applicable law, paid fees are generally non-refundable once a billing period begins or a paid service has been provisioned. If BOQ Pro approves a refund, payment processor charges may still remain non-refundable where the payment processor treats them as already consumed service charges.'
    ]
  },
  {
    title: '8. Acceptable use',
    body: [
      'You must not use BOQ Pro to violate law, infringe intellectual property rights, upload malicious code, interfere with other users, reverse engineer restricted parts of the Service, scrape the Service at scale without permission, or attempt unauthorized access to accounts, projects, or company workspaces.',
      'You must not misrepresent benchmark outputs as guaranteed market quotations issued directly by BOQ Pro or by any supplier unless that representation is true and properly documented.'
    ]
  },
  {
    title: '9. Intellectual property',
    body: [
      'BOQ Pro, including its software, design, workflows, branding, benchmark presentation logic, and related materials, remains the property of BOQ Pro and its licensors, except for user-owned project content.',
      'Subject to these Terms and any applicable paid plan, BOQ Pro grants you a limited, non-exclusive, revocable right to access and use the Service for your internal business, educational, or evaluation use.',
      'You may not copy, resell, sublicense, redistribute, or create unauthorized derivative offerings from the Service except where BOQ Pro expressly permits it in writing.'
    ]
  },
  {
    title: '10. Availability, sync, and backups',
    body: [
      'BOQ Pro may offer local-first saving, cloud sync, offline buffering, and cloud backup features, but uninterrupted availability is not guaranteed.',
      'You should maintain your own reasonable internal controls and backups for important commercial records and final contract documents. Temporary sync delay, service interruption, browser issues, or third-party outages may affect project availability or freshness.'
    ]
  },
  {
    title: '11. Data handling and privacy',
    body: [
      'BOQ Pro may process account information, company information, project data, usage events, device or browser metadata, payment references, and support communications in order to provide, secure, improve, and support the Service.',
      'Where BOQ Pro processes personal data, it will do so in accordance with its Privacy Policy and applicable law, including relevant data protection requirements that may apply in Nigeria and in the jurisdictions where users operate.',
      'You are responsible for ensuring that your own use of BOQ Pro complies with any client confidentiality, procurement, data handling, and project information obligations that apply to your business.'
    ]
  },
  {
    title: '12. Suspension and termination',
    body: [
      'You may stop using the Service at any time. BOQ Pro may suspend, limit, or terminate access where reasonably necessary for security, non-payment, fraud prevention, legal compliance, abuse prevention, or material breach of these Terms.',
      'Upon termination, provisions that reasonably should survive termination will remain in effect, including provisions on fees already incurred, intellectual property, disclaimers, limitation of liability, and dispute resolution.'
    ]
  },
  {
    title: '13. Disclaimers and limitation of liability',
    body: [
      'To the maximum extent permitted by law, BOQ Pro is provided on an "as is" and "as available" basis. We do not warrant that the Service will always be uninterrupted, error-free, fully secure, or suitable for every procurement, tender, estimating, or commercial purpose.',
      'To the maximum extent permitted by law, BOQ Pro and its operators will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of profit, revenue, goodwill, data, contracts, or business opportunity arising out of or related to use of the Service.',
      'Nothing in these Terms limits liability that cannot be excluded by applicable law, including any mandatory rights users may have under consumer protection or other non-excludable legal rules.'
    ]
  },
  {
    title: '14. Governing law and disputes',
    body: [
      'Unless otherwise required by applicable law or a written enterprise agreement, these Terms are governed by the laws of the Federal Republic of Nigeria.',
      'Any dispute arising out of or relating to these Terms or the Service will be subject to the jurisdiction of the competent courts in Nigeria, unless another forum is required by law or agreed in writing between the parties.'
    ]
  },
  {
    title: '15. Changes to these Terms',
    body: [
      'BOQ Pro may update these Terms from time to time to reflect product changes, legal requirements, pricing changes, or operational needs. When material changes are made, BOQ Pro may update the effective date and provide notice through the app, website, billing flow, or other reasonable channels.',
      'Your continued use of BOQ Pro after updated Terms take effect means you accept the revised Terms.'
    ]
  },
  {
    title: '16. Contact',
    body: [
      'For legal, billing, or account questions about these Terms, use the official BOQ Pro support or commercial contact channel made available inside the app, on your pricing page, or through your subscription or onboarding communications.'
    ]
  }
];

const PRIVACY_SECTIONS = [
  {
    title: 'Privacy Snapshot',
    body: [
      'BOQ Pro may collect account details, company details, project content, benchmark selections, usage events, device or browser information, and billing references needed to operate the Service.',
      'This information may be used to authenticate users, save projects, sync workspaces, process payments, deliver support, improve benchmark quality, detect abuse, and keep the platform secure.',
      'Project and account data may be processed through service providers used by BOQ Pro, such as hosting, cloud database, analytics, payment, and email providers. Those providers process data under their own terms and privacy commitments.'
    ]
  },
  {
    title: 'Your responsibilities',
    body: [
      'Do not upload personal or confidential information that you are not authorized to process through BOQ Pro.',
      'Where client, employee, or site data is involved, make sure your organization has an appropriate lawful basis and internal approval for using BOQ Pro to manage that information.'
    ]
  },
  {
    title: 'Your choices',
    body: [
      'Depending on applicable law and your subscription setup, you may have rights relating to access, correction, deletion, or restriction of personal data. You can start those requests through BOQ Pro support.',
      'Privacy-related details should be reviewed and supplemented with your final legal and operational contact information before public release.'
    ]
  }
];

const LegalSection = ({ section }) => (
  <article className="legal-section-card">
    <h3>{section.title}</h3>
    {section.body.map((paragraph) => (
      <p key={paragraph}>{paragraph}</p>
    ))}
  </article>
);

const LegalPage = ({ mode = 'terms', onBack }) => {
  const isPrivacy = mode === 'privacy';
  const pageTitle = isPrivacy ? 'Privacy Policy' : 'Terms and Conditions';
  const pageSubtitle = isPrivacy
    ? 'A plain-language summary of how BOQ Pro handles account, project, and billing-related data.'
    : 'The commercial and legal framework for using BOQ Pro as a benchmark-first construction pricing platform.';

  return (
    <div className="legal-shell">
      <div className="legal-atmosphere" />
      <div className="legal-grid-overlay" />

      <nav className="legal-nav">
        <button className="brand-mark" onClick={onBack}>
          <span className="brand-icon">
            <Shield size={18} />
          </span>
          <span className="brand-copy">
            <strong>BOQ Pro</strong>
            <small>Commercial workspace for construction teams</small>
          </span>
        </button>

        <div className="nav-actions">
          <button className="nav-back-btn" onClick={onBack}>
            <ArrowLeft size={16} />
            Back
          </button>
        </div>
      </nav>

      <main className="legal-main">
        <section className="legal-hero">
          <div className="section-kicker">
            <Sparkles size={14} />
            BOQ Pro legal
          </div>
          <h1>
            {pageTitle}
            <span> for the current BOQ Pro product.</span>
          </h1>
          <p className="legal-subtitle">{pageSubtitle}</p>

          <div className="legal-meta-strip">
            <span>
              <FileText size={15} />
              Effective date: {EFFECTIVE_DATE}
            </span>
            <span>
              <Building2 size={15} />
              Built for company workspaces, BOQ pricing, and reporting
            </span>
            <span>
              <CreditCard size={15} />
              Covers subscriptions and payment processing
            </span>
            <span>
              <Database size={15} />
              Includes sync, benchmark, and data handling terms
            </span>
          </div>
        </section>

        <section className="legal-grid">
          <div className="legal-primary">
            {!isPrivacy && TERMS_SECTIONS.map((section) => (
              <LegalSection key={section.title} section={section} />
            ))}
            {isPrivacy && PRIVACY_SECTIONS.map((section) => (
              <LegalSection key={section.title} section={section} />
            ))}
          </div>

          <aside className="legal-sidebar">
            <div className="sidebar-card">
              <span className="sidebar-label">Quick read</span>
              <h2>{isPrivacy ? 'What this page covers' : 'What these terms cover'}</h2>
              <ul>
                <li>Benchmark-first pricing automation</li>
                <li>Custom pricing and exports</li>
                <li>Company workspace use</li>
                <li>Billing, refunds, and Paystack processing</li>
                <li>AI features, sync, and service limits</li>
              </ul>
            </div>

            <div className="sidebar-card muted">
              <span className="sidebar-label">Publishing note</span>
              <p>
                Review these legal pages with your lawyer before public release, especially for
                final billing, refund, tax, company identity, and contact details.
              </p>
            </div>
          </aside>
        </section>
      </main>

      <style jsx="true">{`
        .legal-shell {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at top left, rgba(37, 99, 235, 0.09), transparent 30%),
            radial-gradient(circle at 88% 16%, rgba(217, 119, 6, 0.08), transparent 22%),
            linear-gradient(180deg, #ffffff 0%, #f8fafc 54%, #f1f5f9 100%);
          color: var(--primary-900);
          font-family: var(--font-main);
        }

        .legal-atmosphere {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 18% 24%, rgba(96, 165, 250, 0.16), transparent 18%),
            radial-gradient(circle at 82% 74%, rgba(251, 191, 36, 0.1), transparent 18%);
          pointer-events: none;
        }

        .legal-grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(203, 213, 225, 0.35) 1px, transparent 1px),
            linear-gradient(90deg, rgba(203, 213, 225, 0.35) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.45), transparent 92%);
          pointer-events: none;
        }

        .legal-nav,
        .legal-main {
          position: relative;
          z-index: 2;
          width: min(1220px, calc(100% - 2rem));
          margin: 0 auto;
        }

        .legal-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.4rem 0 1rem;
        }

        .brand-mark {
          display: inline-flex;
          align-items: center;
          gap: 0.9rem;
          border: none;
          background: transparent;
          color: inherit;
          cursor: pointer;
          padding: 0;
          text-align: left;
        }

        .brand-icon {
          width: 42px;
          height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: linear-gradient(135deg, #0f172a, #1e293b);
          color: #f8fafc;
          box-shadow: 0 16px 36px rgba(15, 23, 42, 0.18);
        }

        .brand-copy {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }

        .brand-copy strong {
          font-size: 1rem;
          line-height: 1.1;
        }

        .brand-copy small {
          color: var(--muted);
          font-size: 0.78rem;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .nav-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(255, 255, 255, 0.84);
          color: var(--primary-900);
          padding: 0.78rem 1.08rem;
          font-size: 0.92rem;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 18px 36px rgba(15, 23, 42, 0.06);
        }

        .legal-main {
          padding-bottom: 4rem;
        }

        .legal-hero {
          padding: 2rem 0 1.5rem;
        }

        .section-kicker {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.45rem 0.78rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(148, 163, 184, 0.22);
          color: #0f172a;
          font-size: 0.82rem;
          font-weight: 700;
          margin-bottom: 1rem;
          box-shadow: 0 16px 34px rgba(148, 163, 184, 0.16);
        }

        .legal-hero h1 {
          margin: 0;
          font-size: clamp(2.5rem, 5vw, 4.1rem);
          line-height: 0.96;
          max-width: 900px;
          letter-spacing: -0.04em;
        }

        .legal-hero h1 span {
          display: block;
          color: #475569;
          margin-top: 0.35rem;
        }

        .legal-subtitle {
          max-width: 760px;
          font-size: 1.05rem;
          line-height: 1.8;
          color: #475569;
          margin: 1.2rem 0 0;
        }

        .legal-meta-strip {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.9rem;
          margin-top: 1.6rem;
        }

        .legal-meta-strip span {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.9rem 1rem;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(148, 163, 184, 0.16);
          color: #334155;
          box-shadow: 0 18px 44px rgba(148, 163, 184, 0.14);
        }

        .legal-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 1.35rem;
          align-items: start;
        }

        .legal-primary {
          display: grid;
          gap: 1rem;
        }

        .legal-section-card,
        .sidebar-card {
          border-radius: 28px;
          padding: 1.4rem 1.45rem;
          background: rgba(255, 255, 255, 0.86);
          border: 1px solid rgba(148, 163, 184, 0.16);
          box-shadow: 0 24px 52px rgba(148, 163, 184, 0.14);
          backdrop-filter: blur(10px);
        }

        .legal-section-card h3,
        .sidebar-card h2 {
          margin: 0 0 0.9rem;
          font-size: 1.08rem;
          color: #0f172a;
        }

        .legal-section-card p,
        .sidebar-card p,
        .sidebar-card li {
          margin: 0;
          color: #475569;
          line-height: 1.75;
          font-size: 0.98rem;
        }

        .legal-section-card p + p {
          margin-top: 0.75rem;
        }

        .legal-sidebar {
          display: grid;
          gap: 1rem;
          position: sticky;
          top: 1rem;
        }

        .sidebar-label {
          display: inline-flex;
          font-size: 0.77rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #1d4ed8;
          margin-bottom: 0.85rem;
        }

        .sidebar-card ul {
          margin: 0;
          padding-left: 1rem;
          display: grid;
          gap: 0.7rem;
        }

        .sidebar-card.muted {
          background: rgba(248, 250, 252, 0.92);
        }

        @media (max-width: 980px) {
          .legal-grid {
            grid-template-columns: 1fr;
          }

          .legal-sidebar {
            position: static;
          }
        }

        @media (max-width: 720px) {
          .legal-nav {
            padding: 1rem 0 0.6rem;
            gap: 0.9rem;
            flex-direction: column;
            align-items: stretch;
          }

          .nav-actions {
            justify-content: flex-start;
          }

          .legal-hero {
            padding-top: 1.2rem;
          }

          .legal-meta-strip {
            grid-template-columns: 1fr;
          }

          .legal-section-card,
          .sidebar-card {
            border-radius: 22px;
            padding: 1.15rem 1.05rem;
          }

          .legal-shell {
            padding-bottom: 4rem;
          }
        }
      `}</style>
    </div>
  );
};

export default LegalPage;
