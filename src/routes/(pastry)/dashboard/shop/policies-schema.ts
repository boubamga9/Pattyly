import { z } from 'zod';
import { salesPoliciesSchema } from '$lib/validations/schemas/shop';

export const policiesSchema = salesPoliciesSchema;

export type PoliciesSchema = typeof policiesSchema;

