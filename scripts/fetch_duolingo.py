import os
import requests

username = "Edward527516"
gist_id = os.environ["GIST_ID"]
gist_token = os.environ["GIST_TOKEN"]

# fetch streak
url = f"https://www.duolingo.com/2017-06-30/users?username={username}&fields=streak"
headers = {
    "User-Agent": "curl/8.0.1",
    "Accept": "*/*",
}
r = requests.get(url, headers=headers)
r.raise_for_status()
streak = r.json()["users"][0]["streak"]

# update gist
gist_url = f"https://api.github.com/gists/{gist_id}"
payload = {"files": {"duolingo.json": {"content": str(streak)}}}
requests.patch(
    gist_url, json=payload, headers={"Authorization": f"token {gist_token}"}
).raise_for_status()
