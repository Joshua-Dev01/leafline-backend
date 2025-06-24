import { Resend } from "resend";

const resend = new Resend(
  process.env.RESEND_API_KEY || "re_U6ABqfPz_CgNhP97QWURJ7m9mcaggsfN4"
);

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const result = await resend.emails.send({
      from: "onboarding@resend.dev", // default sender works out of the box
      to,
      subject,
      html,
    });

    console.log("✅ Resend email result:", result);
  } catch (error) {
    console.error("❌ Resend email failed:", error);
  }
};
