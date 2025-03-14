#!/usr/bin/env node

/**
 * Update Feed Generator Server Script
 * 
 * This script updates the feed generator's server file to include the admin endpoint.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Utility functions
const log = {
  info: (message) => console.log(`ℹ️ ${message}`),
  success: (message) => console.log(`✅ ${message}`),
  warning: (message) => console.log(`⚠️ ${message}`),
  error: (message) => console.log(`❌ ${message}`),
  section: (title) => console.log(`\n🔍 ${title}\n${'='.repeat(title.length + 3)}`)
};

async function updateFeedGeneratorServer() {
  log.section('Update Feed Generator Server');
  
  try {
    // Check if we're in the feed generator directory
    const feedGenDir = path.join(process.cwd(), 'swarm-feed-generator', 'feed-generator');
    const srcDir = path.join(feedGenDir, 'src');
    
    if (!fs.existsSync(feedGenDir) || !fs.existsSync(srcDir)) {
      log.error('Could not find the feed generator directory. Make sure you are in the correct directory.');
      log.info(`Expected path: ${feedGenDir}`);
      return;
    }
    
    // Copy the admin.ts file to the src directory
    const adminSrcPath = path.join(process.cwd(), 'scripts', 'admin.ts');
    const adminDestPath = path.join(srcDir, 'admin.ts');
    
    if (!fs.existsSync(adminSrcPath)) {
      log.error('Could not find the admin.ts file. Make sure you have run the implement-admin-endpoint.js script.');
      log.info(`Expected path: ${adminSrcPath}`);
      return;
    }
    
    fs.copyFileSync(adminSrcPath, adminDestPath);
    log.success(`Copied admin.ts to ${adminDestPath}`);
    
    // Find the server file
    const serverFiles = ['server.ts', 'index.ts', 'app.ts'].map(file => path.join(srcDir, file));
    let serverFile = null;
    
    for (const file of serverFiles) {
      if (fs.existsSync(file)) {
        serverFile = file;
        break;
      }
    }
    
    if (!serverFile) {
      log.error('Could not find the server file. Make sure you are in the correct directory.');
      log.info(`Looked for: ${serverFiles.join(', ')}`);
      return;
    }
    
    log.info(`Found server file at ${serverFile}`);
    
    // Read the server file
    const serverCode = fs.readFileSync(serverFile, 'utf-8');
    
    // Check if the admin router is already imported
    if (serverCode.includes('import { createAdminRouter }')) {
      log.warning('Admin router is already imported in the server file.');
      log.info('Skipping server file update.');
      return;
    }
    
    // Update the server file
    let updatedServerCode = serverCode;
    
    // Add the import statement
    const importStatement = `import { createAdminRouter } from './admin';`;
    
    // Find the last import statement
    const lastImportIndex = serverCode.lastIndexOf('import ');
    const lastImportEndIndex = serverCode.indexOf(';', lastImportIndex) + 1;
    
    if (lastImportIndex !== -1) {
      updatedServerCode = 
        serverCode.substring(0, lastImportEndIndex) + 
        '\n' + importStatement + '\n' + 
        serverCode.substring(lastImportEndIndex);
    } else {
      // If no import statements found, add it at the beginning
      updatedServerCode = importStatement + '\n' + serverCode;
    }
    
    // Add the admin router setup
    const routerSetup = `
// Set up admin router
const adminRouter = createAdminRouter(db);
app.use('/admin', adminRouter);
`;
    
    // Find where to add the router setup
    // Look for app.use or app.listen
    const appUseIndex = updatedServerCode.lastIndexOf('app.use(');
    const appListenIndex = updatedServerCode.indexOf('app.listen(');
    
    let insertIndex;
    
    if (appListenIndex !== -1) {
      // Insert before app.listen
      insertIndex = updatedServerCode.lastIndexOf('\n', appListenIndex);
    } else if (appUseIndex !== -1) {
      // Insert after the last app.use
      insertIndex = updatedServerCode.indexOf(';', appUseIndex) + 1;
    } else {
      // If neither found, add it near the end
      insertIndex = updatedServerCode.lastIndexOf('}');
    }
    
    if (insertIndex !== -1) {
      updatedServerCode = 
        updatedServerCode.substring(0, insertIndex) + 
        '\n' + routerSetup + 
        updatedServerCode.substring(insertIndex);
    } else {
      log.warning('Could not find a suitable location to add the admin router setup.');
      log.info('You will need to manually add the admin router setup to the server file.');
      
      // Create a backup of the server file
      const backupPath = serverFile + '.bak';
      fs.writeFileSync(backupPath, serverCode);
      log.success(`Created backup of server file at ${backupPath}`);
      
      // Write the updated server file
      fs.writeFileSync(serverFile, updatedServerCode);
      log.success(`Updated server file at ${serverFile}`);
      
      log.section('Manual Update Instructions');
      log.info('Add the following code to your server file:');
      log.info('1. Import the admin router:');
      log.info('   import { createAdminRouter } from \'./admin\';');
      log.info('2. Set up the admin router:');
      log.info('   const adminRouter = createAdminRouter(db);');
      log.info('   app.use(\'/admin\', adminRouter);');
      
      return;
    }
    
    // Create a backup of the server file
    const backupPath = serverFile + '.bak';
    fs.writeFileSync(backupPath, serverCode);
    log.success(`Created backup of server file at ${backupPath}`);
    
    // Write the updated server file
    fs.writeFileSync(serverFile, updatedServerCode);
    log.success(`Updated server file at ${serverFile}`);
    
    log.section('Next Steps');
    log.info('1. Commit the changes to your repository');
    log.info('2. Deploy the updated feed generator to Render.com');
    log.info('3. Test the admin endpoint with curl:');
    log.info('   curl -X POST https://swarm-feed-generator.onrender.com/admin/update-feed \\');
    log.info('     -H "Content-Type: application/json" \\');
    log.info('     -d \'{"feedUri": "at://did:plc:ouadmsyvsfcpkxg3yyz4trqi/app.bsky.feed.generator/swarm-community", "postUris": ["post-uri-1", "post-uri-2"]}\'');
    log.info('4. Check database stats with:');
    log.info('   curl https://swarm-feed-generator.onrender.com/admin/stats');
    
  } catch (error) {
    log.error(`Error updating feed generator server: ${error.message}`);
    if (error.stack) {
      log.error(`Stack trace: ${error.stack}`);
    }
  }
}

// Run the script
updateFeedGeneratorServer().catch(error => {
  log.error(`Unhandled error: ${error.message}`);
  if (error.stack) {
    log.error(`Stack trace: ${error.stack}`);
  }
  process.exit(1);
}); 