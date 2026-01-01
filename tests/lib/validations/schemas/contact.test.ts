import { describe, it, expect } from 'vitest';
import { contactSchema, subjectSchema } from '$lib/validations/schemas/contact';

describe('subjectSchema', () => {
    it('should validate correct subjects', () => {
        expect(() => subjectSchema.parse('Question')).not.toThrow();
        expect(() => subjectSchema.parse('A'.repeat(100))).not.toThrow(); // max length
        expect(() => subjectSchema.parse('Ma question')).not.toThrow();
    });

    it('should reject subjects shorter than 2 characters', () => {
        expect(() => subjectSchema.parse('A')).toThrow('2 caractères');
    });

    it('should reject subjects longer than 100 characters', () => {
        expect(() => subjectSchema.parse('A'.repeat(101))).toThrow('100 caractères');
    });

    it('should trim whitespace', () => {
        const result = subjectSchema.parse('  Question  ');
        expect(result).toBe('Question');
    });
});

describe('contactSchema', () => {
    const validContact = {
        name: 'Jean Dupont',
        email: 'jean@example.com',
        subject: 'Question importante',
        body: 'J\'aimerais avoir des informations'
    };

    it('should validate correct contact data', () => {
        expect(() => contactSchema.parse(validContact)).not.toThrow();
    });

    it('should reject contact with invalid name', () => {
        expect(() => contactSchema.parse({
            ...validContact,
            name: 'A' // too short
        })).toThrow();
    });

    it('should reject contact with invalid email', () => {
        expect(() => contactSchema.parse({
            ...validContact,
            email: 'not-an-email'
        })).toThrow();
    });

    it('should reject contact with invalid subject', () => {
        expect(() => contactSchema.parse({
            ...validContact,
            subject: 'A' // too short
        })).toThrow();
    });

    it('should reject contact with empty body', () => {
        expect(() => contactSchema.parse({
            ...validContact,
            body: ''
        })).toThrow('requis');
    });

    it('should reject contact with body longer than 500 characters', () => {
        expect(() => contactSchema.parse({
            ...validContact,
            body: 'A'.repeat(501)
        })).toThrow('500 caractères');
    });

    it('should trim body whitespace', () => {
        const result = contactSchema.parse({
            ...validContact,
            body: '  Message avec espaces  '
        });
        expect(result.body).toBe('Message avec espaces');
    });

    it('should accept body with exactly 500 characters', () => {
        expect(() => contactSchema.parse({
            ...validContact,
            body: 'A'.repeat(500)
        })).not.toThrow();
    });
});

