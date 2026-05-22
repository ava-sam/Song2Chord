"use client";

import { useEffect, useState } from "react";
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
type Song = { id: string; filename: string; chords: ChordEntry[]; created_at: string };
type ChordData = { frets: number[]; fingers: number[]; baseFret: number; barres: number[] };

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

function lookupChordPosition(chordName: string) {
  if (!chordName || chordName === "Unknown") return null;
  const spaceIdx = chordName.indexOf(" ");
  if (spaceIdx === -1) return null;
  const key = NOTE_MAP[chordName.slice(0, spaceIdx)];
  if (!key) return null;
  const entries: { suffix: string; positions: ChordData[] }[] = guitarDb.chords[key];
  const entry = entries?.find((c) => c.suffix === chordName.slice(spaceIdx + 1));
  return entry?.positions?.[0] ?? null;
}

export default function LibraryPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("songs")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setSongs((data as Song[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#121212", fontFamily: "system-ui, sans-serif" }}>
      <NavBar />
      <main style={{ padding: "40px 32px", maxWidth: "800px" }}>
        <h1 style={{ color: "#ffffff", fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>
          My Library
        </h1>
        <p style={{ color: "#b3b3b3", fontSize: "14px", marginBottom: "32px" }}>
          Your previously analyzed songs.
        </p>

        {loading && <p style={{ color: "#b3b3b3" }}>Loading...</p>}

        {!loading && songs.length === 0 && (
          <p style={{ color: "#4d4d4d", fontSize: "14px" }}>
            No songs yet. Upload and analyze a file to get started.
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {songs.map((song) => {
            const isOpen = expanded === song.id;
            const uniqueChords = [...new Set(song.chords.map((e) => e.chord).filter((c) => c !== "Unknown"))];
            const date = new Date(song.created_at).toLocaleDateString(undefined, {
              year: "numeric", month: "short", day: "numeric",
            });

            return (
              <div key={song.id} style={{
                backgroundColor: "#181818",
                borderRadius: "8px",
                overflow: "hidden",
                boxShadow: "rgba(0,0,0,0.3) 0px 8px 8px",
              }}>
                {/* Header row */}
                <button
                  onClick={() => setExpanded(isOpen ? null : song.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px 20px",
                    backgroundColor: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div>
                    <p style={{ color: "#ffffff", fontWeight: 600, fontSize: "15px", marginBottom: "4px" }}>
                      {song.filename}
                    </p>
                    <p style={{ color: "#b3b3b3", fontSize: "12px" }}>
                      {date} · {uniqueChords.length} unique chords
                    </p>
                  </div>
                  <span style={{ color: "#b3b3b3", fontSize: "18px" }}>{isOpen ? "▲" : "▼"}</span>
                </button>

                {isOpen && (
                  <div style={{ padding: "0 20px 20px" }}>
                    {/* Chord diagrams */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                      gap: "12px",
                      marginBottom: "20px",
                    }}>
                      {uniqueChords.map((chordName) => {
                        const position = lookupChordPosition(chordName);
                        return (
                          <div key={chordName} style={{
                            backgroundColor: "#1f1f1f",
                            borderRadius: "8px",
                            padding: "10px 6px 6px",
                            textAlign: "center",
                          }}>
                            <p style={{
                              color: "#1ed760", fontSize: "11px", fontWeight: 700,
                              textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px",
                            }}>
                              {chordName}
                            </p>
                            {position
                              ? <ChordDiagram chord={position} instrument={GUITAR_INSTRUMENT} lite={false} />
                              : <p style={{ color: "#4d4d4d", fontSize: "10px", padding: "12px 0" }}>No diagram</p>
                            }
                          </div>
                        );
                      })}
                    </div>

                    {/* Chord timeline */}
                    <div style={{ backgroundColor: "#121212", borderRadius: "6px", overflow: "hidden", maxHeight: "240px", overflowY: "auto" }}>
                      <table style={{ borderCollapse: "collapse", width: "100%" }}>
                        <thead style={{ position: "sticky", top: 0 }}>
                          <tr style={{ backgroundColor: "#1f1f1f" }}>
                            <th style={thStyle}>Time (s)</th>
                            <th style={thStyle}>Chord</th>
                          </tr>
                        </thead>
                        <tbody>
                          {song.chords.map((entry, i) => (
                            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#181818" : "#1f1f1f" }}>
                              <td style={tdStyle}>{entry.time}</td>
                              <td style={{ ...tdStyle, color: "#1ed760", fontWeight: 600 }}>{entry.chord}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left", padding: "10px 14px", color: "#b3b3b3",
  fontSize: "11px", fontWeight: 600, textTransform: "uppercase",
  letterSpacing: "1.4px", borderBottom: "1px solid #4d4d4d",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 14px", color: "#ffffff",
  fontSize: "13px", borderBottom: "1px solid #252525",
};
