import { Resend } from 'resend';
import { getSetting } from '../db/database';

export const sendVerificationEmail = async (email, code) => {
    console.log(`[MAIL SERVICE] Attempting to send code ${code} to ${email}`);

    try {
        const apiKey = await getSetting('resend_api_key');

        if (!apiKey) {
            console.warn('[MAIL SERVICE] No Resend API key found in settings. Falling back to console log.');
            return true;
        }

        const resend = new Resend(apiKey);

        const { error } = await resend.emails.send({
            from: 'BOQ Pro <onboarding@boqpro.com>',
            to: [email],
            subject: 'Verify your BOQ Pro Account',
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #0f172a;">Verify your account</h2>
                    <p>Welcome to BOQ Pro. Use the code below to complete your registration:</p>
                    <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb; margin: 20px 0;">${code}</div>
                    <p style="font-size: 12px; color: #64748b;">If you didn't request this, please ignore this email.</p>
                </div>
            `
        });

        if (error) {
            console.error('[MAIL SERVICE] Resend error:', error);
            return false;
        }

        return true;
    } catch (err) {
        console.error('[MAIL SERVICE] Critical failure:', err);
        return false;
    }
};

export const sendReportEmail = async (email, projectData) => {
    try {
        const apiKey = await getSetting('resend_api_key');
        if (!apiKey) return false;

        const resend = new Resend(apiKey);

        const { error } = await resend.emails.send({
            from: 'BOQ Pro <reports@boqpro.com>',
            to: [email],
            subject: `Professional BOQ Report: ${projectData.name}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #0f172a;">Project Cost Report</h2>
                    <p>Please find the cost breakdown summary for <strong>${projectData.name}</strong> prepared via BOQ Pro.</p>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <div style="font-size: 14px; color: #64748b;">TOTAL CONTRACT SUM:</div>
                        <div style="font-size: 24px; font-weight: bold; color: #1e293b;">₦ ${projectData.totalValue.toLocaleString()}</div>
                    </div>
                    <p style="font-size: 14px; color: #334155;">The detailed Bill of Quantities breakdown is attached to your practitioner dashboard.</p>
                </div>
            `
        });

        return !error;
    } catch (err) {
        console.error('[MAIL SERVICE] Report send failed:', err);
        return false;
    }
};
