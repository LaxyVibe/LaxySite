function parseBody(event) {
  const contentType = (event.headers['content-type'] || event.headers['Content-Type'] || '').toLowerCase();

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(event.body || '{}');
    } catch (error) {
      return {};
    }
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(event.body || '');
    return Object.fromEntries(params.entries());
  }

  return {};
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST' },
      body: 'Method Not Allowed'
    };
  }

  const formData = parseBody(event);
  const name = (formData.name || '').trim();
  const email = (formData.email || formData.Email || '').trim();
  const subject = (formData.subject || formData.Subject || 'Website contact form').trim();
  const message = (formData.message || formData.Message || '').trim();

  if (!name || !email || !message) {
    return {
      statusCode: 400,
      body: JSON.stringify({ ok: false, error: 'Missing required fields.' })
    };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: 'Email service not configured.' })
    };
  }

  const fromAddress = process.env.MAIL_FROM || 'no-reply@laxy.travel';
  const recipient = 'harold@laxy.travel';
  const payload = {
    from: fromAddress,
    to: [recipient],
    reply_to: email,
    subject: `Contact Form: ${subject}`,
    text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`
  };

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('Resend request failed');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: 'Failed to send email.' })
    };
  }
};
