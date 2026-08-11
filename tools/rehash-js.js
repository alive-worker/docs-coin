const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const root = path.resolve(__dirname, '..');

// Get correct hash — strip any non-hex chars from sha1sum output
const rawHash = execSync('sha1sum "' + path.join(root, 'js/site.js') + '"').toString().trim();
const newJsHash = rawHash.match(/[a-f0-9]{8}/)[0];
console.log('correct new hash:', newJsHash);

// Find all .html files
function walk(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') result.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) result.push(full);
  }
  return result;
}

const htmlFiles = walk(root);
let count = 0;
for (const f of htmlFiles) {
  let t = fs.readFileSync(f, 'utf-8');
  // Replace any garbled variant of site.js?v=... (with or without backslash prefix)
  const updated = t.replace(/site\.js\?v=[^"]+"/g, 'site.js?v=' + newJsHash + '"');
  if (updated !== t) {
    fs.writeFileSync(f, updated, 'utf-8');
    count++;
  }
}
console.log('Fixed site.js hash in', count, 'files -> v=' + newJsHash);
