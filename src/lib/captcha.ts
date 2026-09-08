import crypto from "crypto";

const CAPTCHA_SECRET =
  process.env.CAPTCHA_SECRET || "efrendrums-captcha-secret-key-2026";
const CHARACTERS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export interface CaptchaData {
  svg: string;
  token: string;
}

export function generateCaptcha(): CaptchaData {
  // Generate 5 random characters
  let text = "";
  for (let i = 0; i < 5; i++) {
    const randomIndex = Math.floor(Math.random() * CHARACTERS.length);
    text += CHARACTERS[randomIndex];
  }

  const width = 200;
  const height = 70;

  // Generate SVG paths for background noise
  let noiseLines = "";
  for (let i = 0; i < 4; i++) {
    const x1 = Math.floor(Math.random() * width);
    const y1 = Math.floor(Math.random() * height);
    const x2 = Math.floor(Math.random() * width);
    const y2 = Math.floor(Math.random() * height);
    const cx = Math.floor(Math.random() * width);
    const cy = Math.floor(Math.random() * height);
    const stroke = ["#ff4d4d", "#f59e0b", "#60a5fa", "#34d399"][i % 4];
    noiseLines += `<path d="M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}" stroke="${stroke}" stroke-width="1.5" fill="none" opacity="0.4"/>`;
  }

  let noiseDots = "";
  for (let i = 0; i < 30; i++) {
    const cx = Math.floor(Math.random() * width);
    const cy = Math.floor(Math.random() * height);
    const r = Math.random() * 2 + 1;
    noiseDots += `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="#ffffff" opacity="0.25"/>`;
  }

  // Generate characters with random rotation, color and font size
  let textElements = "";
  const charColors = ["#ffffff", "#ff6b6b", "#feca57", "#48dbfb", "#1dd1a1", "#ff9ff3"];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const x = 25 + i * 32 + (Math.random() * 6 - 3);
    const y = 46 + (Math.random() * 8 - 4);
    const angle = Math.floor(Math.random() * 40 - 20);
    const color = charColors[Math.floor(Math.random() * charColors.length)];
    const fontSize = Math.floor(Math.random() * 6 + 28);

    textElements += `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${color}" transform="rotate(${angle}, ${x}, ${y})">${char}</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#161616" rx="8" />
    ${noiseLines}
    ${noiseDots}
    ${textElements}
  </svg>`;

  // Token valid for 5 minutes
  const expiresAt = Date.now() + 5 * 60 * 1000;
  const signature = crypto
    .createHmac("sha256", CAPTCHA_SECRET)
    .update(`${text.toUpperCase()}:${expiresAt}`)
    .digest("hex");

  const token = `${expiresAt}.${signature}`;

  return { svg, token };
}

export function verifyCaptcha(input: string, token: string): boolean {
  if (!input || !token) return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [expiresAtStr, signature] = parts;
  const expiresAt = parseInt(expiresAtStr, 10);

  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return false; // Expired
  }

  const expectedSignature = crypto
    .createHmac("sha256", CAPTCHA_SECRET)
    .update(`${input.trim().toUpperCase()}:${expiresAt}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch {
    return false;
  }
}
