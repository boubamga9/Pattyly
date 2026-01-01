import { describe, it, expect } from 'vitest';
import {
    formatDateForEmail,
    formatTimeForEmail,
    formatDateTimeForEmail,
    formatInstagramForEmail,
    generateInstagramEmailRow,
} from '$lib/utils/email-formatters';

describe('formatDateForEmail', () => {
    it('should format date in French locale', () => {
        const date = new Date('2024-03-15T10:30:00Z');
        const formatted = formatDateForEmail(date.toISOString());
        
        // Should be in French format (e.g., "15 mars 2024")
        expect(formatted).toMatch(/15/);
        expect(formatted).toMatch(/mars/);
        expect(formatted).toMatch(/2024/);
    });

    it('should handle different dates correctly', () => {
        const date1 = new Date('2024-01-01T00:00:00Z');
        const formatted1 = formatDateForEmail(date1.toISOString());
        expect(formatted1).toBeTruthy();
        expect(formatted1.length).toBeGreaterThan(0);

        const date2 = new Date('2024-12-31T23:59:59Z');
        const formatted2 = formatDateForEmail(date2.toISOString());
        expect(formatted2).toBeTruthy();
        expect(formatted2.length).toBeGreaterThan(0);
    });
});

describe('formatTimeForEmail', () => {
    it('should extract time in HH:MM format', () => {
        expect(formatTimeForEmail('14:30:00')).toBe('14:30');
        expect(formatTimeForEmail('09:05:00')).toBe('09:05');
        expect(formatTimeForEmail('23:59:59')).toBe('23:59');
    });

    it('should handle time strings shorter than 5 characters', () => {
        expect(formatTimeForEmail('14:3')).toBe('14:3');
        expect(formatTimeForEmail('9:0')).toBe('9:0');
    });

    it('should return empty string for null', () => {
        expect(formatTimeForEmail(null)).toBe('');
    });

    it('should return empty string for empty string', () => {
        expect(formatTimeForEmail('')).toBe('');
    });
});

describe('formatDateTimeForEmail', () => {
    it('should format date and time together', () => {
        const date = '2024-03-15T10:30:00Z';
        const time = '14:30:00';
        const formatted = formatDateTimeForEmail(date, time);
        
        expect(formatted).toContain('mars');
        expect(formatted).toContain('14:30');
    });

    it('should format date only when time is null', () => {
        const date = '2024-03-15T10:30:00Z';
        const formatted = formatDateTimeForEmail(date, null);
        
        expect(formatted).not.toContain(':');
        expect(formatted).toMatch(/mars/);
    });

    it('should format date only when time is empty string', () => {
        const date = '2024-03-15T10:30:00Z';
        const formatted = formatDateTimeForEmail(date, '');
        
        expect(formatted).not.toContain(':');
    });

    it('should format date only when time is undefined', () => {
        const date = '2024-03-15T10:30:00Z';
        const formatted = formatDateTimeForEmail(date);
        
        expect(formatted).not.toContain(':');
    });
});

describe('formatInstagramForEmail', () => {
    it('should create clickable Instagram link with @', () => {
        const result = formatInstagramForEmail('@patisserie');
        
        expect(result).toContain('href="https://instagram.com/patisserie"');
        expect(result).toContain('@patisserie');
        expect(result).toContain('style="color: #f97316;"');
    });

    it('should handle Instagram handle without @', () => {
        const result = formatInstagramForEmail('patisserie');
        
        expect(result).toContain('href="https://instagram.com/patisserie"');
        expect(result).toContain('patisserie');
    });

    it('should return empty string for null', () => {
        expect(formatInstagramForEmail(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
        expect(formatInstagramForEmail(undefined)).toBe('');
    });

    it('should return empty string for empty string', () => {
        expect(formatInstagramForEmail('')).toBe('');
    });

    it('should handle handles with multiple @ symbols', () => {
        // La fonction remplace seulement le premier @
        const result = formatInstagramForEmail('@@patisserie');
        expect(result).toContain('instagram.com/@patisserie');
    });
});

describe('generateInstagramEmailRow', () => {
    it('should generate HTML row with Instagram link', () => {
        const result = generateInstagramEmailRow('@patisserie');
        
        expect(result).toContain('<tr>');
        expect(result).toContain('Instagram :');
        expect(result).toContain('@patisserie');
        expect(result).toContain('instagram.com/patisserie');
    });

    it('should return empty string for null', () => {
        expect(generateInstagramEmailRow(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
        expect(generateInstagramEmailRow(undefined)).toBe('');
    });

    it('should return empty string for empty string', () => {
        expect(generateInstagramEmailRow('')).toBe('');
    });

    it('should include proper table structure', () => {
        const result = generateInstagramEmailRow('test');
        expect(result).toContain('<tr>');
        expect(result).toContain('<td');
        expect(result).toContain('padding');
    });
});

