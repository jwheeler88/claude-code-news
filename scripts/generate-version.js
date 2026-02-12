import { writeFileSync } from 'fs';

const versionData = {
  buildTimestamp: Date.now()
};

writeFileSync('dist/version.json', JSON.stringify(versionData));
console.log('Generated version.json');
