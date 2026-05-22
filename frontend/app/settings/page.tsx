"use client";

import NavBar from "../../components/navBar";

export default function SettingsPage() {
  return (
    <>
      <NavBar />

      <main
        style={{
          padding: "40px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1>Settings</h1>
        <p>Account and app settings will go here.</p>
      </main>
    </>
  );
}