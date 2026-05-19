"use client";

// Supabase client for Google authentication
import { createClient } from "../lib/supabase/client";

export default function LoginPage() {
  // Create Supabase browser client
  const supabase = createClient();

  // Starts Google OAuth login flow
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // After login, send user to the private search/upload page
        redirectTo: "http://localhost:3000/auth/callback",
      },
    });
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "system-ui, sans-serif",
        backgroundColor: "#fafafa",
        padding: "24px",
      }}
    >
      {/* Login card */}
      <section
        style={{
          width: "100%",
          maxWidth: "440px",
          padding: "40px",
          border: "1px solid #ddd",
          borderRadius: "20px",
          textAlign: "center",
          backgroundColor: "white",
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        }}
      >
        {/* App title */}
        <h1 style={{ marginBottom: "12px" }}>Song2Chord</h1>

        {/* App description */}
        <p style={{ color: "#666", marginBottom: "28px" }}>
          Sign in to search songs, upload audio, savew your library, and generate
          chord sheets.
        </p>

        {/* Google sign-in button */}
        <button
          onClick={signInWithGoogle}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "10px",
            border: "1px solid #ccc",
            backgroundColor: "#111",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Continue with Google
        </button>
      </section>
    </main>
  );
}