"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import NavBar from "../../components/navBar";
import { createClient } from "../../lib/supabase/client";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const guitarDb = require("@tombatossals/chords-db/lib/guitar.json");

const ChordDiagram = dynamic(
  () => import("@tombatossals/react-chords/lib/Chord"),
  { ssr: false }
);

type ChordEntry = { time: number; chord: string };
type AnalysisResult = { filename: string; chords: ChordEntry[] };
type ChordPosition = { frets: number[]; fingers: number[]; baseFret: number; barres: number[] };

const GUITAR_INSTRUMENT = {
  strings: 6,
  fretsOnChord: 4,
  name: "Guitar",
  tunings: { standard: ["E", "A", "D", "G", "B", "E"] },
};

// Map backend note names to chords-db keys (uses enharmonic equivalents)
const NOTE_MAP: Record<string, string> = {
  "C": "C", "C#": "Csharp", "D": "D", "D#": "Eb",
  "E": "E", "F": "F", "F#": "Fsharp", "G": "G",
  "G#": "Ab", "A": "A", "A#": "Bb", "B": "B",
};

function lookupChordPosition(chordName: string): ChordPosition | null {
  if (!chordName || chordName === "Unknown") return null;
  const spaceIdx = chordName.indexOf(" ");
  if (spaceIdx === -1) return null;
  const root = chordName.slice(0, spaceIdx);
  const suffix = chordName.slice(spaceIdx + 1);
  const key = NOTE_MAP[root];
  if (!key) return null;
  const entries: { suffix: string; positions: ChordPosition[] }[] = guitarDb.chords[key];
  if (!entries) return null;
  const entry = entries.find((c) => c.suffix === suffix);
  return entry?.positions?.[0] ?? null;
}

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
      const supabase = createClient();
      const path = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("audio-uploads")
        .upload(path, file);

      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://127.0.0.1:8000/analyze-chords", {
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

  // Unique chords in order of first appearance, excluding unknowns
  const uniqueChords = result
    ? [...new Set(result.chords.map((e) => e.chord).filter((c) => c !== "Unknown"))]
    : [];

  const ready = !!file && !loading;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#121212", fontFamily: "system-ui, sans-serif" }}>
      <NavBar />

      <main style={{ padding: "40px 32px", maxWidth: "800px" }}>
        <h1 style={{ color: "#ffffff", fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>
          Chord Analyzer
        </h1>
        <p style={{ color: "#b3b3b3", fontSize: "14px", marginBottom: "32px" }}>
          Upload an audio file to generate a chord sheet.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "40px",
            backgroundColor: "#181818",
            border: `2px dashed ${file ? "#1ed760" : "#4d4d4d"}`,
            borderRadius: "8px",
            cursor: "pointer",
            marginBottom: "20px",
          }}>
            <span style={{ fontSize: "32px" }}>🎵</span>
            <span style={{ color: "#b3b3b3", fontSize: "14px" }}>
              {file ? file.name : "Click to choose an audio file"}
            </span>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={{ display: "none" }}
            />
          </label>

          <button
            type="submit"
            disabled={!ready}
            style={{
              padding: "14px 43px",
              borderRadius: "9999px",
              border: "none",
              backgroundColor: ready ? "#1ed760" : "#1f1f1f",
              color: ready ? "#000000" : "#b3b3b3",
              fontWeight: 700,
              fontSize: "14px",
              textTransform: "uppercase",
              letterSpacing: "1.4px",
              cursor: ready ? "pointer" : "not-allowed",
            }}
          >
            {loading ? "Analyzing..." : "Analyze Chords"}
          </button>
        </form>

        {error && (
          <p style={{ color: "#f3727f", marginTop: "20px", fontSize: "14px" }}>{error}</p>
        )}

        {result && (
          <>
            <section style={{ marginTop: "40px" }}>
              <h2 style={{ color: "#ffffff", fontSize: "18px", fontWeight: 600, marginBottom: "20px" }}>
                Chords in this song
              </h2>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                gap: "16px",
              }}>
                {uniqueChords.map((chordName) => {
                  const position = lookupChordPosition(chordName);
                  return (
                    <div key={chordName} style={{
                      backgroundColor: "#181818",
                      borderRadius: "8px",
                      padding: "12px 8px 8px",
                      textAlign: "center",
                      boxShadow: "rgba(0,0,0,0.3) 0px 8px 8px",
                    }}>
                      <p style={{
                        color: "#1ed760",
                        fontSize: "12px",
                        fontWeight: 700,
                        marginBottom: "8px",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                      }}>
                        {chordName}
                      </p>
                      {position ? (
                        <ChordDiagram chord={position} instrument={GUITAR_INSTRUMENT} lite={false} />
                      ) : (
                        <p style={{ color: "#4d4d4d", fontSize: "11px", padding: "16px 0" }}>
                          No diagram
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section style={{ marginTop: "40px" }}>
              <h2 style={{ color: "#ffffff", fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>
                {result.filename}
              </h2>

              <div style={{
                backgroundColor: "#181818",
                borderRadius: "8px",
                overflow: "hidden",
                boxShadow: "rgba(0,0,0,0.3) 0px 8px 8px",
              }}>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#1f1f1f" }}>
                      <th style={thStyle}>Time (s)</th>
                      <th style={thStyle}>Chord</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.chords.map((entry, i) => (
                      <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#181818" : "#1f1f1f" }}>
                        <td style={tdStyle}>{entry.time}</td>
                        <td style={{ ...tdStyle, color: "#1ed760", fontWeight: 600 }}>{entry.chord}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 16px",
  color: "#b3b3b3",
  fontSize: "12px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "1.4px",
  borderBottom: "1px solid #4d4d4d",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px",
  color: "#ffffff",
  fontSize: "14px",
  borderBottom: "1px solid #252525",
};
