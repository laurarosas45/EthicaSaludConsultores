// routes/contacto.routes.js
import { Router } from "express";
import nodemailer from "nodemailer";

const router = Router();

router.post("/", async (req, res) => {
  const { nombre, email, empresa, tel, tema, ciudad, mensaje } = req.body || {};

  if (!nombre || !email || !mensaje) {
    return res.status(400).json({ ok: false, error: "Campos requeridos faltantes" });
  }

  try {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      return res.status(500).json({
        ok: false,
        error: "SMTP_INVALID_CONFIG",
        details: "Faltan SMTP_HOST/SMTP_USER/SMTP_PASS en .env",
      });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,             // 465 = TLS implícito
      auth: { user, pass },
      // Descomenta si tu proveedor usa TLS con certificados auto-firmados
      // tls: { rejectUnauthorized: false },
    });

    // Verifica conectividad/credenciales antes de enviar
    try {
      await transporter.verify();
    } catch (e) {
      console.error("[SMTP verify] ", e);
      return res.status(500).json({
        ok: false,
        error: "SMTP_VERIFY_FAILED",
        details: e?.message || String(e),
      });
    }

    const toEmail =
      process.env.MAIL_TO || "consultoria@ethicasaludconsultores.com";

    const mailOptions = {
      from:
        process.env.MAIL_FROM ||
        `"EthicaSalud Web" <${user}>`,
      to: toEmail,
      subject: `Nuevo mensaje de contacto: ${nombre}`,
      html: `
        <h2>Nuevo mensaje desde el formulario de contacto</h2>
        <p><b>Nombre:</b> ${nombre}</p>
        <p><b>Correo:</b> ${email}</p>
        <p><b>Teléfono:</b> ${tel || "No proporcionado"}</p>
        <p><b>Empresa:</b> ${empresa || "No proporcionado"}</p>
        <p><b>Tema:</b> ${tema || "No especificado"}</p>
        <p><b>Ciudad:</b> ${ciudad || "No especificada"}</p>
        <hr/>
        <p><b>Mensaje:</b></p>
        <p>${(mensaje || "").replace(/\n/g, "<br/>")}</p>
      `,
      replyTo: email,
    };

    await transporter.sendMail(mailOptions);
    return res.json({ ok: true });
  } catch (err) {
    console.error("[CONTACTO sendMail]", err);
    return res.status(500).json({
      ok: false,
      error: "MAIL_SEND_FAILED",
      details: err?.message || String(err),
    });
  }
});

export default router;
