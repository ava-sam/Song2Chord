"use client";

import { useState, useRef } from "react";

type Song = {
  title: string;
  artist: string;
  albumArt: string | null;
};


export default function Home() {
  // stores what the user types into the Spotify search bar and results
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Song[]>([]);
  const [fileName, setFileName] = useState("");
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // call FastAPI backend
  const searchSongs = async () => {
    if (!query) return;

    // send request to backend
    const res = await fetch(
      `http://127.0.0.1:8000/search?q=${query}`
    );

    // convert to JSON and save returned songs to appear on page
    const data = await res.json();
    setResults(data);
  };
  
  // deal with .mp3 and .wav uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // only allow mp3 and wav
    const isAllowedAudio =
      file.type === "audio/mpeg" ||
      file.type === "audio/wav" ||
      file.name.endsWith(".mp3") ||
      file.name.endsWith(".wav");

    if (!isAllowedAudio) {
      alert("Please upload an .mp3 or .wav file.");
      return;
    }

    // create local URL for instant playback
    const url = URL.createObjectURL(file);

    // save audio URL and file name
    setAudioURL(url);
    setFileName(file.name);

    // play immediately
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play();
      }
    }, 100);
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Page title */}
      <h1>Song2Chord</h1>

      {/* Spotify search section */}
      <section style={{ marginTop: "30px" }}>
        <h2>Search Spotify</h2>

        {/* Search input */}
        <input
          type="text"
          placeholder="Search for a song..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            padding: "10px",
            width: "300px",
            marginRight: "10px",
          }}
        />

        {/* Search button */}
        <button onClick={searchSongs}>Search</button>

        {/* Cleaner Spotify sign-in message for later */}
        <p style={{ marginTop: "10px", color: "#666" }}>
          Sign in with Spotify to enable audio previews.
        </p>

        {/* Spotify results */}
        <div style={{ marginTop: "20px" }}>
          {results.map((song, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "15px",
              }}
            >
              {/* Album image */}
              {song.albumArt && (
                <img
                  src={song.albumArt}
                  alt={`${song.title} album cover`}
                  width={60}
                  height={60}
                  style={{
                    marginRight: "15px",
                    objectFit: "cover",
                  }}
                />
              )}

              {/* Song info */}
              <div>
                <div>
                  <strong>{song.title}</strong>
                </div>
                <div>{song.artist}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Upload section */}
      <section style={{ marginTop: "50px" }}>
        <h2>Upload Your Own Audio</h2>

        <p style={{ color: "#666" }}>
          Upload an .mp3 or .wav file to play it instantly.
        </p>

        {/* File input */}
        <input
          type="file"
          accept=".mp3,.wav,audio/mpeg,audio/wav"
          onChange={handleFileUpload}
        />

        {/* Show uploaded file name */}
        {fileName && (
          <p style={{ marginTop: "15px" }}>
            Now playing: <strong>{fileName}</strong>
          </p>
        )}

        {/* Audio player */}
        {audioURL && (
          <div style={{ marginTop: "20px" }}>
            <audio ref={audioRef} src={audioURL} controls />
          </div>
        )}
      </section>
    </main>
  );
}