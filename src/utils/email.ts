import nodemailer from "nodemailer";

export const sendMail = async (email: string, otp: number) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MY_GMAIL,
        pass: process.env.MY_GOOGLE_APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"No Reply" <${process.env.MY_GMAIL}>`,
      to: email,
      subject: "Your OTP Code",
      html: `
  <div style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 20px;">
    <div style="max-width: 500px; margin: auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 30px;">
      
      <h2 style="text-align: center; color: #2563eb; margin-bottom: 20px;">🔐 Verify Your Identity</h2>
      
      <p style="font-size: 16px; color: #374151; text-align: center;">
        Use the following one-time password (OTP) to complete your sign-in process. 
        This code is valid for <strong>10 minutes</strong>.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <span style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 24px; font-weight: bold; letter-spacing: 3px; padding: 15px 30px; border-radius: 8px;">
          ${otp}
        </span>
      </div>
      
      <p style="font-size: 14px; color: #6b7280; text-align: center;">
        If you didn’t request this code, you can safely ignore this email.
      </p>
      
    </div>
    <p style="text-align: center; font-size: 12px; color: #9ca3af; margin-top: 15px;">
      © ${new Date().getFullYear()} Your Company. All rights reserved.
    </p>
  </div>
  `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Error sending email:", err);
      return { success: false, error: err.message };
    }
  }
};
