import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { updateEnvFile, removeEnvVariable } from '@/utils/env-file.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Environment File Service Test Suite
 * Tests safe .env file manipulation
 *
 * Note: These tests work with the actual .env file in test mode
 */

describe('Environment File Service', () => {
  const TEST_ENV_PATH = path.resolve(process.cwd(), '.env');
  let originalEnvContent: string | null = null;
  let wasSymlink = false;
  let symlinkTarget: string | null = null;

  beforeEach(() => {
    // Check if .env is a symlink
    if (fs.existsSync(TEST_ENV_PATH)) {
      const stats = fs.lstatSync(TEST_ENV_PATH);
      wasSymlink = stats.isSymbolicLink();
      if (wasSymlink) {
        symlinkTarget = fs.readlinkSync(TEST_ENV_PATH);
      }
      // Backup original .env content
      originalEnvContent = fs.readFileSync(TEST_ENV_PATH, 'utf-8');
    }
  });

  afterEach(() => {
    // Restore original .env
    if (originalEnvContent !== null) {
      // If it was a symlink, we need to restore it properly
      if (wasSymlink && symlinkTarget) {
        // Remove current file/symlink if exists
        if (fs.existsSync(TEST_ENV_PATH)) {
          fs.unlinkSync(TEST_ENV_PATH);
        }
        // Recreate the symlink
        fs.symlinkSync(symlinkTarget, TEST_ENV_PATH);
        // Write content to the actual file (through symlink)
        fs.writeFileSync(TEST_ENV_PATH, originalEnvContent, 'utf-8');
      } else {
        // Regular file - just restore content
        fs.writeFileSync(TEST_ENV_PATH, originalEnvContent, 'utf-8');
      }
    } else if (fs.existsSync(TEST_ENV_PATH)) {
      // Remove .env if it didn't exist before
      fs.unlinkSync(TEST_ENV_PATH);
    }

    // Clean up any temp files
    const tempFile = `${TEST_ENV_PATH}.tmp`;
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }

    // Reset state
    originalEnvContent = null;
    wasSymlink = false;
    symlinkTarget = null;
  });

  describe('updateEnvFile', () => {
    it('should create new .env file and add variable', async () => {
      // Remove .env if it exists
      if (fs.existsSync(TEST_ENV_PATH)) {
        fs.unlinkSync(TEST_ENV_PATH);
      }

      await updateEnvFile('TEST_KEY', 'test_value');

      const content = fs.readFileSync(TEST_ENV_PATH, 'utf-8');
      expect(content).toContain('TEST_KEY=test_value');
    });

    it('should update existing variable', async () => {
      // Create .env with initial content
      fs.writeFileSync(
        TEST_ENV_PATH,
        'TEST_KEY=old_value\nOTHER_KEY=other_value',
        'utf-8'
      );

      await updateEnvFile('TEST_KEY', 'new_value');

      const content = fs.readFileSync(TEST_ENV_PATH, 'utf-8');
      expect(content).toContain('TEST_KEY=new_value');
      expect(content).toContain('OTHER_KEY=other_value');
      expect(content).not.toContain('old_value');
    });

    it('should add new variable to existing file', async () => {
      // Create .env with initial content
      fs.writeFileSync(TEST_ENV_PATH, 'EXISTING_KEY=existing_value', 'utf-8');

      await updateEnvFile('NEW_KEY', 'new_value');

      const content = fs.readFileSync(TEST_ENV_PATH, 'utf-8');
      expect(content).toContain('EXISTING_KEY=existing_value');
      expect(content).toContain('NEW_KEY=new_value');
    });

    it('should preserve comments', async () => {
      // Create .env with comments
      fs.writeFileSync(
        TEST_ENV_PATH,
        '# This is a comment\nKEY1=value1\n# Another comment\nKEY2=value2',
        'utf-8'
      );

      await updateEnvFile('KEY3', 'value3');

      const content = fs.readFileSync(TEST_ENV_PATH, 'utf-8');
      expect(content).toContain('# This is a comment');
      expect(content).toContain('# Another comment');
      expect(content).toContain('KEY3=value3');
    });

    it('should preserve empty lines', async () => {
      // Create .env with empty lines
      fs.writeFileSync(
        TEST_ENV_PATH,
        'KEY1=value1\n\nKEY2=value2\n\nKEY3=value3',
        'utf-8'
      );

      await updateEnvFile('KEY4', 'value4');

      const content = fs.readFileSync(TEST_ENV_PATH, 'utf-8');
      const lines = content.split('\n');
      expect(lines.filter((l) => l.trim() === '').length).toBeGreaterThan(0);
    });

    it('should handle values with special characters', async () => {
      fs.writeFileSync(TEST_ENV_PATH, 'EXISTING=value', 'utf-8');

      await updateEnvFile('SPECIAL_KEY', 'value-with-dashes_and_underscores.123');

      const content = fs.readFileSync(TEST_ENV_PATH, 'utf-8');
      expect(content).toContain('SPECIAL_KEY=value-with-dashes_and_underscores.123');
    });

    it('should handle values with spaces', async () => {
      fs.writeFileSync(TEST_ENV_PATH, 'EXISTING=value', 'utf-8');

      await updateEnvFile('KEY_WITH_SPACES', 'value with spaces');

      const content = fs.readFileSync(TEST_ENV_PATH, 'utf-8');
      expect(content).toContain('KEY_WITH_SPACES=value with spaces');
    });

    it('should update variable with trimmed key matching', async () => {
      // Create .env with key that has spaces (should still match)
      fs.writeFileSync(TEST_ENV_PATH, 'TEST_KEY =old_value', 'utf-8');

      await updateEnvFile('TEST_KEY', 'new_value');

      const content = fs.readFileSync(TEST_ENV_PATH, 'utf-8');
      expect(content).toContain('TEST_KEY=new_value');
      expect(content).not.toContain('old_value');
    });

    it('should write file atomically using temp file', async () => {
      fs.writeFileSync(TEST_ENV_PATH, 'EXISTING=value', 'utf-8');

      await updateEnvFile('NEW_KEY', 'new_value');

      // Temp file should be cleaned up
      const tempFile = `${TEST_ENV_PATH}.tmp`;
      expect(fs.existsSync(tempFile)).toBe(false);
    });
  });

  describe('removeEnvVariable', () => {
    it('should remove variable from .env file', async () => {
      // Create .env with variables
      fs.writeFileSync(
        TEST_ENV_PATH,
        'KEY1=value1\nKEY2=value2\nKEY3=value3',
        'utf-8'
      );

      await removeEnvVariable('KEY2');

      const content = fs.readFileSync(TEST_ENV_PATH, 'utf-8');
      expect(content).toContain('KEY1=value1');
      expect(content).toContain('KEY3=value3');
      expect(content).not.toContain('KEY2');
    });

    it('should do nothing if .env file does not exist', async () => {
      // Remove .env if it exists
      if (fs.existsSync(TEST_ENV_PATH)) {
        fs.unlinkSync(TEST_ENV_PATH);
      }

      // Should not throw
      await expect(removeEnvVariable('NONEXISTENT_KEY')).resolves.not.toThrow();

      // .env should still not exist
      expect(fs.existsSync(TEST_ENV_PATH)).toBe(false);
    });

    it('should do nothing if variable does not exist', async () => {
      // Create .env with variables
      fs.writeFileSync(TEST_ENV_PATH, 'KEY1=value1\nKEY2=value2', 'utf-8');

      await removeEnvVariable('NONEXISTENT_KEY');

      // Content should remain unchanged
      const content = fs.readFileSync(TEST_ENV_PATH, 'utf-8');
      expect(content).toBe('KEY1=value1\nKEY2=value2');
    });

    it('should preserve comments', async () => {
      // Create .env with comments
      fs.writeFileSync(
        TEST_ENV_PATH,
        '# Comment 1\nKEY1=value1\n# Comment 2\nKEY2=value2',
        'utf-8'
      );

      await removeEnvVariable('KEY1');

      const content = fs.readFileSync(TEST_ENV_PATH, 'utf-8');
      expect(content).toContain('# Comment 1');
      expect(content).toContain('# Comment 2');
      expect(content).not.toContain('KEY1');
    });

    it('should preserve empty lines', async () => {
      // Create .env with empty lines
      fs.writeFileSync(
        TEST_ENV_PATH,
        'KEY1=value1\n\nKEY2=value2\n\nKEY3=value3',
        'utf-8'
      );

      await removeEnvVariable('KEY2');

      const content = fs.readFileSync(TEST_ENV_PATH, 'utf-8');
      const lines = content.split('\n');
      expect(lines.filter((l) => l.trim() === '').length).toBeGreaterThan(0);
      expect(content).not.toContain('KEY2');
    });

    it('should remove variable with trimmed key matching', async () => {
      // Create .env with key that has spaces
      fs.writeFileSync(TEST_ENV_PATH, 'KEY1 =value1\nKEY2=value2', 'utf-8');

      await removeEnvVariable('KEY1');

      const content = fs.readFileSync(TEST_ENV_PATH, 'utf-8');
      expect(content).not.toContain('KEY1');
      expect(content).toContain('KEY2=value2');
    });

    it('should write file atomically using temp file', async () => {
      fs.writeFileSync(TEST_ENV_PATH, 'KEY1=value1\nKEY2=value2', 'utf-8');

      await removeEnvVariable('KEY1');

      // Temp file should be cleaned up
      const tempFile = `${TEST_ENV_PATH}.tmp`;
      expect(fs.existsSync(tempFile)).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete lifecycle of add, update, and remove', async () => {
      // Start with clean .env
      fs.writeFileSync(TEST_ENV_PATH, '', 'utf-8');

      // 1. Add first variable
      await updateEnvFile('KEY1', 'value1');
      let content = fs.readFileSync(TEST_ENV_PATH, 'utf-8');
      expect(content).toContain('KEY1=value1');

      // 2. Add second variable
      await updateEnvFile('KEY2', 'value2');
      content = fs.readFileSync(TEST_ENV_PATH, 'utf-8');
      expect(content).toContain('KEY1=value1');
      expect(content).toContain('KEY2=value2');

      // 3. Update first variable
      await updateEnvFile('KEY1', 'updated_value1');
      content = fs.readFileSync(TEST_ENV_PATH, 'utf-8');
      expect(content).toContain('KEY1=updated_value1');
      expect(content).not.toContain('KEY1=value1');

      // 4. Remove second variable
      await removeEnvVariable('KEY2');
      content = fs.readFileSync(TEST_ENV_PATH, 'utf-8');
      expect(content).toContain('KEY1=updated_value1');
      expect(content).not.toContain('KEY2');

      // 5. Add third variable
      await updateEnvFile('KEY3', 'value3');
      content = fs.readFileSync(TEST_ENV_PATH, 'utf-8');
      expect(content).toContain('KEY1=updated_value1');
      expect(content).toContain('KEY3=value3');
    });

    it('should handle multiple operations with comments and empty lines', async () => {
      // Create .env with structure
      fs.writeFileSync(
        TEST_ENV_PATH,
        '# Database Config\nDB_HOST=localhost\n\n# API Config\nAPI_KEY=secret',
        'utf-8'
      );

      // Update existing
      await updateEnvFile('DB_HOST', 'prod.example.com');

      // Add new
      await updateEnvFile('DB_PORT', '5432');

      // Remove one
      await removeEnvVariable('API_KEY');

      const content = fs.readFileSync(TEST_ENV_PATH, 'utf-8');

      // Verify comments preserved
      expect(content).toContain('# Database Config');
      expect(content).toContain('# API Config');

      // Verify operations worked
      expect(content).toContain('DB_HOST=prod.example.com');
      expect(content).toContain('DB_PORT=5432');
      expect(content).not.toContain('API_KEY=secret');
    });
  });
});
