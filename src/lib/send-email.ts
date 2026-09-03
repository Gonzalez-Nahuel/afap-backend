import { env } from "@/config/env.js";
import { Resend } from "resend";
import { logger } from "./logger.js";
import { AppError } from "./app-error.js";

const getResend = () => new Resend(env.RESEND_API_KEY);

export const sendVerificationOtp = async (email: string, otpCode: string) => {
  const resend = getResend();

  const { data, error } = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: email,
    subject: "Tu código de verificación",
    text: `Tu código de verificación de 6 dígitos es: ${otpCode}`,
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

    throw new AppError(
      502,
      "EMAIL_SEND_ERROR",
      "No se pudo enviar el email, intenta de nuevo más tarde",
    );
  }

  return data;
};

export const sendResetPasswordLink = async (email: string, token: string) => {
  const resend = getResend();

  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}&email=${email}`;

  const { data, error } = await resend.emails.send({
    from: "AFAP <onboarding@resend.dev>",
    to: email,
    subject: "Restablecer contraseña - AFAP",
    text: `Solicitaste restablecer tu contraseña. Ingresa al siguiente enlace para continuar: ${resetLink}`,
    html: `
    <div style="font-family: sans-serif; padding: 20px; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2>Restablece tu contraseña</h2>
      <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en AFAP.</p>
      <p>Haz clic en el botón de abajo para continuar con el proceso:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
          Restablecer contraseña
        </a>
      </div>
      
      <p style="color: #666; font-size: 13px;">Si el botón no funciona, puedes copiar y pegar el siguiente enlace en tu navegador:</p>
      <p style="color: #2563eb; font-size: 12px; word-break: break-all;">${resetLink}</p>
      
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="color: #9ca3af; font-size: 12px;">Este enlace es de un solo uso y expirará en 15 minutos. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
    </div>
  `,
  });

  if (error) {
    logger.error({ err: error, email }, "Fallo en la API resend");

    throw new AppError(
      502,
      "EMAIL_SEND_ERROR",
      "No se pudo enviar el email, intenta de nuevo más tarde",
    );
  }

  return data;
};
