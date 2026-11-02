require("dotenv").config();

const sendEmail = require("./services/emailService");

async function testEmail() {
    try {
        await sendEmail({
            to: process.env.EMAIL_USER,
            subject: "Software Company - Test Email",
            text: "Email service is working successfully!",
            html: "<h2>Email service is working successfully!</h2><p>Welcome to Software Company.</p>",
        });

        console.log("Email sent successfully!");
    } catch (error) {
        console.error("Email error:", error.message);
    }
}

testEmail();