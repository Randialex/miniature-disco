import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNext(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/home";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNext(request.nextUrl.searchParams.get("next"));

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  const fallback = new URL("/home", request.url);
  fallback.searchParams.set("cloud", "auth-error");
  return NextResponse.redirect(fallback);
}
