import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { tick } from 'svelte';

// Register ScrollTrigger plugin
if (typeof window !== 'undefined') {
	gsap.registerPlugin(ScrollTrigger);
}

/**
 * Helper function to check if an element is a valid DOM element
 */
function isValidElement(element: any): element is HTMLElement {
	return (
		element !== null &&
		typeof element === 'object' &&
		typeof element.getBoundingClientRect === 'function' &&
		element.nodeType === Node.ELEMENT_NODE
	);
}

/**
 * Reveal animation: fade + uplift (GSAP fade+uplift classique)
 * Opacity + translateY de 20px
 */
export async function revealElement(
	element: HTMLElement | null,
	options: {
		delay?: number;
		duration?: number;
		translateY?: number;
	} = {}
) {
	if (typeof window === 'undefined') return;
	
	// Attendre que le DOM soit complètement rendu
	await tick();
	
	if (!element || !isValidElement(element)) {
		return;
	}

	const { delay = 0, duration = 0.6, translateY = 15 } = options;

	gsap.fromTo(
		element,
		{
			opacity: 0,
			y: translateY,
		},
		{
			opacity: 1,
			y: 0,
			duration,
			delay,
			ease: 'power2.out',
			scrollTrigger: {
				trigger: element,
				start: 'top 92%',
				toggleActions: 'play none none none',
			},
		}
	);
}

/**
 * Reveal with stagger for multiple elements
 */
export async function revealStagger(
	container: HTMLElement | null,
	selector: string,
	options: {
		delay?: number;
		stagger?: number;
		translateY?: number;
		duration?: number;
	} = {}
) {
	if (typeof window === 'undefined') return;
	
	// Attendre que le DOM soit complètement rendu
	await tick();
	
	if (!container || !isValidElement(container)) {
		return;
	}

	const { delay = 0, stagger = 0.08, translateY = 15, duration = 0.6 } = options;

	const elements = container.querySelectorAll(selector);
	
	// Vérifier qu'il y a des éléments à animer
	if (elements.length === 0) {
		return;
	}

	gsap.fromTo(
		elements,
		{
			opacity: 0,
			y: translateY,
		},
		{
			opacity: 1,
			y: 0,
			duration,
			delay,
			stagger,
			ease: 'power2.out',
			scrollTrigger: {
				trigger: container,
				start: 'top 92%',
				toggleActions: 'play none none none',
			},
		}
	);
}

/**
 * Parallax léger sur les images (scroll-speed 0.1 ou 0.2)
 */
export async function parallaxImage(
	element: HTMLElement | null,
	options: { speed?: number } = {}
) {
	if (typeof window === 'undefined') return;
	
	// Attendre que le DOM soit complètement rendu
	await tick();
	
	if (!element || !isValidElement(element)) {
		return;
	}

	const { speed = 0.15 } = options;

	gsap.to(element, {
		yPercent: -50 * speed,
		ease: 'none',
		scrollTrigger: {
			trigger: element,
			start: 'top bottom',
			end: 'bottom top',
			scrub: true,
		},
	});
}

/**
 * Image reveal with mask wipe effect
 */
export async function revealImageWithMask(
	element: HTMLElement | null,
	options: { delay?: number; direction?: 'left' | 'right' | 'up' | 'down' } = {}
) {
	if (typeof window === 'undefined') return;
	
	// Attendre que le DOM soit complètement rendu
	await tick();
	
	if (!element || !isValidElement(element)) {
		return;
	}

	const { delay = 0, direction = 'up' } = options;

	// Set initial clip-path based on direction
	const clipPaths = {
		up: 'inset(100% 0% 0% 0%)',
		down: 'inset(0% 0% 100% 0%)',
		left: 'inset(0% 100% 0% 0%)',
		right: 'inset(0% 0% 0% 100%)',
	};

	const finalClipPath = 'inset(0% 0% 0% 0%)';

	gsap.fromTo(
		element,
		{
			clipPath: clipPaths[direction],
			opacity: 0,
		},
		{
			clipPath: finalClipPath,
			opacity: 1,
			duration: 1.2,
			delay,
			ease: 'power3.out',
			scrollTrigger: {
				trigger: element,
				start: 'top 85%',
				toggleActions: 'play none none none',
			},
		}
	);
}

