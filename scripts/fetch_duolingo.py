import os
import requests

username = "Edward527516"
gist_id = os.environ["GIST_ID"]
gist_token = os.environ["GIST_TOKEN"]

# fetch streak
url = (
    f"https://www.duolingo.com/2017-06-30/users"
    f"?username={username}&fields=streak,streakData%7BcurrentStreak,previousStreak%7D%7D"
)
headers = {
    "User-Agent": "curl/8.0.1",  # mimic curl
    "Accept": "*/*",
}
response = requests.get(url, headers=headers)
response.raise_for_status()
data = response.json()
streak = data["users"][0]["streakData"]["currentStreak"]["length"]

# update gist
gist_url = f"https://api.github.com/gists/{gist_id}"
payload = {"files": {"duolingo.txt": {"content": str(streak)}}}
requests.patch(
    gist_url, json=payload, headers={"Authorization": f"token {gist_token}"}
).raise_for_status()
