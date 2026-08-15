import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Field-level AES-256-GCM encryption for everything stored in the identity vault.
 *
 * The key here comes from a flat env var, which is fine for local dev but is a stand-in —
 * production should pull a data key from KMS/Vault and envelope-encrypt with it (see
 * ARCHITECTURE.md §6) rather than holding one static key in process env.
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;
  private readonly hashKey: Buffer;

  constructor(config: ConfigService) {
    this.key = this.loadKey(config, 'ENCRYPTION_KEY');
    this.hashKey = this.loadKey(config, 'HASH_KEY');
  }

  private loadKey(config: ConfigService, envVar: 'ENCRYPTION_KEY' | 'HASH_KEY'): Buffer {
    const base64Key = config.getOrThrow<string>(envVar);
    const key = Buffer.from(base64Key, 'base64');
    if (key.length !== 32) {
      throw new Error(
        `${envVar} must decode to exactly 32 bytes. ` +
          "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
      );
    }
    return key;
  }

  /** Returns base64(iv || authTag || ciphertext). Safe to store directly in a text column. */
  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
  }

  decrypt(payload: string): string {
    const raw = Buffer.from(payload, 'base64');
    const iv = raw.subarray(0, IV_LENGTH);
    const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }

  /** Convenience for optional fields — keeps call sites from sprinkling null checks everywhere. */
  encryptOrNull(plaintext: string | null | undefined): string | null {
    return plaintext == null ? null : this.encrypt(plaintext);
  }

  decryptOrNull(payload: string | null | undefined): string | null {
    return payload == null ? null : this.decrypt(payload);
  }

  /**
   * Deterministic HMAC for equality lookups (e.g. "is this email already registered")
   * on fields that are otherwise encrypted non-deterministically. Not reversible.
   */
  hashForLookup(value: string): string {
    return createHmac('sha256', this.hashKey).update(value.trim().toLowerCase()).digest('hex');
  }
}
