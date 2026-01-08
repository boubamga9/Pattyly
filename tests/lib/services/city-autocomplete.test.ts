import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchCities, MAJOR_CITIES, CAKE_TYPES, CAKE_TYPES_FOR_FORMS } from '$lib/services/city-autocomplete';

// Mock global fetch
global.fetch = vi.fn();

describe('city-autocomplete', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('searchCities', () => {
        it('should return empty array for query shorter than 2 characters', async () => {
            const result = await searchCities('a');
            expect(result).toEqual([]);
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('should return empty array for empty query', async () => {
            const result = await searchCities('');
            expect(result).toEqual([]);
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('should fetch and return city suggestions', async () => {
            const mockResponse = {
                features: [
                    {
                        properties: {
                            label: 'Paris (75001)',
                            city: 'Paris',
                            postcode: '75001'
                        },
                        geometry: {
                            coordinates: [2.3522, 48.8566] // [lon, lat]
                        }
                    },
                    {
                        properties: {
                            label: 'Paris (75002)',
                            city: 'Paris',
                            postcode: '75002'
                        },
                        geometry: {
                            coordinates: [2.3522, 48.8566]
                        }
                    }
                ]
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await searchCities('Paris');

            expect(result).toHaveLength(2);
            expect(result[0].label).toBe('Paris (75001)');
            expect(result[0].city).toBe('Paris');
            expect(result[0].postalCode).toBe('75001');
            expect(result[0].coordinates).toEqual({ lat: 48.8566, lon: 2.3522 });
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('api-adresse.data.gouv.fr'),
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'Accept': 'application/json'
                    })
                })
            );
        });

        it('should include query in URL params', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ features: [] })
            });

            await searchCities('Lyon', 5);

            const fetchCall = (global.fetch as any).mock.calls[0][0];
            expect(fetchCall).toContain('q=Lyon');
            expect(fetchCall).toContain('type=municipality');
            expect(fetchCall).toContain('limit=5');
        });

        it('should use default limit of 10', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ features: [] })
            });

            await searchCities('Paris');

            const fetchCall = (global.fetch as any).mock.calls[0][0];
            expect(fetchCall).toContain('limit=10');
        });

        it('should deduplicate cities by city+postalCode', async () => {
            const mockResponse = {
                features: [
                    {
                        properties: {
                            label: 'Paris (75001)',
                            city: 'Paris',
                            postcode: '75001'
                        },
                        geometry: { coordinates: [2.3522, 48.8566] }
                    },
                    {
                        properties: {
                            label: 'Paris (75001)',
                            city: 'Paris',
                            postcode: '75001'
                        },
                        geometry: { coordinates: [2.3522, 48.8566] }
                    },
                    {
                        properties: {
                            label: 'Paris (75002)',
                            city: 'Paris',
                            postcode: '75002'
                        },
                        geometry: { coordinates: [2.3522, 48.8566] }
                    }
                ]
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await searchCities('Paris');

            expect(result).toHaveLength(2); // Deduplicated
            expect(result[0].postalCode).toBe('75001');
            expect(result[1].postalCode).toBe('75002');
        });

        it('should return empty array when API returns error', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 500
            });

            const result = await searchCities('Paris');

            expect(result).toEqual([]);
        });

        it('should return empty array when API returns empty features', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ features: [] })
            });

            const result = await searchCities('InvalidCityName');

            expect(result).toEqual([]);
        });

        it('should handle fetch errors gracefully', async () => {
            (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

            const result = await searchCities('Paris');

            expect(result).toEqual([]);
        });

        it('should trim query before searching', async () => {
            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ features: [] })
            });

            await searchCities('  Paris  ');

            const fetchCall = (global.fetch as any).mock.calls[0][0];
            expect(fetchCall).toContain('q=Paris'); // Trimmed
        });
    });

    describe('MAJOR_CITIES', () => {
        it('should be a readonly array', () => {
            expect(Array.isArray(MAJOR_CITIES)).toBe(true);
            expect(MAJOR_CITIES.length).toBeGreaterThan(0);
        });

        it('should include major French cities', () => {
            expect(MAJOR_CITIES).toContain('Paris');
            expect(MAJOR_CITIES).toContain('Lyon');
            expect(MAJOR_CITIES).toContain('Marseille');
        });
    });

    describe('CAKE_TYPES', () => {
        it('should be a readonly array', () => {
            expect(Array.isArray(CAKE_TYPES)).toBe(true);
            expect(CAKE_TYPES.length).toBeGreaterThan(0);
        });

        it('should include cake types', () => {
            expect(CAKE_TYPES).toContain("Gâteau d'anniversaire");
            expect(CAKE_TYPES).toContain('Gâteau de mariage');
        });
    });

    describe('CAKE_TYPES_FOR_FORMS', () => {
        it('should be a readonly array', () => {
            expect(Array.isArray(CAKE_TYPES_FOR_FORMS)).toBe(true);
            expect(CAKE_TYPES_FOR_FORMS.length).toBeGreaterThan(0);
        });

        it('should have one less item than CAKE_TYPES', () => {
            // CAKE_TYPES_FOR_FORMS excludes "Gâteau pour événement"
            expect(CAKE_TYPES_FOR_FORMS.length).toBe(CAKE_TYPES.length - 1);
        });

        it('should not include "Gâteau pour événement"', () => {
            expect(CAKE_TYPES_FOR_FORMS).not.toContain('Gâteau pour événement');
        });
    });
});




