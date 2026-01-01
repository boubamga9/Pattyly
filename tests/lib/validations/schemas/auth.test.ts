import { describe, it, expect } from 'vitest';
import {
    loginSchema,
    registerSchema,
    forgotPasswordSchema,
    updateEmailSchema,
    changePasswordSchema,
    createPasswordSchema,
    deleteAccountSchema,
} from '$lib/validations/schemas/auth';

describe('loginSchema', () => {
    const validLogin = {
        email: 'user@example.com',
        password: 'StrongPass123!'
    };

    it('should validate correct login data', () => {
        expect(() => loginSchema.parse(validLogin)).not.toThrow();
    });

    it('should reject invalid email', () => {
        expect(() => loginSchema.parse({
            ...validLogin,
            email: 'not-an-email'
        })).toThrow();
    });

    it('should reject weak password', () => {
        expect(() => loginSchema.parse({
            ...validLogin,
            password: 'weak'
        })).toThrow();
    });

    it('should reject missing email', () => {
        expect(() => loginSchema.parse({
            password: 'StrongPass123!'
        })).toThrow();
    });

    it('should reject missing password', () => {
        expect(() => loginSchema.parse({
            email: 'user@example.com'
        })).toThrow();
    });
});

describe('registerSchema', () => {
    const validRegister = {
        email: 'user@example.com',
        password: 'StrongPass123!'
    };

    it('should validate correct register data', () => {
        expect(() => registerSchema.parse(validRegister)).not.toThrow();
    });

    it('should have the same structure as loginSchema', () => {
        // registerSchema should have the same fields as loginSchema
        expect(() => registerSchema.parse(validRegister)).not.toThrow();
    });
});

describe('forgotPasswordSchema', () => {
    it('should validate correct email', () => {
        expect(() => forgotPasswordSchema.parse({
            email: 'user@example.com'
        })).not.toThrow();
    });

    it('should reject invalid email', () => {
        expect(() => forgotPasswordSchema.parse({
            email: 'not-an-email'
        })).toThrow();
    });

    it('should reject missing email', () => {
        expect(() => forgotPasswordSchema.parse({})).toThrow();
    });
});

describe('updateEmailSchema', () => {
    it('should validate correct email', () => {
        expect(() => updateEmailSchema.parse({
            email: 'newemail@example.com'
        })).not.toThrow();
    });

    it('should reject invalid email', () => {
        expect(() => updateEmailSchema.parse({
            email: 'not-an-email'
        })).toThrow();
    });
});

describe('changePasswordSchema', () => {
    const validChangePassword = {
        old_password: 'OldPass123!',
        new_password: 'NewPass123!',
        confirm_password: 'NewPass123!'
    };

    it('should validate correct change password data', () => {
        expect(() => changePasswordSchema.parse(validChangePassword)).not.toThrow();
    });

    it('should reject when passwords do not match', () => {
        expect(() => changePasswordSchema.parse({
            ...validChangePassword,
            confirm_password: 'DifferentPass123!'
        })).toThrow('ne correspondent pas');
    });

    it('should reject weak old password', () => {
        expect(() => changePasswordSchema.parse({
            old_password: 'weak',
            new_password: 'NewPass123!',
            confirm_password: 'NewPass123!'
        })).toThrow();
    });

    it('should reject weak new password', () => {
        expect(() => changePasswordSchema.parse({
            old_password: 'OldPass123!',
            new_password: 'weak',
            confirm_password: 'weak'
        })).toThrow();
    });

    it('should reject missing fields', () => {
        expect(() => changePasswordSchema.parse({
            old_password: 'OldPass123!',
            new_password: 'NewPass123!'
        })).toThrow();
    });
});

describe('createPasswordSchema', () => {
    const validCreatePassword = {
        new_password: 'NewPass123!',
        confirm_password: 'NewPass123!'
    };

    it('should validate correct create password data', () => {
        expect(() => createPasswordSchema.parse(validCreatePassword)).not.toThrow();
    });

    it('should reject when passwords do not match', () => {
        expect(() => createPasswordSchema.parse({
            new_password: 'NewPass123!',
            confirm_password: 'DifferentPass123!'
        })).toThrow('ne correspondent pas');
    });

    it('should reject weak password', () => {
        expect(() => createPasswordSchema.parse({
            new_password: 'weak',
            confirm_password: 'weak'
        })).toThrow();
    });

    it('should reject missing confirm_password', () => {
        expect(() => createPasswordSchema.parse({
            new_password: 'NewPass123!'
        })).toThrow();
    });
});

describe('deleteAccountSchema', () => {
    it('should validate correct delete account data', () => {
        expect(() => deleteAccountSchema.parse({
            confirmation: 'DELETE'
        })).not.toThrow();
    });

    it('should reject empty confirmation', () => {
        expect(() => deleteAccountSchema.parse({
            confirmation: ''
        })).toThrow('requis');
    });

    it('should reject missing confirmation', () => {
        expect(() => deleteAccountSchema.parse({})).toThrow();
    });
});


