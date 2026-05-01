from fastapi import FastAPI, Query 
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import requests
import base64

# load variables from backend/.env
load_dotenv()

# create FastAPI app
app = FastAPI()

# allow frontend to make requests to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
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