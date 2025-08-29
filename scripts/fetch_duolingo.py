import requests
import json
import os


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

    streak = data["users"][0]["streakData"]["currentStreak"]["length"]
    return streak


def main():
    username = "Edward527516"
    streak = get_duolingo_streak(username)

    os.makedirs("site/data", exist_ok=True)
    with open("site/data/duolingo.json", "w", encoding="utf-8") as f:
        json.dump(streak, f, indent=2)
    return streak


if __name__ == "__main__":
    main()
