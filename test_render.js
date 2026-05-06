import fs from 'fs';
const app = fs.readFileSync('src/App.tsx', 'utf8');
console.log(app.includes('FamiliarScenarios'));
