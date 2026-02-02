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
];

function updateVersionInFile(filePath, newVersion) {
  const fullPath = path.resolve(__dirname, '..', filePath);
  let content = fs.readFileSync(fullPath, 'utf8');

  if (filePath.endsWith('package.json')) {
    // Update package.json version field
    const packageJson = JSON.parse(content);
    packageJson.version = newVersion;
    content = JSON.stringify(packageJson, null, 2) + '\n';
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

    console.log('\n✅ Version update complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Verify changes look correct');
    console.log('   2. Commit with: git commit -m "chore: bump version to ' + newVersion + '"');
    console.log('\n⚠️  REMINDER: Update RELEASE_NOTES.md BEFORE running this script');
  } catch (error) {
    console.error('❌ Error updating versions:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
