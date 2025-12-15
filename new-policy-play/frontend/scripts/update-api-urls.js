#!/usr/bin/env node
/**
 * Script to update all hardcoded API URLs to use the centralized config
 * Run this after deployment to ensure all files use the correct API URL
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const API_CONFIG_IMPORT = "import { API_URL, BACKEND_URL } from '../config/api'";
const API_CONFIG_IMPORT_DEEP = "import { API_URL, BACKEND_URL } from '../../config/api'";
const API_CONFIG_IMPORT_DEEPER = "import { API_URL, BACKEND_URL } from '../../../config/api'";

const filesToUpdate = [
  // Files in app root
  { file: 'app/games/page.jsx', import: API_CONFIG_IMPORT, replace: "const API_URL = 'http://localhost:8000/api'" },
  { file: 'app/leaderboard/page.jsx', import: API_CONFIG_IMPORT, replace: "const API_URL = 'http://localhost:8000/api'" },
  { file: 'app/user/scores/page.jsx', import: API_CONFIG_IMPORT, replace: "const API_URL = 'http://localhost:8000/api'" },
  { file: 'app/upload/page.jsx', import: API_CONFIG_IMPORT, replace: "const API_URL = 'http://localhost:8000/api/policy/upload'" },
  
  // Files in app/policy-tap
  { file: 'app/policy-tap/page.jsx', import: API_CONFIG_IMPORT, replace: "const API_URL = 'http://localhost:8000/api'" },
  { file: 'app/policy-tap/play/page.jsx', import: API_CONFIG_IMPORT, replace: "const API_URL = 'http://localhost:8000/api'" },
  { file: 'app/policy-tap/results/page.jsx', import: API_CONFIG_IMPORT, replace: "const API_URL = 'http://localhost:8000/api'" },
  { file: 'app/policy-tap/leaderboard/page.jsx', import: API_CONFIG_IMPORT, replace: "const API_URL = 'http://localhost:8000/api'" },
  { file: 'app/policy-tap/[policyId]/level-select/page.jsx', import: API_CONFIG_IMPORT, replace: "const API_URL = 'http://localhost:8000/api'" },
  
  // Files in app/admin
  { file: 'app/admin/dashboard/page.jsx', import: API_CONFIG_IMPORT, replace: "const API_URL = 'http://localhost:8000/api/admin'" },
  { file: 'app/admin/policies/page.jsx', import: API_CONFIG_IMPORT, replace: "const API_URL = 'http://localhost:8000/api/admin'" },
  { file: 'app/admin/upload/page.jsx', import: API_CONFIG_IMPORT, replace: "const API_URL = 'http://localhost:8000/api/policy/upload'" },
  { file: 'app/admin/analytics/page.jsx', import: API_CONFIG_IMPORT, replace: "const API_URL = 'http://localhost:8000/api/admin'" },
  { file: 'app/admin/policy-analysis/page.jsx', import: API_CONFIG_IMPORT, replace: "const API_URL = 'http://localhost:8000/api/policy/analyze'" },
  
  // Files in app/games/[id]
  { file: 'app/games/[id]/play/page.jsx', import: API_CONFIG_IMPORT_DEEP, replace: "const API_URL = 'http://localhost:8000/api'" },
  
  // Files in app/escape-room
  { file: 'app/escape-room/page.jsx', import: API_CONFIG_IMPORT, replace: "const API_URL = 'http://localhost:8000/api'" },
  { file: 'app/escape-room/play/page.jsx', import: API_CONFIG_IMPORT, replace: "const API_URL = 'http://localhost:8000/api'" },
  { file: 'app/escape-room/results/page.jsx', import: API_CONFIG_IMPORT, replace: "const API_URL = 'http://localhost:8000/api'" },
  { file: 'app/escape-room/leaderboard/page.jsx', import: API_CONFIG_IMPORT, replace: "const API_URL = 'http://localhost:8000/api'" },
  { file: 'app/escape-room/[policyId]/level-select/page.jsx', import: API_CONFIG_IMPORT, replace: "const API_URL = 'http://localhost:8000/api'" },
];

function updateFile(filePath, importStatement, oldApiUrl) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Check if already updated
  if (content.includes("from '../config/api'") || content.includes("from '../../config/api'") || content.includes("from '../../../config/api'")) {
    console.log(`✓ Already updated: ${filePath}`);
    return true;
  }
  
  // Add import at the top (after 'use client' if present)
  if (content.includes("'use client'")) {
    const useClientIndex = content.indexOf("'use client'");
    const nextLineIndex = content.indexOf('\n', useClientIndex) + 1;
    content = content.slice(0, nextLineIndex) + importStatement + '\n' + content.slice(nextLineIndex);
  } else {
    content = importStatement + '\n' + content;
  }
  
  // Replace API_URL declaration
  content = content.replace(
    new RegExp(oldApiUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
    '// API_URL imported from config/api.js'
  );
  
  // Replace hardcoded localhost:8000 URLs
  content = content.replace(/http:\/\/localhost:8000\/api/g, '${API_URL}');
  content = content.replace(/http:\/\/localhost:8000\/health/g, '${BACKEND_URL}/health');
  content = content.replace(/http:\/\/localhost:8000/g, '${BACKEND_URL}');
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✓ Updated: ${filePath}`);
  return true;
}

console.log('🔄 Updating API URLs to use centralized config...\n');

let updated = 0;
let skipped = 0;

filesToUpdate.forEach(({ file, import: importStatement, replace }) => {
  if (updateFile(file, importStatement, replace)) {
    updated++;
  } else {
    skipped++;
  }
});

console.log(`\n✅ Update complete!`);
console.log(`   Updated: ${updated} files`);
console.log(`   Skipped: ${skipped} files`);
console.log(`\n📝 Next steps:`);
console.log(`   1. Set NEXT_PUBLIC_API_URL in .env.local`);
console.log(`   2. Run: npm run build`);
console.log(`   3. Restart your frontend server`);

