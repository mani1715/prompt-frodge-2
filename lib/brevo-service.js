// Using Brevo REST API directly instead of SDK to avoid module resolution issues
export async function sendBrevoEmail(params) {
  const apiKey = process.env.BREVO_API_KEY;
  
  if (!apiKey) {
    throw new Error('BREVO_API_KEY environment variable is not defined');
  }

  const sender = params.from || {
    email: process.env.BREVO_SENDER_EMAIL || 'noreply@promptfordge.com',
    name: process.env.BREVO_SENDER_NAME || 'Prompt Forge',
  };

  const payload = {
    sender: sender,
    to: params.to,
    subject: params.subject,
    htmlContent: params.htmlContent,
    textContent: params.textContent || params.htmlContent,
  };

  if (params.replyTo) {
    payload.replyTo = params.replyTo;
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Brevo API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return {
      success: true,
      messageId: data.messageId,
    };
  } catch (error) {
    console.error('Brevo API error:', error);
    throw error;
  }
}
