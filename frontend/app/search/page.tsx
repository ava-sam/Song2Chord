"use client";

import { useState, useRef, useEffect } from "react";
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

function getActiveIndex(chords: ChordEntry[], time: number): number {
  let idx = -1;
  for (let i = 0; i < chords.length; i++) {
    if (chords[i].time <= time) idx = i;
    else break;
  }
  return idx;
}

export default function SearchPage() {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const activeRowRef = useRef<HTMLTableRowElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setCurrentTime(0);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(selected ? URL.createObjectURL(selected) : null);
  }

  // Clean up object URL on unmount
  useEffect(() => {
    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll active chord row into view
  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentTime]);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentTime(0);

    try {
      const supabase = createClient();
      const path = `${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("audio-uploads")
        .upload(path, file);

      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analyze-chords`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`Analyzer error: ${res.status}`);

      const data: AnalysisResult = await res.json();
      setResult(data);

      // Save to library
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("songs").insert({
          user_id: user.id,
          filename: data.filename,
          chords: data.chords,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  const uniqueChords = result
    ? [...new Set(result.chords.map((e) => e.chord).filter((c) => c !== "Unknown"))]
    : [];

  const activeIdx = result ? getActiveIndex(result.chords, currentTime) : -1;
  const activeChord = activeIdx >= 0 ? result!.chords[activeIdx].chord : null;
  const activePosition = activeChord ? lookupChordPosition(activeChord) : null;
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
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </label>

          {/* Audio player — shown as soon as a file is chosen */}
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              style={{
                width: "100%",
                marginBottom: "20px",
                borderRadius: "9999px",
                accentColor: "#1ed760",
              }}
            />
          )}

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
            {/* Now playing — live chord + diagram while audio plays */}
            {activeChord && (
              <section style={{
                marginTop: "40px",
                backgroundColor: "#181818",
                borderRadius: "8px",
                padding: "24px",
                display: "flex",
                alignItems: "center",
                gap: "24px",
                boxShadow: "rgba(0,0,0,0.5) 0px 8px 24px",
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ color: "#b3b3b3", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.4px", marginBottom: "8px" }}>
                    Now playing
                  </p>
                  <p style={{ color: "#1ed760", fontSize: "36px", fontWeight: 700 }}>
                    {activeChord}
                  </p>
                </div>
                {activePosition && (
                  <div style={{ width: "100px", flexShrink: 0 }}>
                    <ChordDiagram chord={activePosition} instrument={GUITAR_INSTRUMENT} lite={false} />
                  </div>
                )}
              </section>
            )}

            {/* Unique chord diagrams */}
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
                  const isActive = chordName === activeChord;
                  return (
                    <div key={chordName} style={{
                      backgroundColor: isActive ? "#1f1f1f" : "#181818",
                      borderRadius: "8px",
                      padding: "12px 8px 8px",
                      textAlign: "center",
                      boxShadow: isActive
                        ? "rgba(30,215,96,0.2) 0px 0px 0px 2px, rgba(0,0,0,0.3) 0px 8px 8px"
                        : "rgba(0,0,0,0.3) 0px 8px 8px",
                      transition: "box-shadow 0.15s",
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

            {/* Chord timeline */}
            <section style={{ marginTop: "40px" }}>
              <h2 style={{ color: "#ffffff", fontSize: "18px", fontWeight: 600, marginBottom: "16px" }}>
                {result.filename}
              </h2>
              <div style={{
                backgroundColor: "#181818",
                borderRadius: "8px",
                overflow: "hidden",
                maxHeight: "360px",
                overflowY: "auto",
                boxShadow: "rgba(0,0,0,0.3) 0px 8px 8px",
              }}>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                    <tr style={{ backgroundColor: "#1f1f1f" }}>
                      <th style={thStyle}>Time (s)</th>
                      <th style={thStyle}>Chord</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.chords.map((entry, i) => {
                      const isActive = i === activeIdx;
                      return (
                        <tr
                          key={i}
                          ref={isActive ? activeRowRef : null}
                          style={{
                            backgroundColor: isActive ? "#1f3d29" : i % 2 === 0 ? "#181818" : "#1f1f1f",
                            transition: "background-color 0.2s",
                          }}
                        >
                          <td style={tdStyle}>{entry.time}</td>
                          <td style={{
                            ...tdStyle,
                            color: isActive ? "#1ed760" : "#ffffff",
                            fontWeight: isActive ? 700 : 600,
                          }}>
                            {entry.chord}
                          </td>
                        </tr>
                      );
                    })}
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
