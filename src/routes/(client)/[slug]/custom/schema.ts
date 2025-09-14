import { createDynamicCustomOrderSchema } from '$lib/validations/schemas/order.js';

// Interface for custom fields
export interface CustomField {
    id: string;
    label: string;
    type: 'short-text' | 'long-text' | 'number' | 'single-select' | 'multi-select';
    required: boolean;
    options?: Array<{ label: string; price?: number }>;
}

// Function to create dynamic schema
export function createLocalDynamicSchema(fields: CustomField[]) {
    return createDynamicCustomOrderSchema(fields);
}
