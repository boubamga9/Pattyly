import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export let lenis: Lenis | null = null;

/**
 * Initialize Lenis smooth scroll
 */
export function initSmoothScroll() {
	if (typeof window === 'undefined') return;

	// Create Lenis instance
	lenis = new Lenis({
		duration: 1.2,
		easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
		orientation: 'vertical',
		gestureOrientation: 'vertical',
		smoothWheel: true,
		wheelMultiplier: 1,
		smoothTouch: false, // Disable on touch devices for better performance
		touchMultiplier: 2,
		infinite: false,
	});

	// Integrate with GSAP ScrollTrigger
	function raf(time: number) {
		lenis?.raf(time);
		requestAnimationFrame(raf);
	}

	requestAnimationFrame(raf);

	// Update ScrollTrigger on scroll
	lenis.on('scroll', () => {
		ScrollTrigger.update();
	});

	// ScrollTrigger should use Lenis scroll
	gsap.ticker.add((time) => {
		lenis?.raf(time * 1000);
	});

	gsap.ticker.lagSmoothing(0);

	return lenis;
}

/**
 * Destroy Lenis instance
 */
export function destroySmoothScroll() {
	if (lenis) {
		lenis.destroy();
		lenis = null;
	}
}

/**
 * Scroll to element
 */
export function scrollTo(target: string | HTMLElement, options?: { offset?: number }) {
	if (!lenis) return;

	const offset = options?.offset ?? 0;

	if (typeof target === 'string') {
		const element = document.querySelector(target);
		if (element) {
			lenis.scrollTo(element, { offset });
		}
	} else {
		lenis.scrollTo(target, { offset });
	}
}

