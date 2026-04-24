const nodemailer = require("nodemailer");

const getSmtpHost = () => {
  if (process.env.SMTP_HOST) {
    return process.env.SMTP_HOST;
  }

  const user = String(process.env.SMTP_EMAIL_USER || "").toLowerCase();
  if (user.includes("@gmail.com")) {
    return "smtp.gmail.com";
  }

  return "email-smtp.us-east-1.amazonaws.com";
};

const getSmtpPort = () => {
  const port = Number(process.env.SMTP_PORT);
  if (Number.isFinite(port) && port > 0) {
    return port;
  }

  return 465;
};

const getSmtpSecure = () => {
  if (typeof process.env.SMTP_SECURE === "string") {
    return process.env.SMTP_SECURE === "true";
  }

  return getSmtpPort() === 465;
};

const createTransport = () =>
  nodemailer.createTransport({
    host: getSmtpHost(),
    port: getSmtpPort(),
    secure: getSmtpSecure(),
    auth: {
      user: process.env.SMTP_EMAIL_USER,
      pass: process.env.SMTP_EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

const sendEmail = async ({ subject, html, to, cc, from } = {}) => {
  const transport = createTransport();

  try {
    await transport.sendMail({
      from: from || process.env.SMTP_EMAIL_USER,
      to: to || process.env.ADMIN_EMAIL,
      cc,
      subject,
      html,
    });
    return true;
  } finally {
    transport.close();
  }
};

module.exports = { sendEmail };
