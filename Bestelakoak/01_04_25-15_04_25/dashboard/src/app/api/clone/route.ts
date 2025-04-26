import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

function extractRepoName(url: string): string {
  // Remove .git extension if present
  const withoutGit = url.replace(/\.git$/, '');
  
  // Handle various Git URL formats
  // HTTPS: https://github.com/user/repo
  // SSH: git@github.com:user/repo
  // Git: git://github.com/user/repo
  const parts = withoutGit.split(/[/:]/);
  return parts[parts.length - 1] || 'unknown-repo';
}

export async function POST(request: Request) {
  try {
    const { repoUrl } = await request.json();
    
    if (!repoUrl) {
      return NextResponse.json({ error: 'Repository URL is required' }, { status: 400 });
    }

    const repoName = extractRepoName(repoUrl);
    const projectDir = path.resolve(process.cwd(), '../'); // Navigate to the parent of the main project folder
    const cloneDir = path.join(projectDir, 'cloned-repos', repoName);

    // Create directory if it doesn't exist
    fs.mkdirSync(path.join(projectDir, 'cloned-repos'), { recursive: true });

    // Clone the repository
    await execAsync(`git clone ${repoUrl} ${cloneDir}`);

    // Check if package.json exists and install dependencies
    if (fs.existsSync(path.join(cloneDir, 'package.json'))) {
      try {
        // First try with legacy-peer-deps
        await execAsync('npm install --legacy-peer-deps', { cwd: cloneDir });
      } catch (installError) {
        try {
          // If that fails, try with both legacy-peer-deps and force
          console.log('First install attempt failed, trying with force...');
          await execAsync('npm install --legacy-peer-deps --force', { cwd: cloneDir });
        } catch (error: any) {
          return NextResponse.json({ 
            error: 'Failed to install dependencies. Error: ' + (error?.message || 'Unknown error')
          }, { 
            status: 500 
          });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Repository cloned and dependencies installed successfully',
      path: cloneDir
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || 'An error occurred'
    }, { 
      status: 500 
    });
  }
}