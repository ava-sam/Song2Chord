from fastapi import FastAPI, Query 
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from fastapi import UploadFile, File
import librosa
import numpy as np
import tempfile
import os
import requests
import base64

# load variables from backend/.env
load_dotenv()

# create FastAPI app
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# get Spotify credentials from .env
CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")

# asks Spotify for temporary access token before searching songs
def get_token():
    # combine Client ID and Client Secret into one string
    auth_string = f"{CLIENT_ID}:{CLIENT_SECRET}"

    # convert string into bytes
    auth_bytes = auth_string.encode("utf-8")

    # encode bytes using base64
    auth_base64 = base64.b64encode(auth_bytes).decode("utf-8")

    # send POST request to Spotify asking for access token
    response = requests.post(
        "https://accounts.spotify.com/api/token",
        headers={
            "Authorization": f"Basic {auth_base64}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        data={"grant_type": "client_credentials"},
    )

    # return access token in Python
    return response.json()["access_token"]

# test route
@app.get("/")
def home():
    return {"message": "Backend is running"}

# route searches songs on Spotify
@app.get("/search")
def search_song(q: str = Query(...)):
    # get Spotify access token
    token = get_token()

    # send GET request to Spotify's search API
    response = requests.get(
        "https://api.spotify.com/v1/search",
        headers={"Authorization": f"Bearer {token}"},
        params={"q": q, # user's search term
                "type": "track", # search for songs / tracks
                "limit": 10 # return up to 10 results
        },
    )

    # get list of tracks from response in Python dictionary
    tracks = response.json()["tracks"]["items"]


    # format the results so the frontend only gets the info it needs
    results = []

    for track in tracks:
        song_info = {
            "title": track["name"],
            "artist": track["artists"][0]["name"],
            "albumArt": track["album"]["images"][0]["url"]
            if track["album"]["images"]
            else None,
        }

        results.append(song_info)

    # send the cleaned song results back to the frontend
    return results


# 12 musical note names
NOTE_NAMES = [
    "C", "C#", "D", "D#", "E", "F",
    "F#", "G", "G#", "A", "A#", "B"
]

# Build simple major/minor chord templates
def build_chord_templates():
    templates = {}

    for root_index, root_name in enumerate(NOTE_NAMES):

        # Major chord template
        major = np.zeros(12)
        major[root_index] = 1
        major[(root_index + 4) % 12] = 1
        major[(root_index + 7) % 12] = 1

        templates[f"{root_name} major"] = major

        # Minor chord template
        minor = np.zeros(12)
        minor[root_index] = 1
        minor[(root_index + 3) % 12] = 1
        minor[(root_index + 7) % 12] = 1

        templates[f"{root_name} minor"] = minor

    return templates


# Global chord templates
CHORD_TEMPLATES = build_chord_templates()


# Detect closest matching chord
def detect_chord(chroma_vector):

    if np.sum(chroma_vector) == 0:
        return "Unknown"

    normalized_chroma = chroma_vector / np.linalg.norm(chroma_vector)

    best_chord = "Unknown"
    best_score = -1

    for chord_name, template in CHORD_TEMPLATES.items():

        normalized_template = template / np.linalg.norm(template)

        # Similarity score
        score = np.dot(normalized_chroma, normalized_template)

        if score > best_score:
            best_score = score
            best_chord = chord_name

    return best_chord


# Audio → chord analysis endpoint
@app.post("/analyze-chords")
async def analyze_chords(file: UploadFile = File(...)):

    # Preserve uploaded file extension
    suffix = os.path.splitext(file.filename or "")[1] or ".wav"

    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:

        contents = await file.read()
        temp_file.write(contents)

        temp_path = temp_file.name

    try:

        # Load audio using librosa — downsample to 22050 Hz to cap memory usage
        y, sr = librosa.load(temp_path, sr=22050)

        # Detect beat frames
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)

        # chroma_stft is much lighter than chroma_cqt on memory
        chroma = librosa.feature.chroma_stft(y=y, sr=sr)

        # Fallback if beat tracking fails
        if len(beat_frames) < 2:
            beat_frames = np.arange(0, chroma.shape[1], 20)

        chord_sheet = []
        previous_chord = None

        for beat_frame in beat_frames:

            frame_index = int(beat_frame)

            if frame_index >= chroma.shape[1]:
                continue

            chroma_vector = chroma[:, frame_index]

            # Detect chord
            chord = detect_chord(chroma_vector)

            # Remove repeated consecutive chords
            if chord != previous_chord:

                time_seconds = librosa.frames_to_time(
                    frame_index,
                    sr=sr,
                    hop_length=512,
                )

                chord_sheet.append({
                    "time": round(float(time_seconds), 2),
                    "chord": chord,
                })

                previous_chord = chord

        return {
            "filename": file.filename,
            "chords": chord_sheet[:40],
        }

    finally:
        # Delete temporary file
        os.remove(temp_path)