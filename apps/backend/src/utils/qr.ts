import QRCode from "qrcode";
import { APP_URL } from "../envs";

export async function generateQRCodeDataURL(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 300,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

export function buildTableQRUrl(slug: string, tableNumber: number): string {
  return `${APP_URL}/order/${slug}/${tableNumber}`;
}
