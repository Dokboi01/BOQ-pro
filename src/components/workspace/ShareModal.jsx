import React, { useState } from 'react';
import { 
  Share2, X, MessageCircle, Copy, Smartphone, CheckCircle2, Mail as MailIcon 
} from 'lucide-react';
import { useToast } from '../ui/ToastContext';
import { sendReportEmail, shareViaWhatsApp, shareViaNative, copyShareTextToClipboard } from '../../utils/emailService';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const ShareModal = ({ isOpen, onClose, projectInfo, boqData, calculateGrandTotal }) => {
  const toast = useToast();
  const [emailConfig, setEmailConfig] = useState({ recipient: '', includePDF: true, includeExcel: false });
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleWhatsAppShare = () => {
    shareViaWhatsApp(projectInfo, boqData);
    toast.success('Opening WhatsApp...');
  };

  const handleNativeShare = async () => {
    const result = await shareViaNative(projectInfo, boqData);
    if (result.success) {
      toast.success('Shared successfully!');
    } else if (result.error !== 'Share cancelled') {
      toast.warning(result.error || 'Sharing not available on this device.');
    }
  };

  const handleCopySummary = async () => {
    const result = await copyShareTextToClipboard(projectInfo, boqData);
    if (result.success) {
      toast.success('Project summary copied to clipboard!');
    }
  };

  const handleEmailReport = async () => {
    setIsSending(true);
    try {
      const attachments = [];

      if (emailConfig.includePDF) {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text('BILL OF QUANTITIES', 105, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Project: ${projectInfo.title}`, 14, 25);
        doc.text(`Client: ${projectInfo.client}`, 14, 30);
        doc.text(`Date: ${projectInfo.date}`, 14, 35);

        const tableData = [];
        boqData.forEach(section => {
          tableData.push([{ content: section.title, colSpan: 6, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);
          section.items.forEach((item, idx) => {
            tableData.push([
              idx + 1,
              item.description,
              item.unit,
              item.qty.toLocaleString(),
              (item.useBenchmark ? item.benchmark : item.rate).toLocaleString(),
              item.total.toLocaleString()
            ]);
          });
        });

        tableData.push([{ content: 'GRAND TOTAL', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } }, { content: `₦${calculateGrandTotal().toLocaleString()}`, styles: { fontStyle: 'bold' } }]);

        doc.autoTable({
          startY: 40,
          head: [['Item', 'Description', 'Unit', 'Qty', 'Rate', 'Total']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold' },
          columnStyles: { 0: { cellWidth: 15 }, 5: { fontStyle: 'bold', halign: 'right' } },
          styles: { fontSize: 8 }
        });

        const pdfBase64 = doc.output('datauristring').split(',')[1];
        attachments.push({
          filename: `${projectInfo.title}_BOQ.pdf`,
          content: pdfBase64
        });
      }

      if (emailConfig.includeExcel) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('BOQ Report');
        worksheet.addRow(['Description', 'Unit', 'Qty', 'Rate', 'Total']).font = { bold: true };
        boqData.forEach(s => {
          worksheet.addRow([s.title]).font = { bold: true };
          s.items.forEach(i => worksheet.addRow([i.description, i.unit, i.qty, i.rate, i.total]));
        });
        const buffer = await workbook.xlsx.writeBuffer();
        const excelBase64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
        attachments.push({
          filename: `${projectInfo.title}_BOQ.xlsx`,
          content: excelBase64
        });
      }

      const result = await sendReportEmail(emailConfig.recipient, {
        name: projectInfo.title,
        totalValue: calculateGrandTotal()
      }, attachments);

      if (result.success) {
        toast.success(`Report emailed to ${emailConfig.recipient}`);
        onClose();
        setEmailConfig({ recipient: '', includePDF: true, includeExcel: false });
      } else {
        toast.error(result.error || 'Failed to send email.');
      }
    } catch (error) {
      console.error('Email error:', error);
      toast.error('An error occurred while preparing the email.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content share-modal view-fade-in">
        <div className="share-modal-header">
          <div className="share-title-row">
            <Share2 size={20} className="text-accent" />
            <div>
              <h3>Share & Send</h3>
              <p className="share-subtitle">Send reports or share project summaries</p>
            </div>
          </div>
          <button className="share-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Quick Share Actions */}
        <div className="share-quick-actions">
          <button className="share-action-card" onClick={handleWhatsAppShare}>
            <div className="share-action-icon whatsapp-icon">
              <MessageCircle size={20} />
            </div>
            <span>WhatsApp</span>
          </button>
          <button className="share-action-card" onClick={handleCopySummary}>
            <div className="share-action-icon copy-icon">
              <Copy size={20} />
            </div>
            <span>Copy Summary</span>
          </button>
          {navigator.share && (
            <button className="share-action-card" onClick={handleNativeShare}>
              <div className="share-action-icon native-icon">
                <Smartphone size={20} />
              </div>
              <span>Share</span>
            </button>
          )}
        </div>

        <div className="share-divider">
          <span>or send via email</span>
        </div>

        {/* Email Form */}
        <div className="share-email-form">
          <div className="form-group">
            <label>Recipient Email</label>
            <input
              type="email"
              placeholder="client@company.com"
              className="modal-input"
              value={emailConfig.recipient}
              onChange={(e) => setEmailConfig({ ...emailConfig, recipient: e.target.value })}
            />
          </div>

          <div className="attachment-options">
            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={emailConfig.includePDF}
                onChange={(e) => setEmailConfig({ ...emailConfig, includePDF: e.target.checked })}
              />
              <span>Attach PDF Report</span>
            </label>
            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={emailConfig.includeExcel}
                onChange={(e) => setEmailConfig({ ...emailConfig, includeExcel: e.target.checked })}
              />
              <span>Attach Excel Workbook</span>
            </label>
          </div>

          <div className="modal-info-box">
            <CheckCircle2 size={14} className="text-success" />
            <span>Professional BOQ report with your consultant branding.</span>
          </div>
        </div>

        <div className="share-modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary-glow"
            onClick={handleEmailReport}
            disabled={isSending || !emailConfig.recipient}
          >
            <MailIcon size={15} />
            {isSending ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
