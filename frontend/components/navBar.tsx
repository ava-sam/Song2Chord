"use client";

import Link from "next/link";
import { createClient } from "../lib/supabase/client";
import { useRouter } from "next/navigation";

export default function NavBar() {
  const router = useRouter();
  const supabase = createClient();

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <nav style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "16px 32px",
      backgroundColor: "#121212",
      borderBottom: "1px solid #4d4d4d",
      fontFamily: "system-ui, sans-serif",
    }}>
      <strong style={{ color: "#ffffff", fontSize: "18px", fontWeight: 700 }}>
        Song2Chord
      </strong>

      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <Link href="/search" style={navLinkStyle}>Search / Upload</Link>
        <Link href="/library" style={navLinkStyle}>My Library</Link>
        <Link href="/settings" style={navLinkStyle}>Settings</Link>
        <button onClick={signOut} style={signOutStyle}>
          Sign out
        </button>
      </div>
    </nav>
  );
}

const navLinkStyle: React.CSSProperties = {
  color: "#b3b3b3",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "1.4px",
  padding: "8px 16px",
  borderRadius: "9999px",
};

const signOutStyle: React.CSSProperties = {
  color: "#ffffff",
  backgroundColor: "transparent",
  border: "1px solid #7c7c7c",
  borderRadius: "9999px",
  padding: "8px 16px",
  fontSize: "14px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "1.4px",
  cursor: "pointer",
};
