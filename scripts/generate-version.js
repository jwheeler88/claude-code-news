import { writeFileSync } from 'fs';

// Fetch latest release version and write both version.json and latest.json
const res = await fetch('https://api.github.com/repos/anthropics/claude-code/releases/latest');
if (res.ok) {
  const release = await res.json();
  writeFileSync('dist/version.json', JSON.stringify({ version: release.tag_name }));
  writeFileSync('dist/latest.json', JSON.stringify({ version: release.tag_name }));
  console.log(`Generated version.json and latest.json (${release.tag_name})`);
} else {
  console.warn('Failed to fetch latest release');
}
