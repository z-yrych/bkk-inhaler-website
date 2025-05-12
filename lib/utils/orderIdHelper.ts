// lib/utils/orderIdHelper.ts - Ensure it looks like this
export async function generateOrderId(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  // Use backticks ` here:
  return `${year}${month}${day}-${hours}${minutes}${seconds}-${randomPart}`;
}
