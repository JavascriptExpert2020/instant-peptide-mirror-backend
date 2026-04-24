const { sendEmail } = require("../helpers/sendEmail");

const submitContactForm = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        message: "name, email, subject, and message are required.",
      });
    }

    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `Contact form: ${String(subject).trim()}`,
      html: `
        <h2>New contact form submission</h2>
        <p><strong>Name:</strong> ${String(name).trim()}</p>
        <p><strong>Email:</strong> ${String(email).trim()}</p>
        <p><strong>Subject:</strong> ${String(subject).trim()}</p>
        <p><strong>Message:</strong></p>
        <pre style="white-space:pre-wrap">${String(message).trim()}</pre>
      `,
    });

    return res.status(200).json({ message: "Message sent successfully." });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to send message.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  submitContactForm,
};
