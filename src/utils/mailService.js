/**
 * Mail Service Layer
 * 
 * Replace the stub logic here with your actual email provider (Resend, SendGrid, etc.)
 */

export const sendVerificationEmail = async (email, code) => {
    console.log(`[MAIL SERVICE] Sending verification code ${code} to ${email}`);

    /**
     * EXAMPLE: Using Resend (uncomment to use)
     * 
     * const response = await fetch('https://api.resend.com/emails', {
     *   method: 'POST',
     *   headers: {
     *     'Content-Type': 'application/json',
     *     'Authorization': 'Bearer YOUR_RESEND_API_KEY'
     *   },
     *   body: JSON.stringify({
     *     from: 'BOQ Pro <onboarding@boqpro.com>',
     *     to: [email],
     *     subject: 'Verify your BOQ Pro Account',
     *     html: `<p>Your verification code is: <strong>${code}</strong></p>`
     *   })
     * });
     * return response.ok;
     */

    // For now, we simulate a delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return true;
};
