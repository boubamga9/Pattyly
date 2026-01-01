import { describe, it, expect } from 'vitest';
import {
    dayOfWeekSchema,
    dateRangeSchema,
    availabilitySchema,
    updateAvailabilityActionSchema,
    unavailabilityBaseSchema,
    createUnavailabilityFormSchema,
    addUnavailabilityActionSchema,
    deleteUnavailabilityActionSchema,
} from '$lib/validations/schemas/availability';

const validUUID = '550e8400-e29b-41d4-a716-446655440000';
const validUUID2 = '123e4567-e89b-12d3-a456-426614174000';

describe('dayOfWeekSchema', () => {
    it('should validate correct day of week (0-6)', () => {
        for (let day = 0; day <= 6; day++) {
            expect(() => dayOfWeekSchema.parse(day)).not.toThrow();
        }
    });

    it('should reject days less than 0', () => {
        expect(() => dayOfWeekSchema.parse(-1)).toThrow();
    });

    it('should reject days greater than 6', () => {
        expect(() => dayOfWeekSchema.parse(7)).toThrow();
    });

    it('should reject non-integer values', () => {
        expect(() => dayOfWeekSchema.parse(1.5)).toThrow();
    });
});

describe('dateRangeSchema', () => {
    const validDateRange = {
        startDate: '2024-01-01',
        endDate: '2024-01-10'
    };

    it('should validate correct date range', () => {
        expect(() => dateRangeSchema.parse(validDateRange)).not.toThrow();
    });

    it('should accept same start and end date', () => {
        expect(() => dateRangeSchema.parse({
            startDate: '2024-01-01',
            endDate: '2024-01-01'
        })).not.toThrow();
    });

    it('should reject when endDate is before startDate', () => {
        expect(() => dateRangeSchema.parse({
            startDate: '2024-01-10',
            endDate: '2024-01-01'
        })).toThrow('antérieure');
    });

    it('should reject empty startDate', () => {
        expect(() => dateRangeSchema.parse({
            startDate: '',
            endDate: '2024-01-10'
        })).toThrow();
    });

    it('should reject empty endDate', () => {
        expect(() => dateRangeSchema.parse({
            startDate: '2024-01-01',
            endDate: ''
        })).toThrow();
    });
});

describe('availabilitySchema', () => {
    const validAvailability = {
        id: validUUID,
        shop_id: validUUID2,
        day: 1, // Monday
        is_open: true,
        daily_order_limit: 10,
        start_time: '09:00',
        end_time: '18:00',
        interval_time: '00:30:00'
    };

    it('should validate correct availability', () => {
        expect(() => availabilitySchema.parse(validAvailability)).not.toThrow();
    });

    it('should accept nullable daily_order_limit', () => {
        expect(() => availabilitySchema.parse({
            ...validAvailability,
            daily_order_limit: null
        })).not.toThrow();
    });

    it('should accept nullable start_time', () => {
        expect(() => availabilitySchema.parse({
            ...validAvailability,
            start_time: null
        })).not.toThrow();
    });

    it('should accept nullable end_time', () => {
        expect(() => availabilitySchema.parse({
            ...validAvailability,
            end_time: null
        })).not.toThrow();
    });

    it('should accept nullable interval_time', () => {
        expect(() => availabilitySchema.parse({
            ...validAvailability,
            interval_time: null
        })).not.toThrow();
    });

    it('should reject invalid day', () => {
        expect(() => availabilitySchema.parse({
            ...validAvailability,
            day: 7
        })).toThrow();
    });

    it('should reject invalid UUIDs', () => {
        expect(() => availabilitySchema.parse({
            ...validAvailability,
            id: 'not-a-uuid'
        })).toThrow();
    });

    it('should reject invalid time format', () => {
        expect(() => availabilitySchema.parse({
            ...validAvailability,
            start_time: '9:00' // missing leading zero
        })).toThrow();
    });
});

describe('updateAvailabilityActionSchema', () => {
    const validUpdate = {
        availabilityId: validUUID,
        isAvailable: 'true',
        dailyOrderLimit: 10,
        startTime: '09:00',
        endTime: '18:00',
        intervalTime: '00:30:00'
    };

    it('should validate correct update availability data', () => {
        expect(() => updateAvailabilityActionSchema.parse(validUpdate)).not.toThrow();
    });

    it('should convert isAvailable string to boolean', () => {
        const result = updateAvailabilityActionSchema.parse({
            ...validUpdate,
            isAvailable: 'true'
        });
        expect(result.isAvailable).toBe(true);
        
        const resultFalse = updateAvailabilityActionSchema.parse({
            ...validUpdate,
            isAvailable: 'false'
        });
        expect(resultFalse.isAvailable).toBe(false);
    });

    it('should accept nullable dailyOrderLimit', () => {
        expect(() => updateAvailabilityActionSchema.parse({
            ...validUpdate,
            dailyOrderLimit: null
        })).not.toThrow();
    });

    it('should accept nullable times', () => {
        expect(() => updateAvailabilityActionSchema.parse({
            ...validUpdate,
            startTime: null,
            endTime: null,
            intervalTime: null
        })).not.toThrow();
    });

    it('should reject invalid availabilityId', () => {
        expect(() => updateAvailabilityActionSchema.parse({
            ...validUpdate,
            availabilityId: 'not-a-uuid'
        })).toThrow();
    });
});

describe('unavailabilityBaseSchema', () => {
    const validUnavailability = {
        id: validUUID,
        shop_id: validUUID2,
        start_date: '2024-01-01',
        end_date: '2024-01-10'
    };

    it('should validate correct unavailability', () => {
        expect(() => unavailabilityBaseSchema.parse(validUnavailability)).not.toThrow();
    });

    it('should accept same start and end date', () => {
        expect(() => unavailabilityBaseSchema.parse({
            ...validUnavailability,
            end_date: '2024-01-01'
        })).not.toThrow();
    });

    it('should reject when end_date is before start_date', () => {
        expect(() => unavailabilityBaseSchema.parse({
            ...validUnavailability,
            end_date: '2023-12-01'
        })).toThrow('antérieure');
    });

    it('should reject invalid UUIDs', () => {
        expect(() => unavailabilityBaseSchema.parse({
            ...validUnavailability,
            id: 'not-a-uuid'
        })).toThrow();
    });
});

describe('createUnavailabilityFormSchema', () => {
    it('should validate correct form data', () => {
        expect(() => createUnavailabilityFormSchema.parse({
            startDate: '2024-01-01',
            endDate: '2024-01-10'
        })).not.toThrow();
    });

    it('should be the same as dateRangeSchema', () => {
        // createUnavailabilityFormSchema is just dateRangeSchema
        expect(createUnavailabilityFormSchema).toBe(dateRangeSchema);
    });
});

describe('addUnavailabilityActionSchema', () => {
    const validAdd = {
        startDate: '2024-01-01',
        endDate: '2024-01-10',
        existingUnavailabilities: []
    };

    it('should validate correct add unavailability data', () => {
        expect(() => addUnavailabilityActionSchema.parse(validAdd)).not.toThrow();
    });

    it('should accept without existingUnavailabilities', () => {
        expect(() => addUnavailabilityActionSchema.parse({
            startDate: '2024-01-01',
            endDate: '2024-01-10'
        })).not.toThrow();
    });

    it('should reject when dates overlap with existing unavailabilities', () => {
        expect(() => addUnavailabilityActionSchema.parse({
            startDate: '2024-01-05',
            endDate: '2024-01-15',
            existingUnavailabilities: [
                { start_date: '2024-01-01', end_date: '2024-01-10' }
            ]
        })).toThrow('chevauche');
    });

    it('should accept when dates do not overlap', () => {
        expect(() => addUnavailabilityActionSchema.parse({
            startDate: '2024-01-15',
            endDate: '2024-01-20',
            existingUnavailabilities: [
                { start_date: '2024-01-01', end_date: '2024-01-10' }
            ]
        })).not.toThrow();
    });

    it('should reject when endDate is before startDate', () => {
        expect(() => addUnavailabilityActionSchema.parse({
            startDate: '2024-01-10',
            endDate: '2024-01-01'
        })).toThrow();
    });
});

describe('deleteUnavailabilityActionSchema', () => {
    it('should validate correct delete unavailability data', () => {
        expect(() => deleteUnavailabilityActionSchema.parse({
            unavailabilityId: validUUID
        })).not.toThrow();
    });

    it('should reject invalid UUID', () => {
        expect(() => deleteUnavailabilityActionSchema.parse({
            unavailabilityId: 'not-a-uuid'
        })).toThrow();
    });

    it('should reject missing unavailabilityId', () => {
        expect(() => deleteUnavailabilityActionSchema.parse({})).toThrow();
    });
});


