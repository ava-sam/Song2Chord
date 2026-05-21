"use client";

import { createClient } from "../lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000/auth/callback",
      },
    });
  };

  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#121212",
      fontFamily: "system-ui, sans-serif",
      padding: "24px",
    }}>
      <section style={{
        width: "100%",
        maxWidth: "440px",
        padding: "48px 40px",
        backgroundColor: "#181818",
        borderRadius: "8px",
        boxShadow: "rgba(0,0,0,0.5) 0px 8px 24px",
        textAlign: "center",
      }}>
        <h1 style={{
          color: "#ffffff",
          fontSize: "24px",
          fontWeight: 700,
          marginBottom: "12px",
        }}>
          Song2Chord
        </h1>

        <p style={{
          color: "#b3b3b3",
          fontSize: "16px",
          marginBottom: "32px",
          lineHeight: 1.5,
        }}>
          Sign in to upload audio and generate chord sheets.
        </p>

        <button
          onClick={signInWithGoogle}
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: "9999px",
            border: "none",
            backgroundColor: "#1ed760",
            color: "#000000",
            fontWeight: 700,
            fontSize: "14px",
            textTransform: "uppercase",
            letterSpacing: "1.4px",
            cursor: "pointer",
          }}
        >
          Continue with Google
        </button>
      </section>
    </main>
  );
}
