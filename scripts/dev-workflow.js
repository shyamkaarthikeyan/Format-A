#!/usr/bin/env node

/**
 * Development workflow script to minimize Vercel deployments
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Development Workflow Helper');
console.log('This helps you avoid unnecessary Vercel deployments\n');

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase().trim());
    });
  });
}

async function main() {
  try {
    // Check if we're on main/production branch
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    
    if (currentBranch === 'main' || currentBranch === 'production') {
      console.log(`⚠️  You're on ${currentBranch} branch - deployments will trigger automatically!`);
      const proceed = await askQuestion('Continue anyway? (y/n): ');
      if (proceed !== 'y' && proceed !== 'yes') {
        console.log('Cancelled. Consider creating a feature branch first.');
        process.exit(0);
      }
    }

    // Check for uncommitted changes
    try {
      execSync('git diff --exit-code', { stdio: 'ignore' });
      execSync('git diff --cached --exit-code', { stdio: 'ignore' });
    } catch {
      console.log('📝 You have uncommitted changes.');
      const commit = await askQuestion('Commit changes first? (y/n): ');
      if (commit === 'y' || commit === 'yes') {
        const message = await askQuestion('Commit message: ');
        execSync(`git add . && git commit -m "${message}"`, { stdio: 'inherit' });
      }
    }

    // Ask about deployment
    const deploy = await askQuestion('Deploy to Vercel? (y/n): ');
    if (deploy === 'y' || deploy === 'yes') {
      console.log('🚀 Pushing to trigger deployment...');
      execSync('git push', { stdio: 'inherit' });
    } else {
      console.log('✅ Changes committed locally. Deploy later when ready.');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    rl.close();
  }
}

main();