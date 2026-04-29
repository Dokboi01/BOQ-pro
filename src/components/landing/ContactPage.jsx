import React, { useState } from 'react';
import {
  Mail, Phone, MapPin, Clock, Send, CheckCircle2,
  ArrowRight, MessageSquare, Building2, User, Mail as MailIcon
} from 'lucide-react';

const offices = [
  {
    city: 'Lagos',
    address: '12B Adeola Odeku Street, Victoria Island',
    phone: '+234 800 123 4567',
    hours: 'Mon – Fri, 8am – 6pm WAT',
  },
  {
    city: 'Abuja',
    address: '45 Constitution Avenue, Central Business District',
    phone: '+234 800 987 6543',
    hours: 'Mon – Fri, 8am – 6pm WAT',
  },
  {
    city: 'Port Harcourt',
    address: '22 Aba Road, Trans Amadi',
    phone: '+234 800 456 7890',
    hours: 'Mon – Fri, 8am – 5pm WAT',
  },
];

const faqs = [
  {
    q: 'How quickly can I get started?',
    a: 'Most teams are pricing their first project within 10 minutes of signing up. The onboarding wizard walks you through creating your first BOQ.',
  },
  {
    q: 'Is my data secure?',
    a: 'Absolutely. We use Firebase for authentication and Firestore for encrypted cloud storage. All payments are processed securely via Paystack with 256-bit SSL.',
  },
  {
    q: 'Can I export to Excel and PDF?',
    a: 'Yes — both formats are supported. PDF exports are professionally formatted for tender submission, and Excel exports retain formulas for further analysis.',
  },
  {
    q: 'Do you offer training for teams?',
    a: 'We offer onboarding sessions for Business and Corporate plans. Enterprise clients get dedicated account management and custom training.',
  },
];

const ContactPage = ({ onGetStarted }) => {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <div className="contact-page">
      {/* Hero */}
      <section className="cp-hero">
        <div className="cp-hero-content">
          <span className="cp-kicker">Contact</span>
          <h1>Let\'s talk about your next project.</h1>
          <p>
            Whether you\'re a solo QS or a full construction firm, we\'re here to help you
            price better, faster, and more accurately.
          </p>
        </div>
      </section>

      <div className="cp-grid">
        {/* Contact Form */}
        <section className="cp-form-section">
          <h2>Send us a message</h2>
          {submitted ? (
            <div className="cp-success">
              <CheckCircle2 size={40} className="cp-success-icon" />
              <h3>Message sent!</h3>
              <p>We\'ll get back to you within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="cp-form">
              <div className="cp-field">
                <label><User size={14} /> Full name</label>
                <input
                  type="text"
                  required
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="cp-field">
                <label><MailIcon size={14} /> Email address</label>
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="cp-field">
                <label><Building2 size={14} /> Company (optional)</label>
                <input
                  type="text"
                  placeholder="Your firm name"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </div>
              <div className="cp-field">
                <label><MessageSquare size={14} /> Message</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Tell us about your project or question..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>
              <button type="submit" className="cp-submit">
                <Send size={16} /> Send message
              </button>
            </form>
          )}
        </section>

        {/* Office Cards */}
        <section className="cp-offices">
          <h2>Our offices</h2>
          <div className="cp-office-list">
            {offices.map((office) => (
              <div key={office.city} className="cp-office-card">
                <div className="cp-office-header">
                  <MapPin size={18} />
                  <strong>{office.city}</strong>
                </div>
                <div className="cp-office-detail">
                  <Building2 size={14} />
                  <span>{office.address}</span>
                </div>
                <div className="cp-office-detail">
                  <Phone size={14} />
                  <span>{office.phone}</span>
                </div>
                <div className="cp-office-detail">
                  <Clock size={14} />
                  <span>{office.hours}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="cp-direct">
            <h3>Direct contact</h3>
            <div className="cp-direct-row">
              <Mail size={14} />
              <span>hello@boqpro.ng</span>
            </div>
            <div className="cp-direct-row">
              <Phone size={14} />
              <span>+234 800 BOQ PRO</span>
            </div>
          </div>
        </section>
      </div>

      {/* FAQs */}
      <section className="cp-faq">
        <div className="cp-section-heading">
          <h2>Frequently asked questions</h2>
          <p>Quick answers to common questions. For anything else, reach out above.</p>
        </div>
        <div className="cp-faq-grid">
          {faqs.map((faq) => (
            <div key={faq.q} className="cp-faq-card">
              <h4>{faq.q}</h4>
              <p>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cp-cta">
        <h2>Ready to start pricing?</h2>
        <p>Create a free account and see how BOQ Pro fits your workflow.</p>
        <button className="cp-btn-primary" onClick={onGetStarted}>
          Start free <ArrowRight size={18} />
        </button>
      </section>

      <style jsx="true">{`
        .contact-page { position: relative; }

        .cp-hero {
          text-align: center;
          padding: 2rem 1rem 2rem;
          max-width: 640px;
          margin: 0 auto;
        }

        .cp-kicker {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.45rem 0.85rem;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.14);
          color: var(--accent-600);
          margin-bottom: 1rem;
        }

        .cp-hero h1 {
          margin: 0 0 0.8rem;
          font-size: clamp(1.8rem, 4vw, 2.8rem);
          line-height: 1.1;
          letter-spacing: -0.03em;
          color: var(--primary-950);
        }

        .cp-hero p {
          color: var(--primary-600);
          font-size: 1rem;
          line-height: 1.7;
          margin: 0;
        }

        .cp-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
          gap: 2.5rem;
          margin: 2rem 0;
        }

        .cp-form-section h2,
        .cp-offices h2 {
          margin: 0 0 1.2rem;
          font-size: 1.2rem;
          color: var(--primary-950);
        }

        .cp-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .cp-field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .cp-field label {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--primary-700);
        }

        .cp-field input,
        .cp-field textarea {
          padding: 0.8rem 1rem;
          border-radius: 12px;
          border: 1px solid var(--border-light);
          background: white;
          font-family: inherit;
          font-size: 0.9rem;
          color: var(--primary-900);
          transition: all 0.2s ease;
          outline: none;
        }

        .cp-field input:focus,
        .cp-field textarea:focus {
          border-color: var(--accent-400);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .cp-field input::placeholder,
        .cp-field textarea::placeholder {
          color: var(--primary-300);
        }

        .cp-submit {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.9rem 1.4rem;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, var(--accent-600), var(--teal-600));
          color: white;
          font-size: 0.95rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 10px 24px rgba(16, 185, 129, 0.18);
          font-family: inherit;
          margin-top: 0.5rem;
        }

        .cp-submit:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 32px rgba(16, 185, 129, 0.24);
        }

        .cp-success {
          text-align: center;
          padding: 2.5rem 1rem;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.03));
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .cp-success-icon {
          color: var(--accent-600);
          margin-bottom: 0.8rem;
        }

        .cp-success h3 { margin: 0 0 0.3rem; font-size: 1.2rem; color: var(--primary-950); }
        .cp-success p { margin: 0; color: var(--primary-600); font-size: 0.9rem; }

        .cp-office-list {
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
        }

        .cp-office-card {
          padding: 1.2rem;
          border-radius: 18px;
          background: white;
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-sm);
        }

        .cp-office-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.7rem;
        }

        .cp-office-header svg { color: var(--accent-600); }
        .cp-office-header strong { font-size: 1rem; color: var(--primary-950); }

        .cp-office-detail {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.35rem 0;
          color: var(--primary-600);
          font-size: 0.84rem;
          line-height: 1.5;
        }

        .cp-office-detail svg {
          color: var(--primary-400);
          flex-shrink: 0;
          margin-top: 0.15rem;
        }

        .cp-direct {
          margin-top: 1.5rem;
          padding: 1.2rem;
          border-radius: 18px;
          background: var(--primary-50);
          border: 1px solid var(--border-light);
        }

        .cp-direct h3 { margin: 0 0 0.6rem; font-size: 0.95rem; color: var(--primary-950); }

        .cp-direct-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.35rem 0;
          color: var(--primary-700);
          font-size: 0.86rem;
        }

        .cp-direct-row svg { color: var(--accent-600); flex-shrink: 0; }

        .cp-faq { margin: 3rem 0; }

        .cp-section-heading {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .cp-section-heading h2 {
          margin: 0 0 0.4rem;
          font-size: clamp(1.3rem, 3vw, 1.7rem);
          color: var(--primary-950);
        }

        .cp-section-heading p {
          color: var(--primary-600);
          font-size: 0.9rem;
          margin: 0;
        }

        .cp-faq-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }

        .cp-faq-card {
          padding: 1.4rem;
          border-radius: 18px;
          background: white;
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-sm);
        }

        .cp-faq-card h4 { margin: 0 0 0.5rem; font-size: 0.95rem; color: var(--primary-950); }
        .cp-faq-card p { margin: 0; color: var(--primary-600); font-size: 0.85rem; line-height: 1.6; }

        .cp-cta {
          text-align: center;
          margin-top: 3rem;
          padding: 2.5rem;
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(255,255,255,0.96));
          color: var(--primary-950);
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-lg);
        }

        .cp-cta h2 { margin: 0 0 0.5rem; font-size: clamp(1.3rem, 3vw, 1.8rem); color: var(--primary-950); }
        .cp-cta p { color: var(--primary-600); margin: 0 0 1.2rem; font-size: 0.95rem; }

        .cp-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.95rem 1.4rem;
          border-radius: 16px;
          border: none;
          background: var(--accent-600);
          color: white;
          font-size: 0.95rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 14px 28px rgba(16, 185, 129, 0.22);
          font-family: inherit;
        }

        .cp-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 36px rgba(16, 185, 129, 0.3);
          background: var(--emerald-500);
        }

        @media (max-width: 900px) {
          .cp-grid { grid-template-columns: 1fr; }
          .cp-faq-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default ContactPage;
