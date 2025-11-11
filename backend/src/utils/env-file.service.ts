/**
 * Environment File Service
 *
 * Safely updates .env file by parsing, modifying, and writing back atomically.
 * Preserves comments and existing variables.
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '@/utils/logger';

const ENV_FILE_PATH = path.resolve(process.cwd(), '.env');

/**
 * Update or add a variable in the .env file
 */
export async function updateEnvFile(key: string, value: string): Promise<void> {
  try {
    let envContent = '';

    // Read existing .env file if it exists
    if (fs.existsSync(ENV_FILE_PATH)) {
      envContent = fs.readFileSync(ENV_FILE_PATH, 'utf-8');
    }

    // Parse lines
    const lines = envContent.split('\n');
    let keyFound = false;

    // Update existing key or mark for addition
    const updatedLines = lines.map((line) => {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || line.trim() === '') {
        return line;
      }

      // Check if this line contains our key
      const match = line.match(/^([^=]+)=/);
      if (match && match[1] && match[1].trim() === key) {
        keyFound = true;
        return `${key}=${value}`;
      }

      return line;
    });

    // If key wasn't found, append it
    if (!keyFound) {
      updatedLines.push(`${key}=${value}`);
    }

    // Write back to file atomically
    const tempFile = `${ENV_FILE_PATH}.tmp`;
    fs.writeFileSync(tempFile, updatedLines.join('\n'), 'utf-8');
    fs.renameSync(tempFile, ENV_FILE_PATH);

    logger.info(`Updated .env file with ${key}`);
  } catch (error) {
    logger.error(error, `Failed to update .env file with ${key}`);
    throw new Error(`Failed to update .env file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Remove a variable from the .env file
 */
export async function removeEnvVariable(key: string): Promise<void> {
  try {
    if (!fs.existsSync(ENV_FILE_PATH)) {
      return; // Nothing to remove
    }

    const envContent = fs.readFileSync(ENV_FILE_PATH, 'utf-8');
    const lines = envContent.split('\n');

    // Filter out the line with the key
    const updatedLines = lines.filter((line) => {
      // Skip if empty or comment
      if (line.trim().startsWith('#') || line.trim() === '') {
        return true;
      }

      // Check if this line contains our key
      const match = line.match(/^([^=]+)=/);
      if (match && match[1] && match[1].trim() === key) {
        return false; // Remove this line
      }

      return true;
    });

    // Write back to file atomically
    const tempFile = `${ENV_FILE_PATH}.tmp`;
    fs.writeFileSync(tempFile, updatedLines.join('\n'), 'utf-8');
    fs.renameSync(tempFile, ENV_FILE_PATH);

    logger.info(`Removed ${key} from .env file`);
  } catch (error) {
    logger.error(error, `Failed to remove ${key} from .env file`);
    throw new Error(`Failed to remove variable from .env file: ${error instanceof Error ? error.message : String(error)}`);
  }
}
