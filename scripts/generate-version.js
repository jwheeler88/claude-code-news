import { writeFileSync } from 'fs';

const versionData = {
  buildTimestamp: Date.now()
};

writeFileSync('dist/version.json', JSON.stringify(versionData));
console.log('Generated version.json');

// Fetch latest release version and write latest.json
const res = await fetch('https://api.github.com/repos/anthropics/claude-code/releases/latest');
if (res.ok) {
  const release = await res.json();
  writeFileSync('dist/latest.json', JSON.stringify({ version: release.tag_name }));
  console.log(`Generated latest.json (${release.tag_name})`);
} else {
  console.warn('Failed to fetch latest release for latest.json');
}
