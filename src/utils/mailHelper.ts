import nodemailer, { Transporter, SendMailOptions } from "nodemailer";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";

dotenv.config();


const createTransporter = (): Transporter => {
  return nodemailer.createTransport({
    debug: true,
    service: "gmail",
    auth: {
      user: process.env.MY_GMAIL as string,
      pass: process.env.MY_GOOGLE_APP_PASSWORD as string,
    },
  });
};

interface SendMailParams {
  to: string | string[];
  subject: string;
  template: string;
  templateData?: Record<string, any>;
  attachments?: SendMailOptions["attachments"];
}

const mySendMail = async ({
  to,
  subject,
  template,
  templateData = {},
  attachments = [],
}: SendMailParams) => {
  try {
    const transporter = createTransporter();

    const templatePath = path.join(__dirname, "../views", `${template}.ejs`);
    const html = await ejs.renderFile(templatePath, templateData);

    const mailOptions: SendMailOptions = {
      from: process.env.FROM_EMAIL as string,
      to,
      subject,
      html,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email. Please try again later.");
  }
};

export default mySendMail;
