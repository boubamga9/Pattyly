import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cn, flyAndScale } from '$lib/utils';

// Mock getComputedStyle for flyAndScale tests
const mockGetComputedStyle = vi.fn(() => ({
    transform: 'none'
}));

beforeEach(() => {
    // Mock getComputedStyle globally
    Object.defineProperty(global, 'getComputedStyle', {
        value: mockGetComputedStyle,
        writable: true
    });
});

describe('cn', () => {
    it('should merge class names', () => {
        expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
        expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
        expect(cn('foo', true && 'bar', 'baz')).toBe('foo bar baz');
    });

    it('should merge Tailwind classes correctly', () => {
        // twMerge should deduplicate conflicting classes
        const result = cn('p-4', 'p-2');
        expect(result).toBe('p-2'); // Last one wins
    });

    it('should handle undefined and null', () => {
        expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
    });

    it('should handle empty strings', () => {
        expect(cn('foo', '', 'bar')).toBe('foo bar');
    });

    it('should handle arrays', () => {
        expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz');
    });

    it('should handle objects', () => {
        expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
    });
});

describe('flyAndScale', () => {
    const createMockElement = (transform = 'none') => {
        return {
            style: {
                transform: transform
            }
        } as Element;
    };

    beforeEach(() => {
        mockGetComputedStyle.mockReturnValue({
            transform: 'none'
        } as CSSStyleDeclaration);
    });

    it('should return transition config with default params', () => {
        const element = createMockElement();
        const config = flyAndScale(element);

        expect(config).toBeDefined();
        expect(config.duration).toBe(150);
        expect(config.delay).toBe(0);
        expect(config.easing).toBeDefined();
        expect(config.css).toBeDefined();
        expect(typeof config.css).toBe('function');
    });

    it('should accept custom parameters', () => {
        const element = createMockElement();
        const config = flyAndScale(element, {
            y: -10,
            x: 5,
            start: 0.8,
            duration: 200
        });

        expect(config.duration).toBe(200);
    });

    it('should handle element with existing transform', () => {
        mockGetComputedStyle.mockReturnValue({
            transform: 'translateX(10px)'
        } as CSSStyleDeclaration);
        
        const element = createMockElement();
        const config = flyAndScale(element);

        expect(config).toBeDefined();
        expect(config.css).toBeDefined();
    });

    it('should create CSS function that returns string', () => {
        const element = createMockElement();
        const config = flyAndScale(element);
        
        if (config.css) {
            const cssResult = config.css(0.5); // t = 0.5
            expect(typeof cssResult).toBe('string');
            expect(cssResult).toContain('transform');
        }
    });
});

