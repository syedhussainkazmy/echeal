import crypto from 'crypto';

// Configuration - In production, use environment variables and a secure key management service
const ALGORITHM = 'aes-256-gcm'; // GCM mode provides both encryption and integrity
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

// Get encryption key from environment or use default (should be set in production)
const getEncryptionKey = (): Buffer => {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        console.warn('WARNING: ENCRYPTION_KEY not set. Using default key (NOT SECURE FOR PRODUCTION)');
        return crypto.scryptSync('default-dev-key-change-in-production', 'salt', KEY_LENGTH);
    }
    return Buffer.from(key, 'hex');
};

/**
 * Encrypts sensitive data using AES-256-GCM
 * @param text - The plaintext to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData (base64)
 */
export const encrypt = (text: string): string => {
    if (!text) return text;

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
    });

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Return iv:authTag:encryptedData (all base64 encoded)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
};

/**
 * Decrypts data encrypted with encrypt()
 * @param encryptedText - The encrypted string in format: iv:authTag:encryptedData
 * @returns Decrypted plaintext
 */
export const decrypt = (encryptedText: string): string => {
    if (!encryptedText) return encryptedText;

    const key = getEncryptionKey();
    const parts = encryptedText.split(':');

    if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
        authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};

/**
 * Hash sensitive data (one-way, for comparison only)
 * Use this for data that needs to be compared but not stored in plain text
 * @param text - The text to hash
 * @returns Hashed string
 */
export const hash = (text: string): string => {
    const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
    const hash = crypto.pbkdf2Sync(text, salt, ITERATIONS, KEY_LENGTH, 'sha512').toString('hex');
    return `${salt}:${hash}`;
};

/**
 * Verify hashed data
 * @param text - The plaintext to verify
 * @param hashedText - The hashed string to compare against
 * @returns Boolean indicating if the text matches
 */
export const verifyHash = (text: string, hashedText: string): boolean => {
    const [salt, hash] = hashedText.split(':');
    const verifyHash = crypto.pbkdf2Sync(text, salt, ITERATIONS, KEY_LENGTH, 'sha512').toString('hex');
    return hash === verifyHash;
};

/**
 * Generate a secure random token
 * @param length - The length of the token (default: 32)
 * @returns Random token in hex format
 */
export const generateToken = (length: number = 32): string => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Mask sensitive data for display (e.g., phone numbers, SSN)
 * @param value - The value to mask
 * @param visibleChars - Number of characters to show at the end
 * @returns Masked string
 */
export const maskSensitiveData = (value: string, visibleChars: number = 4): string => {
    if (!value || value.length <= visibleChars) {
        return '*'.repeat(value?.length || 0);
    }
    const maskedPart = '*'.repeat(value.length - visibleChars);
    const visiblePart = value.slice(-visibleChars);
    return maskedPart + visiblePart;
};

/**
 * Encrypt an object's specified fields
 * @param obj - The object containing sensitive data
 * @param fields - Array of field names to encrypt
 * @returns Object with specified fields encrypted
 */
export const encryptFields = <T extends Record<string, any>>(
    obj: T,
    fields: (keyof T)[]
): T => {
    const encrypted = { ...obj };
    fields.forEach((field) => {
        if (encrypted[field] && typeof encrypted[field] === 'string') {
            encrypted[field] = encrypt(encrypted[field] as string) as T[keyof T];
        }
    });
    return encrypted;
};

/**
 * Decrypt an object's specified fields
 * @param obj - The object containing encrypted data
 * @param fields - Array of field names to decrypt
 * @returns Object with specified fields decrypted
 */
export const decryptFields = <T extends Record<string, any>>(
    obj: T,
    fields: (keyof T)[]
): T => {
    const decrypted = { ...obj };
    fields.forEach((field) => {
        if (decrypted[field] && typeof decrypted[field] === 'string') {
            decrypted[field] = decrypt(decrypted[field] as string) as T[keyof T];
        }
    });
    return decrypted;
};

/**
 * PHI (Protected Health Information) fields that should be encrypted
 */
export const PHI_FIELDS = {
    patient: [
        'firstName',
        'lastName',
        'email',
        'address',
        'contactNumber',
        'emergencyContact',
        'medicalHistory',
        'allergies',
    ],
    medicalRecord: [
        'diagnosis',
        'notes',
        'prescription',
        'treatment',
    ],
    prescription: [
        'medication',
        'dosage',
        'instructions',
        'notes',
    ],
} as const;

/**
 * Check if a field name is a PHI field
 * @param fieldName - The field name to check
 * @returns Boolean indicating if it's a PHI field
 */
export const isPHIField = (fieldName: string): boolean => {
    return Object.values(PHI_FIELDS).some((category) =>
        (category as readonly string[]).includes(fieldName)
    );
};
