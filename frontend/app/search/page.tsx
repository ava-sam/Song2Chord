"use client";

import { useState } from "react";
import NavBar from "../../components/navBar";
import { createClient } from "../../lib/supabase/client";

type ChordEntry = { time: number; chord: string };
type AnalysisResult = { filename: string; chords: ChordEntry[] };

export default function SearchPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // 1. Upload to Supabase Storage
      const supabase = createClient();
      const path = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("audio-uploads")
        .upload(path, file);

      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

      // 2. Send the file to the backend for chord analysis
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://localhost:8000/analyze-chords", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Analyzer error: ${res.status}`);

      const data: AnalysisResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <NavBar />
      <main style={{ padding: "40px", fontFamily: "system-ui, sans-serif", maxWidth: "600px" }}>
        <h1>Chord Analyzer</h1>

        <form onSubmit={handleSubmit} style={{ marginTop: "24px" }}>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ display: "block", marginBottom: "16px" }}
          />
          <button
            type="submit"
            disabled={!file || loading}
            style={{
              padding: "10px 24px",
              backgroundColor: loading || !file ? "#ccc" : "#111",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: file && !loading ? "pointer" : "not-allowed",
              fontWeight: 600,
            }}
          >
            {loading ? "Analyzing..." : "Analyze Chords"}
          </button>
        </form>

        {error && (
          <p style={{ color: "red", marginTop: "20px" }}>{error}</p>
        )}

        {result && (
          <section style={{ marginTop: "32px" }}>
            <h2 style={{ marginBottom: "16px" }}>{result.filename}</h2>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Time (s)</th>
                  <th style={thStyle}>Chord</th>
                </tr>
              </thead>
              <tbody>
                {result.chords.map((entry, i) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#f9f9f9" : "white" }}>
                    <td style={tdStyle}>{entry.time}</td>
                    <td style={tdStyle}>{entry.chord}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  borderBottom: "2px solid #ddd",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid #eee",
};
