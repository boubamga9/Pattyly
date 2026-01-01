import { describe, it, expect } from 'vitest';
import { sanitizeFileName } from '$lib/utils/filename-sanitizer';

describe('sanitizeFileName', () => {
	it('should preserve file extension', () => {
		expect(sanitizeFileName('test.jpg')).toBe('test.jpg');
		expect(sanitizeFileName('my-file.png')).toBe('my-file.png');
		expect(sanitizeFileName('document.pdf')).toBe('document.pdf');
	});

	it('should remove accents and special characters', () => {
		expect(sanitizeFileName('café.jpg')).toBe('cafe.jpg');
		expect(sanitizeFileName('résumé.pdf')).toBe('resume.pdf');
		expect(sanitizeFileName('naïve.png')).toBe('naive.png');
		expect(sanitizeFileName('crème-brûlée.jpg')).toBe('creme-brulee.jpg');
	});

	it('should replace spaces with hyphens', () => {
		expect(sanitizeFileName('my file.jpg')).toBe('my-file.jpg');
		expect(sanitizeFileName('my  file.jpg')).toBe('my-file.jpg');
		expect(sanitizeFileName('my   file.jpg')).toBe('my-file.jpg');
	});

	it('should remove special characters', () => {
		expect(sanitizeFileName('file@name.jpg')).toBe('filename.jpg');
		expect(sanitizeFileName('file#name.jpg')).toBe('filename.jpg');
		expect(sanitizeFileName('file$name.jpg')).toBe('filename.jpg');
		expect(sanitizeFileName('file%name.jpg')).toBe('filename.jpg');
		expect(sanitizeFileName('file&name.jpg')).toBe('filename.jpg');
		expect(sanitizeFileName('file*name.jpg')).toBe('filename.jpg');
		expect(sanitizeFileName('file(name).jpg')).toBe('filename.jpg');
	});

	it('should convert to lowercase', () => {
		expect(sanitizeFileName('MYFILE.jpg')).toBe('myfile.jpg');
		expect(sanitizeFileName('MyFile.jpg')).toBe('myfile.jpg');
		expect(sanitizeFileName('My File.jpg')).toBe('my-file.jpg');
	});

	it('should handle multiple hyphens', () => {
		expect(sanitizeFileName('my---file.jpg')).toBe('my-file.jpg');
		expect(sanitizeFileName('my--file.jpg')).toBe('my-file.jpg');
		expect(sanitizeFileName('my---file---name.jpg')).toBe('my-file-name.jpg');
	});

	it('should remove leading and trailing hyphens', () => {
		expect(sanitizeFileName('-myfile.jpg')).toBe('myfile.jpg');
		expect(sanitizeFileName('myfile-.jpg')).toBe('myfile.jpg');
		expect(sanitizeFileName('-myfile-.jpg')).toBe('myfile.jpg');
	});

	it('should handle files without extension', () => {
		expect(sanitizeFileName('myfile')).toBe('myfile');
		expect(sanitizeFileName('my file')).toBe('my-file');
		expect(sanitizeFileName('my-file')).toBe('my-file');
	});

	it('should handle files starting with dot', () => {
		// Les fichiers commençant par un point perdent le point initial après sanitization
		expect(sanitizeFileName('.myfile.jpg')).toBe('myfile.jpg');
		expect(sanitizeFileName('..myfile.jpg')).toBe('myfile.jpg');
	});

	it('should handle empty or invalid names', () => {
		expect(sanitizeFileName('')).toBe('file');
		// Un fichier commençant par un point : lastDotIndex = 0, donc name = '.jpg' (pas de séparation)
		// Le point est supprimé comme caractère spécial, résultat = 'jpg'
		expect(sanitizeFileName('.jpg')).toBe('jpg');
		// Les espaces deviennent des tirets puis sont supprimés (leading/trailing), donc name vide = 'file'
		// Résultat = 'file.jpg'
		expect(sanitizeFileName('   .jpg')).toBe('file.jpg');
		// Les caractères spéciaux sont supprimés, name vide = 'file', résultat = 'file.jpg'
		expect(sanitizeFileName('###.jpg')).toBe('file.jpg');
	});

	it('should handle complex real-world examples', () => {
		expect(sanitizeFileName('Mon Gateau d\'Anniversaire!.jpg')).toBe('mon-gateau-danniversaire.jpg');
		expect(sanitizeFileName('Photo 2024-01-15 @ 14h30.jpg')).toBe('photo-2024-01-15-14h30.jpg');
		expect(sanitizeFileName('Café & Pâtisserie (2024).png')).toBe('cafe-patisserie-2024.png');
		expect(sanitizeFileName('Image #123 (copie).jpeg')).toBe('image-123-copie.jpeg');
	});

	it('should preserve numbers', () => {
		expect(sanitizeFileName('file123.jpg')).toBe('file123.jpg');
		expect(sanitizeFileName('123file.jpg')).toBe('123file.jpg');
		expect(sanitizeFileName('file-123.jpg')).toBe('file-123.jpg');
	});

	it('should handle long filenames', () => {
		const longName = 'a'.repeat(100) + '.jpg';
		const result = sanitizeFileName(longName);
		expect(result).toBe('a'.repeat(100) + '.jpg');
		expect(result.length).toBeGreaterThan(100);
	});
});

