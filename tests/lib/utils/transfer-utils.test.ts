import { describe, it, expect } from 'vitest';
import {
    isTransferEmail,
    extractAlias,
    validatePayPalMe,
    validateEmail,
    validateTransferData,
    getTransferErrorMessage,
} from '$lib/utils/transfer-utils';

describe('isTransferEmail', () => {
    it('should return true for valid transfer emails', () => {
        expect(isTransferEmail('pattyly.saas+test@gmail.com')).toBe(true);
        expect(isTransferEmail('pattyly.saas+shop123@gmail.com')).toBe(true);
        expect(isTransferEmail('pattyly.saas+alias-test@gmail.com')).toBe(true);
    });

    it('should return false for non-transfer emails', () => {
        expect(isTransferEmail('user@gmail.com')).toBe(false);
        expect(isTransferEmail('pattyly.saas@gmail.com')).toBe(false);
        expect(isTransferEmail('pattyly.saas+test@example.com')).toBe(false);
        expect(isTransferEmail('test+alias@gmail.com')).toBe(false);
    });

    it('should return false for null or invalid inputs', () => {
        expect(isTransferEmail(null as any)).toBe(false);
        expect(isTransferEmail(undefined as any)).toBe(false);
        expect(isTransferEmail('')).toBe(false);
        expect(isTransferEmail('not-an-email')).toBe(false);
    });
});

describe('extractAlias', () => {
    it('should extract alias from valid transfer email', () => {
        expect(extractAlias('pattyly.saas+test@gmail.com')).toBe('test');
        expect(extractAlias('pattyly.saas+shop123@gmail.com')).toBe('shop123');
        expect(extractAlias('pattyly.saas+my-shop@gmail.com')).toBe('my-shop');
    });

    it('should return empty string for non-transfer emails', () => {
        expect(extractAlias('user@gmail.com')).toBe('');
        expect(extractAlias('pattyly.saas@gmail.com')).toBe('');
        expect(extractAlias('pattyly.saas+test@example.com')).toBe('');
    });

    it('should return empty string for null or invalid inputs', () => {
        expect(extractAlias(null as any)).toBe('');
        expect(extractAlias(undefined as any)).toBe('');
        expect(extractAlias('')).toBe('');
    });
});

describe('validatePayPalMe', () => {
    it('should return true for valid PayPal.me usernames', () => {
        expect(validatePayPalMe('patisserie')).toBe(true);
        expect(validatePayPalMe('shop123')).toBe(true);
        expect(validatePayPalMe('my-shop')).toBe(true);
        expect(validatePayPalMe('my_shop')).toBe(true);
        expect(validatePayPalMe('abc')).toBe(true); // min length
        expect(validatePayPalMe('a'.repeat(20))).toBe(true); // max length
    });

    it('should return false for invalid PayPal.me usernames', () => {
        expect(validatePayPalMe('ab')).toBe(false); // too short
        expect(validatePayPalMe('a'.repeat(21))).toBe(false); // too long
        expect(validatePayPalMe('my shop')).toBe(false); // spaces
        expect(validatePayPalMe('my@shop')).toBe(false); // @ symbol
        expect(validatePayPalMe('my.shop')).toBe(false); // dots
        expect(validatePayPalMe('my/shop')).toBe(false); // slashes
    });

    it('should return false for null or invalid inputs', () => {
        expect(validatePayPalMe(null as any)).toBe(false);
        expect(validatePayPalMe(undefined as any)).toBe(false);
        expect(validatePayPalMe('')).toBe(false);
    });
});

describe('validateEmail', () => {
    it('should return true for valid email addresses', () => {
        expect(validateEmail('user@example.com')).toBe(true);
        expect(validateEmail('test.email@domain.co.uk')).toBe(true);
        expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    it('should return false for invalid email addresses', () => {
        expect(validateEmail('not-an-email')).toBe(false);
        expect(validateEmail('user@')).toBe(false);
        expect(validateEmail('@example.com')).toBe(false);
        expect(validateEmail('user @example.com')).toBe(false); // spaces
        expect(validateEmail('user@example')).toBe(false); // no TLD
    });

    it('should return false for null or invalid inputs', () => {
        expect(validateEmail(null as any)).toBe(false);
        expect(validateEmail(undefined as any)).toBe(false);
        expect(validateEmail('')).toBe(false);
    });
});

describe('validateTransferData', () => {
    it('should return isValid true for valid transfer data', () => {
        const result = validateTransferData('user@example.com', 'shop123');
        expect(result.isValid).toBe(true);
        expect(result.errorMessage).toBeUndefined();
    });

    it('should return isValid false for invalid email', () => {
        const result = validateTransferData('invalid-email', 'shop123');
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBe('Format email invalide');
    });

    it('should return isValid false for invalid PayPal.me', () => {
        const result = validateTransferData('user@example.com', 'ab'); // too short
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toContain('PayPal.me');
    });

    it('should return isValid false when both are invalid (email checked first)', () => {
        const result = validateTransferData('invalid-email', 'ab');
        expect(result.isValid).toBe(false);
        expect(result.errorMessage).toBe('Format email invalide'); // email error first
    });
});

describe('getTransferErrorMessage', () => {
    it('should return string error as-is', () => {
        expect(getTransferErrorMessage('Custom error message')).toBe('Custom error message');
    });

    it('should return specific message for PostgreSQL unique violation', () => {
        const error = { code: '23505' };
        expect(getTransferErrorMessage(error)).toBe('Un transfert existe déjà pour cet email');
    });

    it('should return specific message for PostgreSQL foreign key violation', () => {
        const error = { code: '23503' };
        expect(getTransferErrorMessage(error)).toBe('Boutique introuvable');
    });

    it('should return default message for unknown errors', () => {
        expect(getTransferErrorMessage({ code: 'UNKNOWN' })).toBe('Erreur lors de la création du transfert');
        expect(getTransferErrorMessage({})).toBe('Erreur lors de la création du transfert');
        expect(getTransferErrorMessage(null)).toBe('Erreur lors de la création du transfert');
    });
});

