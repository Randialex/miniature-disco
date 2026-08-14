const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export function getSupabaseConfig(): { url: string; publishableKey: string } {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Supabase 尚未配置：请设置 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  return { url: supabaseUrl, publishableKey: supabasePublishableKey };
}
