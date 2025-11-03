// utils/wa.js
const WA_NUMBER = process.env.WHATSAPP_NUMBER || "573054422385";
const WA_DEFAULT_TEXT = process.env.WHATSAPP_DEFAULT_TEXT || "Hola EthicaSalud, me gustaría asesoría";

export function buildWaUrl(text = WA_DEFAULT_TEXT) {
  const msg = encodeURIComponent(text || WA_DEFAULT_TEXT);
  return `https://wa.me/${WA_NUMBER}?text=${msg}`;
}

export function getWaNumber() {
  return WA_NUMBER;
}
