export function shouldOptimizeImage(src?: string | null): boolean {
  if (!src) return false;
  if (src.toLowerCase().split("?")[0]?.endsWith(".svg")) return false;
  if (src.startsWith("/")) return true;

  try {
    const host = new URL(src).hostname.toLowerCase();
    return (
      host === "images.unsplash.com" ||
      host === "img1.wsimg.com" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".supabase.co")
    );
  } catch {
    return false;
  }
}
