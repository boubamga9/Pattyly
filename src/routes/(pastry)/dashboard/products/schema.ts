import { z } from 'zod';
import {
    createCategorySchema,
    updateCategorySchema,
    deleteCategorySchema
} from '$lib/validations/schemas/category';

export const createCategoryFormSchema = createCategorySchema;
export const updateCategoryFormSchema = updateCategorySchema;
export const deleteCategoryFormSchema = deleteCategorySchema;

export type CreateCategoryForm = typeof createCategoryFormSchema;
export type UpdateCategoryForm = typeof updateCategoryFormSchema;
export type DeleteCategoryForm = typeof deleteCategoryFormSchema;
