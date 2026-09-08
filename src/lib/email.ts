import nodemailer from "nodemailer";

interface ClasePruebaData {
  nombre: string;
  email: string;
  whatsapp: string;
  nivel: string;
  objetivos?: string;
}

export async function sendClasePruebaEmails(data: ClasePruebaData) {
  const { nombre, email, whatsapp, nivel, objetivos } = data;

  const smtpUser = process.env.SMTP_USER || "efrendeveloper1@gmail.com";
  const smtpPass = process.env.SMTP_PASS;
  const adminEmail = process.env.ADMIN_EMAIL || "efrendeveloper1@gmail.com";
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT) || 465;

  if (!smtpPass) {
    console.warn(
      "⚠️ [Nodemailer] SMTP_PASS no está configurado en las variables de entorno (.env.local).\n" +
      "Simulación de envío:\n" +
      `Para: ${email}\n` +
      `Admin: ${adminEmail}\n` +
      `Datos: ${JSON.stringify(data, null, 2)}`
    );
    return {
      success: true,
      simulated: true,
      message: "Modo de simulación (SMTP_PASS no configurado)",
    };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  // Limpiar número de whatsapp para enlace directo
  const cleanPhone = whatsapp.replace(/\D/g, "");
  const whatsappLink = cleanPhone ? `https://wa.me/${cleanPhone}` : "";

  // 1. Correo para el alumno
  const studentHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #121212; color: #ffffff; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #1c1c1c; border-radius: 12px; overflow: hidden; border: 1px solid #2e2e2e; }
          .header { background: linear-gradient(135deg, #dc2626, #991b1b); padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; color: #ffffff; letter-spacing: 1px; }
          .header p { margin: 8px 0 0; color: #fecaca; font-size: 14px; }
          .content { padding: 30px 24px; }
          .message-box { background-color: #242424; border-left: 4px solid #ef4444; padding: 18px; border-radius: 6px; margin-bottom: 24px; font-size: 16px; line-height: 1.5; color: #f3f4f6; }
          .details { background-color: #181818; border-radius: 8px; padding: 18px; margin-bottom: 24px; }
          .detail-item { margin-bottom: 10px; font-size: 14px; }
          .detail-label { color: #9ca3af; }
          .detail-value { color: #ffffff; font-weight: 600; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #71717a; border-top: 1px solid #27272a; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🥁 Efrendrums Academia</h1>
            <p>Clase de Prueba Solicitada</p>
          </div>
          <div class="content">
            <p style="font-size: 17px; margin-top: 0;">¡Hola <strong>${nombre}</strong>!</p>
            
            <div class="message-box">
              Gracias por estar interesado en la clase de prueba en breve responderemos con la fecha para que te presentes en la clase de prueba.
            </div>

            <div class="details">
              <h3 style="margin-top: 0; margin-bottom: 14px; font-size: 15px; color: #f87171;">Resumen de tu solicitud:</h3>
              <div class="detail-item"><span class="detail-label">Nombre:</span> <span class="detail-value">${nombre}</span></div>
              <div class="detail-item"><span class="detail-label">Nivel de batería:</span> <span class="detail-value">${nivel}</span></div>
              <div class="detail-item"><span class="detail-label">WhatsApp:</span> <span class="detail-value">${whatsapp}</span></div>
              ${objetivos ? `<div class="detail-item"><span class="detail-label">Horario / Objetivos:</span> <span class="detail-value">${objetivos}</span></div>` : ""}
            </div>

            <p style="font-size: 14px; color: #a1a1aa; line-height: 1.5;">
              Nos pondremos en contacto contigo lo antes posible para confirmar el horario disponible. ¡Estamos listos para acompañarte en tu camino musical!
            </p>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} Efrendrums Academia de Batería. Todos los derechos reservados.
          </div>
        </div>
      </body>
    </html>
  `;

  // 2. Correo para el Administrador (efrendeveloper1@gmail.com)
  const adminHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #ffffff; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155; }
          .header { background: #dc2626; padding: 24px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 22px; color: #ffffff; }
          .content { padding: 24px; }
          .card { background-color: #0f172a; border-radius: 8px; padding: 20px; border: 1px solid #334155; }
          .row { margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #1e293b; }
          .row:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
          .label { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
          .value { font-size: 15px; color: #f8fafc; font-weight: 600; margin-top: 4px; }
          .btn-wa { display: inline-block; background-color: #22c55e; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: bold; font-size: 14px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔥 Nueva Solicitud de Clase de Prueba</h1>
          </div>
          <div class="content">
            <p style="margin-top: 0; color: #cbd5e1;">Un nuevo alumno ha solicitado su clase de prueba desde la página web:</p>
            
            <div class="card">
              <div class="row">
                <div class="label">Nombre del Alumno</div>
                <div class="value">${nombre}</div>
              </div>
              <div class="row">
                <div class="label">Correo Electrónico</div>
                <div class="value"><a href="mailto:${email}" style="color: #60a5fa; text-decoration: none;">${email}</a></div>
              </div>
              <div class="row">
                <div class="label">WhatsApp / Teléfono</div>
                <div class="value">${whatsapp}</div>
              </div>
              <div class="row">
                <div class="label">Nivel Declarado</div>
                <div class="value">${nivel}</div>
              </div>
              <div class="row">
                <div class="label">Horario Preferido y Objetivos</div>
                <div class="value" style="font-weight: normal; color: #e2e8f0; white-space: pre-wrap;">${objetivos || "No especificado"}</div>
              </div>
              <div class="row">
                <div class="label">Fecha y Hora</div>
                <div class="value" style="font-weight: normal; font-size: 13px; color: #94a3b8;">${new Date().toLocaleString("es-MX", { timeZone: "America/Hermosillo" })}</div>
              </div>
            </div>

            ${whatsappLink ? `
              <div style="text-align: center;">
                <a href="${whatsappLink}" class="btn-wa" target="_blank">
                  💬 Contactar por WhatsApp al ${whatsapp}
                </a>
              </div>
            ` : ""}
          </div>
        </div>
      </body>
    </html>
  `;

  // Enviar en paralelo a ambos
  await Promise.all([
    transporter.sendMail({
      from: `"Efrendrums Academia" <${smtpUser}>`,
      to: email,
      subject: "🥁 ¡Gracias por tu interés en la Clase de Prueba! - Efrendrums Academia",
      text: `Hola ${nombre},\n\nGracias por estar interesado en la clase de prueba en breve responderemos con la fecha para que te presentes en la clase de prueba.\n\nNivel: ${nivel}\nWhatsApp: ${whatsapp}\n\nEfrendrums Academia de Batería`,
      html: studentHtml,
    }),
    transporter.sendMail({
      from: `"Web Efrendrums" <${smtpUser}>`,
      to: adminEmail,
      replyTo: email,
      subject: `🥁 Nueva solicitud de Clase de Prueba: ${nombre}`,
      text: `Nueva solicitud de clase de prueba:\nNombre: ${nombre}\nCorreo: ${email}\nWhatsApp: ${whatsapp}\nNivel: ${nivel}\nObjetivos/Horario: ${objetivos || "Ninguno"}`,
      html: adminHtml,
    }),
  ]);

  return { success: true, simulated: false };
}
