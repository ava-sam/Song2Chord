"use client";

import { useState, useRef } from "react";
import { createClient } from "../lib/supabase/client";

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
  const supabase = createClient();

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
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const isAllowedAudio =
      file.type === "audio/mpeg" ||
      file.type === "audio/wav" ||
      file.name.endsWith(".mp3") ||
      file.name.endsWith(".wav");

    if (!isAllowedAudio) {
      alert("Please upload an .mp3 or .wav file.");
      return;
    }

    // play instantly in browser
    const localUrl = URL.createObjectURL(file);
    setAudioURL(localUrl);
    setFileName(file.name);

    setTimeout(() => {
      audioRef.current?.play();
    }, 100);

    // check if user is signed in
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please sign in with Google to save uploads.");
      return;
    }

    // unique file path in Supabase
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    // upload file to Supabase Storage
    const { error } = await supabase.storage
      .from("audio-uploads")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error(error);
      alert("Upload failed.");
      return;
    }

    alert("Audio saved to Supabase!");
  };
  
    // sign-in with google
    const signInWithGoogle = async () => {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "http://localhost:3000",
        },
      });
    };

    // sign-out of google
    const signOut = async () => {
      await supabase.auth.signOut();
      window.location.reload();
    };

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* page title */}
      <h1>Song2Chord</h1>

      <div style={{ marginTop: "20px", marginBottom: "30px" }}>
        <button onClick={signInWithGoogle}>
          Sign in with Google
        </button>

        <button onClick={signOut} style={{ marginLeft: "10px" }}>
          Sign out
        </button>
      </div>

      {/* spotify search section */}
      <section style={{ marginTop: "30px" }}>
        <h2>Search Spotify</h2>

        {/* search input */}
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

        {/* search button */}
        <button onClick={searchSongs}>Search</button>

        {/* Spotify sign-in message for later */}
        <p style={{ marginTop: "10px", color: "#666" }}>
          Sign in with Spotify to enable audio previews.
        </p>

        {/* spotify results */}
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
              {/* album image */}
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

              {/* song info */}
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

      {/* upload section */}
      <section style={{ marginTop: "50px" }}>
        <h2>Upload Your Own Audio</h2>

        <p style={{ color: "#666" }}>
          Upload an .mp3 or .wav file to play it instantly.
        </p>

        {/* file input */}
        <input
          type="file"
          accept=".mp3,.wav,audio/mpeg,audio/wav"
          onChange={handleFileUpload}
        />

        {/* show uploaded file name */}
        {fileName && (
          <p style={{ marginTop: "15px" }}>
            Now playing: <strong>{fileName}</strong>
          </p>
        )}

        {/* audio player */}
        {audioURL && (
          <div style={{ marginTop: "20px" }}>
            <audio ref={audioRef} src={audioURL} controls />
          </div>
        )}
      </section>
    </main>
  );
}