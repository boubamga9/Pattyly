import { describe, it, expect } from 'vitest';
import {
    faqSchema,
    createFaqSchema,
    updateFaqSchema,
} from '$lib/validations/schemas/faq';

describe('faqSchema', () => {
    const validFaq = {
        question: 'Quelle est votre question ?',
        answer: 'Voici la réponse à votre question.'
    };

    it('should validate correct FAQ data', () => {
        expect(() => faqSchema.parse(validFaq)).not.toThrow();
    });

    it('should reject empty question', () => {
        expect(() => faqSchema.parse({
            ...validFaq,
            question: ''
        })).toThrow('requis');
    });

    it('should reject empty answer', () => {
        expect(() => faqSchema.parse({
            ...validFaq,
            answer: ''
        })).toThrow('requis');
    });

    it('should reject question longer than 500 characters', () => {
        expect(() => faqSchema.parse({
            ...validFaq,
            question: 'A'.repeat(501)
        })).toThrow('500 caractères');
    });

    it('should reject answer longer than 2000 characters', () => {
        expect(() => faqSchema.parse({
            ...validFaq,
            answer: 'A'.repeat(2001)
        })).toThrow('2000 caractères');
    });

    it('should accept question with exactly 500 characters', () => {
        expect(() => faqSchema.parse({
            ...validFaq,
            question: 'A'.repeat(500)
        })).not.toThrow();
    });

    it('should accept answer with exactly 2000 characters', () => {
        expect(() => faqSchema.parse({
            ...validFaq,
            answer: 'A'.repeat(2000)
        })).not.toThrow();
    });

    it('should reject question with forbidden characters', () => {
        expect(() => faqSchema.parse({
            ...validFaq,
            question: 'Question with <script>alert("xss")</script>'
        })).toThrow();
    });

    it('should reject answer with forbidden characters', () => {
        expect(() => faqSchema.parse({
            ...validFaq,
            answer: 'Answer with <script>alert("xss")</script>'
        })).toThrow();
    });
});

describe('createFaqSchema', () => {
    const validFaq = {
        question: 'Quelle est votre question ?',
        answer: 'Voici la réponse.'
    };

    it('should validate correct create FAQ data', () => {
        expect(() => createFaqSchema.parse(validFaq)).not.toThrow();
    });

    it('should have the same validation as faqSchema', () => {
        // createFaqSchema should be the same as faqSchema
        expect(createFaqSchema).toBe(faqSchema);
    });
});

describe('updateFaqSchema', () => {
    const validUpdateFaq = {
        id: '123',
        question: 'Quelle est votre question ?',
        answer: 'Voici la réponse.'
    };

    it('should validate correct update FAQ data', () => {
        expect(() => updateFaqSchema.parse(validUpdateFaq)).not.toThrow();
    });

    it('should require id field', () => {
        expect(() => updateFaqSchema.parse({
            question: 'Question',
            answer: 'Answer'
        })).toThrow(); // Zod throws with "Required" message
    });

    it('should reject empty id', () => {
        expect(() => updateFaqSchema.parse({
            id: '',
            question: 'Question',
            answer: 'Answer'
        })).toThrow('ID requis');
    });

    it('should validate question and answer same as faqSchema', () => {
        expect(() => updateFaqSchema.parse({
            id: '123',
            question: 'A'.repeat(501),
            answer: 'Answer'
        })).toThrow('500 caractères');
    });
});

