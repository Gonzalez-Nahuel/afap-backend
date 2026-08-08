import { env } from "@/config/env";
import { Resend } from "resend";
import { logger } from "./logger";
import { AppError } from "./app-error";

const getResend = () => new Resend(env.RESEND_API_KEY);

export const sendEmail = async (email: string, otpCode: string) => {
  const resend = getResend();

  const { data, error } = await resend.emails.send({
    from: "no-reply@afap.com",
    to: email,
    subject: "Tu código de verificación",
    text: `Tu código de verificacióin de 6 dígitos es: ${otpCode}`,
    html: `
        <div style="font-family: sans-serif; padding: 20px;">
        <h2>Verifica tu cuenta</h2>
        <p>Introduce el siguiente código en la aplicación para activar tu cuenta:</p>
        <h1 style="background: #f3f4f6; display: inline-block; padding: 10px 20px; letter-spacing: 4px; border-radius: 5px;">
          ${otpCode}
        </h1>
        <p style="color: #666; font-size: 12px;">Este código expira en 15 minutos.</p>
      </div>
    `,
  });

  if (error) {
    logger.error({ err: error, email }, "Fallo en la API resend");

    throw new AppError(502, "No se pudo enviar el email, reenviar el código");
  }

  return data;
};
