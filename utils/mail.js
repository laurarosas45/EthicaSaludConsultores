// utils/mail.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // true si usas 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendContactMail(payload) {
  const {
    nombre, email, empresa, tel, tema, ciudad, mensaje, origen = 'Sitio web',
  } = payload;

  const subject = `Nuevo contacto: ${nombre} — ${tema || 'Sin tema'}`;
  const text =
`Nombre: ${nombre}
Email: ${email}
Empresa: ${empresa || '-'}
Tel: ${tel || '-'}
Tema: ${tema || '-'}
Ciudad: ${ciudad || '-'}
Origen: ${origen}

Mensaje:
${mensaje}`;

  const html =
`<h2>Nuevo contacto recibido</h2>
<ul>
  <li><b>Nombre:</b> ${nombre}</li>
  <li><b>Email:</b> ${email}</li>
  <li><b>Empresa:</b> ${empresa || '-'}</li>
  <li><b>Tel:</b> ${tel || '-'}</li>
  <li><b>Tema:</b> ${tema || '-'}</li>
  <li><b>Ciudad:</b> ${ciudad || '-'}</li>
  <li><b>Origen:</b> ${origen}</li>
</ul>
<pre style="white-space:pre-wrap;font-family:inherit">${mensaje}</pre>`;

  return transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: process.env.MAIL_TO, // 👈 destino final
    replyTo: email,          // para poder responder directo al remitente
    subject,
    text,
    html,
  });
}

module.exports = { transporter, sendContactMail };
