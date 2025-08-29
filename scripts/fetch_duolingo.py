import requests
import json
import os
import sys
from datetime import datetime, timezone


def get_duolingo_streak(username: str) -> int:
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

    user = data.get("users", [None])[0]
    if not user:
        return 0
    streak = max(
        user.get("streak") or 0,
        len(user.get("streakData", {}).get("currentStreak") or []),
        len(user.get("streakData", {}).get("previousStreak") or []),
    )
    return streak


def main():
    username = "Edward527516"
    streak = get_duolingo_streak(username)

    # write an object so Hugo doesn't choke on a bare primitive (float64)
    out = {"streak": streak, "updated": datetime.now(timezone.utc).isoformat()}
    os.makedirs("site/data", exist_ok=True)
    with open("site/data/duolingo.json", "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2)
    return streak


if __name__ == "__main__":
    main()
