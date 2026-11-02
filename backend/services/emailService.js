const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

async function sendEmail({ to, subject, text, html }) {
    return await transporter.sendMail({
        from: `"Software Company" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html,
    });
}

module.exports = sendEmail;