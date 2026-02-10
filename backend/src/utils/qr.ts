import QRCode from "qrcode";

export async function generateQRCodeDataURL(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 300,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

export function buildTableQRUrl(
  slug: string,
  tableNumber: number
): string {
  const appUrl = process.env.APP_URL || "http://localhost:8081";
  return `${appUrl}/order/${slug}/${tableNumber}`;
}
