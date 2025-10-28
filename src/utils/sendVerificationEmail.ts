import nodemailer from "nodemailer";

export const sendVerificationEmail = async (to: string, subject: string, html: string) => {
    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    await transporter.sendMail({
        from: `"LeafLine" <no-reply@leaflineapp.com>`,
        to,
        subject,
        html,
    });
};
