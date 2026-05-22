import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = new URL(request.url).searchParams.get("code");
  const redirectTo = NextResponse.redirect(new URL("/search", request.url));

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            redirectTo.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            redirectTo.cookies.set({ name, value: "", ...options });
          },
        },
      }
    );

    await supabase.auth.exchangeCodeForSession(code);
  }

  return redirectTo;
}
