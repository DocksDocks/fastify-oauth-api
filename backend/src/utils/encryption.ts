import crypto from 'crypto';
import { env } from '@/config/env';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = Buffer.from(env.ENCRYPTION_KEY, 'utf8').subarray(0, 32); // Ensure exactly 32 bytes

/**
 * Encrypts a string using AES-256-CBC encryption
 * @param text - The plaintext string to encrypt
 * @returns Encrypted string in format: iv:encryptedData
 */
export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(env.ENCRYPTION_IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV and encrypted data separated by colon
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypts a string that was encrypted with the encrypt function
 * @param encryptedData - The encrypted string in format: iv:encryptedData
 * @returns Decrypted plaintext string
 */
export function decrypt(encryptedData: string): string {
  try {
    const parts = encryptedData.split(':');

    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error('Invalid encrypted data format');
    }

    const ivString = parts[0];
    const encryptedText = parts[1];

    const iv = Buffer.from(ivString, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
