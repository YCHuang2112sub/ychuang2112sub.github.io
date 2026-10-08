const fs = require('node:fs');
const raw = process.env.FIREBASE_WEB_CONFIG;
const ownerUid = process.env.FIREBASE_OWNER_UID;
if (!raw && !ownerUid) {
  fs.writeFileSync('blog-config.js', 'window.BLOG_CONFIG = { firebase: null, ownerUid: "" };\n');
} else {
  if (!raw || !ownerUid) throw new Error('Set both FIREBASE_WEB_CONFIG and FIREBASE_OWNER_UID secrets.');
  let firebase;
  try { firebase = JSON.parse(raw); } catch { throw new Error('FIREBASE_WEB_CONFIG must be valid JSON.'); }
  if (!firebase || typeof firebase !== 'object' || Array.isArray(firebase)) throw new Error('Expected a Firebase web config object.');
  const allowed = ['apiKey','authDomain','projectId','storageBucket','messagingSenderId','appId','measurementId','databaseURL'];
  if (Object.keys(firebase).some(key => !allowed.includes(key))) throw new Error('Only Firebase web configuration fields are accepted.');
  for (const key of ['apiKey','authDomain','projectId','appId']) {
    if (typeof firebase[key] !== 'string' || !firebase[key]) throw new Error('Firebase web config is missing a required field.');
  }
  fs.writeFileSync('blog-config.js', 'window.BLOG_CONFIG = ' + JSON.stringify({firebase, ownerUid}) + ';\n');
}
