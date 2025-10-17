const { GIST_ID, GIST_TOKEN } = process.env;

if (!GIST_ID || !GIST_TOKEN) {
  console.error('Error: GIST_ID and GIST_TOKEN environment variables required');
  process.exit(1);
}

try {
  const res = await fetch(
    'https://www.duolingo.com/2017-06-30/users?username=Edward527516&fields=streak,streakData%7BcurrentStreak,previousStreak%7D%7D',
    { headers: { 'User-Agent': 'curl/8.0.1' } }
  );
  const streak = (await res.json()).users[0].streakData.currentStreak.length;
  console.log(`Streak: ${streak}`);

  await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: { Authorization: `token ${GIST_TOKEN}` },
    body: JSON.stringify({ files: { 'duolingo.txt': { content: String(streak) } } })
  });
  console.log('Updated');
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
