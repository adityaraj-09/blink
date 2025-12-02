#!/usr/bin/env node

/**
 * WebContainer Configuration Checker
 * Helps diagnose WebContainer setup issues
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 WebContainer Configuration Checker\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Check 1: .env file exists
console.log('1️⃣ Checking .env file...');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('   ✅ .env file found');

  // Read and check for client ID
  const envContent = fs.readFileSync(envPath, 'utf-8');
  if (envContent.includes('VITE_WEBCONTAINER_CLIENT_ID')) {
    const match = envContent.match(/VITE_WEBCONTAINER_CLIENT_ID=(.+)/);
    if (match && match[1]) {
      const clientId = match[1].trim();
      if (clientId === 'your_webcontainer_client_id_here') {
        console.log('   ❌ Client ID not configured');
        console.log('   → Update VITE_WEBCONTAINER_CLIENT_ID in .env');
      } else {
        console.log('   ✅ Client ID configured:', clientId.substring(0, 25) + '...');
      }
    }
  } else {
    console.log('   ❌ VITE_WEBCONTAINER_CLIENT_ID not found in .env');
    console.log('   → Add: VITE_WEBCONTAINER_CLIENT_ID=your_client_id');
  }
} else {
  console.log('   ❌ .env file not found');
  console.log('   → Create .env file from .env.example');
}

console.log('');

// Check 2: Dependencies
console.log('2️⃣ Checking dependencies...');
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  const required = {
    '@webcontainer/api': '✅ WebContainer API',
    '@xterm/xterm': '✅ xterm.js',
    '@xterm/addon-fit': '✅ xterm fit addon',
    '@xterm/addon-web-links': '✅ xterm web-links addon',
  };

  for (const [pkg, label] of Object.entries(required)) {
    if (deps[pkg]) {
      console.log(`   ${label} (${deps[pkg]})`);
    } else {
      console.log(`   ❌ ${pkg} not installed`);
      console.log(`   → Run: npm install ${pkg}`);
    }
  }
} else {
  console.log('   ❌ package.json not found');
}

console.log('');

// Check 3: Files exist
console.log('3️⃣ Checking integration files...');
const files = [
  'src/services/webcontainer/WebContainerService.ts',
  'src/services/webcontainer/FileSystemSync.ts',
  'src/services/webcontainer/init.ts',
  'src/components/WebContainerTerminal.jsx',
  'src/hooks/useWebContainer.ts',
];

for (const file of files) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} missing`);
  }
}

console.log('');

// Instructions
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('📋 Next Steps:\n');
console.log('1. Configure your client ID in .env file');
console.log('2. Add allowed referrers at https://webcontainer.io/');
console.log('   • https://localhost:5173');
console.log('   • https://localhost:3000');
console.log('   • https://yourdomain.com');
console.log('');
console.log('3. Restart dev server:');
console.log('   npm run dev');
console.log('');
console.log('4. Open browser and check console for:');
console.log('   ✅ WebContainer authentication initialized');
console.log('   🔑 Using client ID: ...');
console.log('');
console.log('📚 See WEBCONTAINER_REFERRER_ERROR_FIX.md for details');
console.log('');
