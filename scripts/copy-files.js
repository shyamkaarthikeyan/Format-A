import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the project root directory
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const serverDir = path.join(projectRoot, 'server');

console.log('Copying files for deployment...');

try {
  // Ensure dist directory exists
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Copy all Python files from server directory to dist
  const serverFiles = fs.readdirSync(serverDir);
  const pythonFiles = serverFiles.filter(file => file.endsWith('.py'));
  
  console.log(`Found ${pythonFiles.length} Python files to copy:`);
  pythonFiles.forEach(file => {
    const sourcePath = path.join(serverDir, file);
    const destPath = path.join(distDir, file);
    fs.copyFileSync(sourcePath, destPath);
    console.log(`  ✓ Copied ${file}`);
  });

  // Copy requirements.txt if it exists
  const requirementsPath = path.join(projectRoot, 'requirements.txt');
  if (fs.existsSync(requirementsPath)) {
    const destRequirementsPath = path.join(distDir, 'requirements.txt');
    fs.copyFileSync(requirementsPath, destRequirementsPath);
    console.log('  ✓ Copied requirements.txt');
  }

  // Copy runtime.txt if it exists
  const runtimePath = path.join(projectRoot, 'runtime.txt');
  if (fs.existsSync(runtimePath)) {
    const destRuntimePath = path.join(distDir, 'runtime.txt');
    fs.copyFileSync(runtimePath, destRuntimePath);
    console.log('  ✓ Copied runtime.txt');
  }

  // Copy server requirements.txt if it exists
  const serverRequirementsPath = path.join(serverDir, 'requirements.txt');
  if (fs.existsSync(serverRequirementsPath)) {
    const destServerRequirementsPath = path.join(distDir, 'server-requirements.txt');
    fs.copyFileSync(serverRequirementsPath, destServerRequirementsPath);
    console.log('  ✓ Copied server/requirements.txt as server-requirements.txt');
  }

  console.log('✅ All files copied successfully!');
  
} catch (error) {
  console.error('❌ Error copying files:', error.message);
  process.exit(1);
}