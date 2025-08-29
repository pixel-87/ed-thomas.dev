#!/usr/bin/env node
/*
 Fetch Duolingo streaks for configured usernames and write to site/data/duolingo.json
 Usage: node scripts/fetch-duolingo.js username1 username2 ...
 If no usernames passed, reads DUO_USERNAMES env var (comma-separated).
*/

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

async function fetchUser(username){
  const url = `https://www.duolingo.com/2017-06-30/users?username=${encodeURIComponent(username)}&fields=streak,streakData%7BcurrentStreak,previousStreak%7D%7D`;
  try{
    const res = await fetch(url, { timeout: 10000 });
    if(!res.ok) return { error: `http ${res.status}` };
    const data = await res.json();
    const userData = (data && data.users && data.users[0]) || null;
    if(!userData) return { error: 'no-user' };
    const streak = Math.max(
      (userData.streak) || 0,
      (userData.streakData && userData.streakData.currentStreak && userData.streakData.currentStreak.length) || 0,
      (userData.streakData && userData.streakData.previousStreak && userData.streakData.previousStreak.length) || 0
    );
    return { streak };
  }catch(e){
    return { error: e.message };
  }
}

(async function(){
  const args = process.argv.slice(2);
  const envList = process.env.DUO_USERNAMES || '';
  const users = args.length ? args : (envList ? envList.split(',').map(s=>s.trim()).filter(Boolean) : []);
  if(users.length === 0){
    console.error('No usernames specified via args or DUO_USERNAMES env var.');
    process.exit(2);
  }

  const out = {};
  for(const u of users){
    console.error('Fetching', u);
    const r = await fetchUser(u);
    out[u] = Object.assign({}, r, { updated: new Date().toISOString() });
  }

  // write to repository site/data directory (scripts is at repo root/scripts)
  const dataDir = path.join(__dirname, '..', 'site', 'data');
  try{ fs.mkdirSync(dataDir, { recursive: true }); }catch(e){}
  const outPath = path.join(dataDir, 'duolingo.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.error('Wrote', outPath);
})();
