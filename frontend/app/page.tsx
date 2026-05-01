"use client";

import { useState } from "react";

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  // call your FastAPI backend
  const searchSongs = async () => {
    if (!query) return;

    const res = await fetch(
      `http://127.0.0.1:8000/search?q=${query}`
    );
    const data = await res.json();
    setResults(data);
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Guitar Song Finder</h1>

      {/* SEARCH BAR */}
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

      <button onClick={searchSongs}>Search</button>

      {/* RESULTS */}
      <div style={{ marginTop: "20px" }}>
        {results.map((song: any, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <img
              src={song.albumArt}
              alt="album"
              width={60}
              style={{ marginRight: "15px" }}
            />

            <div>
              <div><strong>{song.title}</strong></div>
              <div>{song.artist}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}