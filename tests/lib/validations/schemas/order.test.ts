import { describe, it, expect } from 'vitest';
import {
    orderStatusSchema,
    refusedBySchema,
    createDynamicCustomOrderSchema,
    createDynamicProductOrderSchema,
    updateOrderStatusSchema,
    sendQuoteSchema,
    refuseOrderSchema,
} from '$lib/validations/schemas/order';

describe('orderStatusSchema', () => {
    it('should validate valid order statuses', () => {
        expect(() => orderStatusSchema.parse('pending')).not.toThrow();
        expect(() => orderStatusSchema.parse('quoted')).not.toThrow();
        expect(() => orderStatusSchema.parse('confirmed')).not.toThrow();
        expect(() => orderStatusSchema.parse('ready')).not.toThrow();
        expect(() => orderStatusSchema.parse('refused')).not.toThrow();
        expect(() => orderStatusSchema.parse('completed')).not.toThrow();
    });

    it('should reject invalid order status', () => {
        expect(() => orderStatusSchema.parse('invalid')).toThrow();
        expect(() => orderStatusSchema.parse('')).toThrow();
    });
});

describe('refusedBySchema', () => {
    it('should validate valid refused_by values', () => {
        expect(() => refusedBySchema.parse('pastry_chef')).not.toThrow();
        expect(() => refusedBySchema.parse('client')).not.toThrow();
    });

    it('should reject invalid refused_by value', () => {
        expect(() => refusedBySchema.parse('invalid')).toThrow();
        expect(() => refusedBySchema.parse('')).toThrow();
    });
});

describe('createDynamicCustomOrderSchema', () => {
    const baseFields = [
        { id: 'field1', label: 'Field 1', type: 'short-text' as const, required: false }
    ];

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const futureDateString = futureDate.toISOString().split('T')[0];

    it('should validate correct custom order', () => {
        const schema = createDynamicCustomOrderSchema(baseFields);
        const validOrder = {
            customer_name: 'John Doe',
            customer_email: 'john@example.com',
            pickup_date: futureDateString,
            pickup_time: '09:00',
            customization_data: {
                field1: 'value'
            }
        };

        expect(() => schema.parse(validOrder)).not.toThrow();
    });

    it('should require customer_name', () => {
        const schema = createDynamicCustomOrderSchema(baseFields);
        const invalidOrder = {
            customer_email: 'john@example.com',
            pickup_date: futureDateString,
            pickup_time: '09:00',
            customization_data: {
                field1: 'value'
            }
        };

        expect(() => schema.parse(invalidOrder)).toThrow();
    });

    it('should require customer_email', () => {
        const schema = createDynamicCustomOrderSchema(baseFields);
        const invalidOrder = {
            customer_name: 'John Doe',
            pickup_date: futureDateString,
            pickup_time: '09:00',
            customization_data: {
                field1: 'value'
            }
        };

        expect(() => schema.parse(invalidOrder)).toThrow();
    });

    it('should require pickup_date', () => {
        const schema = createDynamicCustomOrderSchema(baseFields);
        const invalidOrder = {
            customer_name: 'John Doe',
            customer_email: 'john@example.com',
            pickup_time: '09:00',
            customization_data: {
                field1: 'value'
            }
        };

        expect(() => schema.parse(invalidOrder)).toThrow();
    });

    it('should require pickup_time', () => {
        const schema = createDynamicCustomOrderSchema(baseFields);
        const invalidOrder = {
            customer_name: 'John Doe',
            customer_email: 'john@example.com',
            pickup_date: futureDateString,
            customization_data: {
                field1: 'value'
            }
        };

        expect(() => schema.parse(invalidOrder)).toThrow();
    });

    it('should accept optional customer_phone', () => {
        const schema = createDynamicCustomOrderSchema(baseFields);
        const validOrder = {
            customer_name: 'John Doe',
            customer_email: 'john@example.com',
            pickup_date: futureDateString,
            pickup_time: '09:00',
            customer_phone: '0123456789',
            customization_data: {
                field1: 'value'
            }
        };

        expect(() => schema.parse(validOrder)).not.toThrow();
    });

    it('should accept optional customer_instagram', () => {
        const schema = createDynamicCustomOrderSchema(baseFields);
        const validOrder = {
            customer_name: 'John Doe',
            customer_email: 'john@example.com',
            pickup_date: futureDateString,
            pickup_time: '09:00',
            customer_instagram: '@johndoe',
            customization_data: {
                field1: 'value'
            }
        };

        expect(() => schema.parse(validOrder)).not.toThrow();
    });

    it('should accept optional additional_information', () => {
        const schema = createDynamicCustomOrderSchema(baseFields);
        const validOrder = {
            customer_name: 'John Doe',
            customer_email: 'john@example.com',
            pickup_date: futureDateString,
            pickup_time: '09:00',
            additional_information: 'Some info',
            customization_data: {
                field1: 'value'
            }
        };

        expect(() => schema.parse(validOrder)).not.toThrow();
    });

    it('should validate customization_data with fields', () => {
        const schema = createDynamicCustomOrderSchema([
            { id: 'field1', label: 'Field 1', type: 'short-text' as const, required: true }
        ]);

        const validOrder = {
            customer_name: 'John Doe',
            customer_email: 'john@example.com',
            pickup_date: futureDateString,
            pickup_time: '09:00',
            customization_data: {
                field1: 'value'
            }
        };

        expect(() => schema.parse(validOrder)).not.toThrow();
    });

    it('should reject past date', () => {
        const schema = createDynamicCustomOrderSchema(baseFields);
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        const pastDateString = pastDate.toISOString().split('T')[0];

        const invalidOrder = {
            customer_name: 'John Doe',
            customer_email: 'john@example.com',
            pickup_date: pastDateString,
            pickup_time: '09:00',
            customization_data: {
                field1: 'value'
            }
        };

        expect(() => schema.parse(invalidOrder)).toThrow();
    });
});

describe('createDynamicProductOrderSchema', () => {
    const baseFields = [
        { id: 'field1', label: 'Field 1', type: 'short-text' as const, required: false }
    ];

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const futureDateString = futureDate.toISOString().split('T')[0];

    it('should validate correct product order', () => {
        const schema = createDynamicProductOrderSchema(baseFields);
        const validOrder = {
            customer_name: 'John Doe',
            customer_email: 'john@example.com',
            pickup_date: futureDateString,
            pickup_time: '09:00',
            customization_data: {
                field1: 'value'
            }
        };

        expect(() => schema.parse(validOrder)).not.toThrow();
    });

    it('should have same validation as custom order', () => {
        const schema = createDynamicProductOrderSchema(baseFields);
        const invalidOrder = {
            customer_email: 'john@example.com',
            pickup_date: futureDateString,
            pickup_time: '09:00',
            customization_data: {
                field1: 'value'
            }
        };

        expect(() => schema.parse(invalidOrder)).toThrow();
    });
});

describe('updateOrderStatusSchema', () => {
    it('should validate correct status update', () => {
        expect(() => updateOrderStatusSchema.parse({ status: 'pending' })).not.toThrow();
        expect(() => updateOrderStatusSchema.parse({ status: 'quoted' })).not.toThrow();
        expect(() => updateOrderStatusSchema.parse({ status: 'confirmed' })).not.toThrow();
        expect(() => updateOrderStatusSchema.parse({ status: 'ready' })).not.toThrow();
        expect(() => updateOrderStatusSchema.parse({ status: 'refused' })).not.toThrow();
        expect(() => updateOrderStatusSchema.parse({ status: 'completed' })).not.toThrow();
    });

    it('should reject missing status', () => {
        expect(() => updateOrderStatusSchema.parse({})).toThrow();
    });

    it('should reject invalid status', () => {
        expect(() => updateOrderStatusSchema.parse({ status: 'invalid' })).toThrow();
    });
});

describe('sendQuoteSchema', () => {
    it('should validate correct quote', () => {
        expect(() => sendQuoteSchema.parse({
            total_amount: 5000
        })).not.toThrow();
    });

    it('should accept optional chef_message', () => {
        expect(() => sendQuoteSchema.parse({
            total_amount: 5000,
            chef_message: 'Message from chef'
        })).not.toThrow();
    });

    it('should reject missing total_amount', () => {
        expect(() => sendQuoteSchema.parse({
            chef_message: 'Message'
        })).toThrow();
    });

    it('should reject negative total_amount', () => {
        expect(() => sendQuoteSchema.parse({
            total_amount: -100
        })).toThrow();
    });

    it('should reject total_amount that is too high', () => {
        expect(() => sendQuoteSchema.parse({
            total_amount: 10000001
        })).toThrow();
    });
});

describe('refuseOrderSchema', () => {
    it('should validate correct refusal', () => {
        expect(() => refuseOrderSchema.parse({
            refused_by: 'pastry_chef'
        })).not.toThrow();
    });

    it('should accept optional chef_message', () => {
        expect(() => refuseOrderSchema.parse({
            refused_by: 'pastry_chef',
            chef_message: 'Message from chef'
        })).not.toThrow();
    });

    it('should reject missing refused_by', () => {
        expect(() => refuseOrderSchema.parse({
            chef_message: 'Message'
        })).toThrow();
    });

    it('should reject refused_by client', () => {
        expect(() => refuseOrderSchema.parse({
            refused_by: 'client'
        })).toThrow();
    });

    it('should only accept pastry_chef', () => {
        expect(() => refuseOrderSchema.parse({
            refused_by: 'pastry_chef'
        })).not.toThrow();
    });
});

