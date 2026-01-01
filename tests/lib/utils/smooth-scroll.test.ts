import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initSmoothScroll, destroySmoothScroll, scrollTo } from '$lib/utils/smooth-scroll';

// Mock Lenis - must use factory function for hoisting
vi.mock('lenis', () => {
    const mockLenisInstance = {
        destroy: vi.fn(),
        on: vi.fn(),
        scrollTo: vi.fn(),
        raf: vi.fn()
    };
    return {
        default: vi.fn().mockImplementation(() => mockLenisInstance)
    };
});

// Mock GSAP - must use factory function for hoisting
vi.mock('gsap', () => ({
    gsap: {
        ticker: {
            add: vi.fn(),
            lagSmoothing: vi.fn()
        }
    }
}));

vi.mock('gsap/ScrollTrigger', () => ({
    ScrollTrigger: {
        update: vi.fn()
    }
}));

describe('smooth-scroll', () => {
    let originalWindow: typeof global.window;
    let mockRequestAnimationFrame: any;
    let LenisMock: any;
    let gsapMock: any;
    let ScrollTriggerMock: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        
        // Get mocked modules
        LenisMock = (await import('lenis')).default;
        gsapMock = (await import('gsap')).gsap;
        ScrollTriggerMock = (await import('gsap/ScrollTrigger')).ScrollTrigger;
        
        // Mock requestAnimationFrame globally
        global.requestAnimationFrame = vi.fn((cb) => {
            mockRequestAnimationFrame = cb;
            return 1;
        }) as any;
        
        // Mock window
        originalWindow = global.window;
        global.window = {
            ...global.window,
            requestAnimationFrame: global.requestAnimationFrame
        } as any;

        // Mock document
        global.document = {
            querySelector: vi.fn()
        } as any;
    });

    afterEach(() => {
        global.window = originalWindow;
        destroySmoothScroll();
    });

    describe('initSmoothScroll', () => {
        it('should return undefined when window is not defined', () => {
            const originalWindow = global.window;
            // @ts-ignore
            delete global.window;

            const result = initSmoothScroll();

            expect(result).toBeUndefined();
            
            global.window = originalWindow;
        });

        it('should initialize Lenis and return instance when window is defined', () => {
            const result = initSmoothScroll();

            expect(result).toBeDefined();
            expect(LenisMock).toHaveBeenCalled();
            expect(gsapMock.ticker.add).toHaveBeenCalled();
            expect(gsapMock.ticker.lagSmoothing).toHaveBeenCalledWith(0);
        });
    });

    describe('destroySmoothScroll', () => {
        it('should destroy Lenis instance if it exists', () => {
            initSmoothScroll();
            const lenisInstance = (LenisMock as any).mock.results[0].value;
            
            destroySmoothScroll();

            expect(lenisInstance.destroy).toHaveBeenCalled();
        });

        it('should do nothing if Lenis instance does not exist', () => {
            destroySmoothScroll();

            // No assertions needed - just checking it doesn't crash
        });
    });

    describe('scrollTo', () => {
        it('should return early if lenis is not initialized', () => {
            const mockElement = {} as HTMLElement;
            
            scrollTo(mockElement);

            // Should not crash, just return early
        });

        it('should scroll to HTMLElement when lenis is initialized', () => {
            initSmoothScroll();
            const mockElement = {} as HTMLElement;
            const lenisInstance = (LenisMock as any).mock.results[0].value;
            
            scrollTo(mockElement);

            expect(lenisInstance.scrollTo).toHaveBeenCalledWith(mockElement, { offset: 0 });
        });

        it('should scroll to element with offset when provided', () => {
            initSmoothScroll();
            const mockElement = {} as HTMLElement;
            const lenisInstance = (LenisMock as any).mock.results[0].value;
            
            scrollTo(mockElement, { offset: 100 });

            expect(lenisInstance.scrollTo).toHaveBeenCalledWith(mockElement, { offset: 100 });
        });

        it('should scroll to element by selector string when lenis is initialized', () => {
            initSmoothScroll();
            const mockElement = {} as HTMLElement;
            const lenisInstance = (LenisMock as any).mock.results[0].value;
            (global.document.querySelector as any).mockReturnValue(mockElement);
            
            scrollTo('#target');

            expect(global.document.querySelector).toHaveBeenCalledWith('#target');
            expect(lenisInstance.scrollTo).toHaveBeenCalledWith(mockElement, { offset: 0 });
        });

        it('should not scroll if selector string does not find element', () => {
            initSmoothScroll();
            const lenisInstance = (LenisMock as any).mock.results[0].value;
            (global.document.querySelector as any).mockReturnValue(null);
            
            scrollTo('#nonexistent');

            expect(global.document.querySelector).toHaveBeenCalledWith('#nonexistent');
            expect(lenisInstance.scrollTo).not.toHaveBeenCalled();
        });
    });
});
