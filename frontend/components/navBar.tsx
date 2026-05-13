"use client";

import Link from "next/link"; // Next.js navigation links
import { createClient } from "../lib/supabase/client"; // supabase client for auth
import { useRouter } from "next/navigation"; // redirects after log out

export default function NavBar() {
    // for sign out and redirecting to home page
    const router = useRouter();
    const supabase = createClient();

    // sign out function that calls supabase auth and redirects to home page
    const signOut = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };
  return (
    // top navigation bar
    <nav style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "18px 40px",
      borderBottom: "1px solid #ddd",
      fontFamily: "system-ui, sans-serif"
    }}>
        // title
      <strong>Song2Chord</strong>

        // navigation links and sign out button
      <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
        <Link href="/search">Search / Upload</Link>
        <Link href="/library">My Library</Link>
        <Link href="/settings">Settings</Link>
        <button onClick={signOut}>Sign out</button>
      </div>
    </nav>
  );
}