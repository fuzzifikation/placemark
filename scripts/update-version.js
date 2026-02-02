#!/usr/bin/env node

/**
 * Version management script for Placemark
 * Updates version numbers across all package.json files and source code
 */

const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'package.json',
  'packages/core/package.json',
  'packages/desktop/package.json',
  'packages/desktop/src/renderer/src/components/Settings/AboutSection.tsx',
];

function updateVersionInFile(filePath, newVersion) {
  const fullPath = path.resolve(__dirname, '..', filePath);
  let content = fs.readFileSync(fullPath, 'utf8');

  if (filePath.endsWith('package.json')) {
    // Update package.json version field
    const packageJson = JSON.parse(content);
    packageJson.version = newVersion;
    content = JSON.stringify(packageJson, null, 2) + '\n';
  } else if (filePath.includes('AboutSection.tsx')) {
    // Update the fallback version in AboutSection.tsx
    content = content.replace(/return '[\d.]+';/g, `return '${newVersion}';`);
  }

  fs.writeFileSync(fullPath, content);
  console.log(`✅ Updated ${filePath}`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error('Usage: node scripts/update-version.js <new-version>');
    console.error('Example: node scripts/update-version.js 0.3.3');
    process.exit(1);
  }

  const newVersion = args[0];

  // Validate version format
  if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
    console.error('Version must be in format x.y.z (e.g., 0.3.3)');
    process.exit(1);
  }

  console.log(`🚀 Updating version to ${newVersion}`);

  try {
    filesToUpdate.forEach((filePath) => {
      updateVersionInFile(filePath, newVersion);
    });

    console.log('✅ Version update complete!');
    console.log('📝 Remember to update CHANGELOG.md manually');
  } catch (error) {
    console.error('❌ Error updating versions:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
