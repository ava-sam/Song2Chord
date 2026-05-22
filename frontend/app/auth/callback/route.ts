import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectTo = NextResponse.redirect(new URL("/search", request.url));

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.headers.get("cookie")?.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1];
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
