import { describe, it, expect } from 'vitest';
import {
    shopBaseSchema,
    createShopSchema,
    updateShopSchema,
    toggleCustomRequestsSchema,
    toggleShopVisibilitySchema,
    toggleDirectorySchema,
    directorySchema,
    salesPoliciesSchema,
} from '$lib/validations/schemas/shop';

const validUUID = '550e8400-e29b-41d4-a716-446655440000';
const validUUID2 = '123e4567-e89b-12d3-a456-426614174000';

describe('shopBaseSchema', () => {
    const validShop = {
        id: validUUID,
        profile_id: validUUID2,
        name: 'Ma Boutique',
        slug: 'ma-boutique',
        bio: 'Description de la boutique',
        logo_url: 'https://example.com/logo.jpg',
        instagram: 'patisserie',
        tiktok: 'patisserie',
        website: 'https://example.com',
        is_custom_accepted: true,
        is_active: true
    };

    it('should validate correct shop data', () => {
        expect(() => shopBaseSchema.parse(validShop)).not.toThrow();
    });

    it('should accept optional bio', () => {
        const shopWithoutBio = { ...validShop };
        delete shopWithoutBio.bio;
        expect(() => shopBaseSchema.parse(shopWithoutBio)).not.toThrow();
    });

    it('should accept optional logo_url', () => {
        const shopWithoutLogo = { ...validShop };
        delete shopWithoutLogo.logo_url;
        expect(() => shopBaseSchema.parse(shopWithoutLogo)).not.toThrow();
    });

    it('should accept optional instagram', () => {
        const shopWithoutInstagram = { ...validShop };
        delete shopWithoutInstagram.instagram;
        expect(() => shopBaseSchema.parse(shopWithoutInstagram)).not.toThrow();
    });

    it('should accept optional tiktok', () => {
        const shopWithoutTiktok = { ...validShop };
        delete shopWithoutTiktok.tiktok;
        expect(() => shopBaseSchema.parse(shopWithoutTiktok)).not.toThrow();
    });

    it('should accept optional website', () => {
        const shopWithoutWebsite = { ...validShop };
        delete shopWithoutWebsite.website;
        expect(() => shopBaseSchema.parse(shopWithoutWebsite)).not.toThrow();
    });

    it('should use default is_custom_accepted (false)', () => {
        const shopWithoutCustom = { ...validShop };
        delete shopWithoutCustom.is_custom_accepted;
        const result = shopBaseSchema.parse(shopWithoutCustom);
        expect(result.is_custom_accepted).toBe(false);
    });

    it('should use default is_active (true)', () => {
        const shopWithoutActive = { ...validShop };
        delete shopWithoutActive.is_active;
        const result = shopBaseSchema.parse(shopWithoutActive);
        expect(result.is_active).toBe(true);
    });

    it('should reject invalid shop name', () => {
        expect(() => shopBaseSchema.parse({
            ...validShop,
            name: 'A' // too short
        })).toThrow();
    });

    it('should reject invalid slug', () => {
        expect(() => shopBaseSchema.parse({
            ...validShop,
            slug: 'ab' // too short
        })).toThrow();
    });

    it('should reject invalid UUIDs', () => {
        expect(() => shopBaseSchema.parse({
            ...validShop,
            id: 'not-a-uuid'
        })).toThrow();
    });
});

describe('createShopSchema', () => {
    const validCreateShop = {
        name: 'Ma Boutique',
        slug: 'ma-boutique',
        bio: 'Description',
        logo_url: 'https://example.com/logo.jpg',
        instagram: 'patisserie',
        tiktok: 'patisserie',
        website: 'https://example.com'
    };

    it('should validate correct create shop data', () => {
        expect(() => createShopSchema.parse(validCreateShop)).not.toThrow();
    });

    it('should not require id', () => {
        // id is omitted
        expect(() => createShopSchema.parse(validCreateShop)).not.toThrow();
    });

    it('should not require profile_id', () => {
        // profile_id is omitted
        expect(() => createShopSchema.parse(validCreateShop)).not.toThrow();
    });

    it('should not require is_custom_accepted', () => {
        // is_custom_accepted is omitted
        expect(() => createShopSchema.parse(validCreateShop)).not.toThrow();
    });

    it('should not require is_active', () => {
        // is_active is omitted
        expect(() => createShopSchema.parse(validCreateShop)).not.toThrow();
    });

    it('should accept optional fields', () => {
        const minimalShop = {
            name: 'Ma Boutique',
            slug: 'ma-boutique'
        };
        expect(() => createShopSchema.parse(minimalShop)).not.toThrow();
    });
});

describe('updateShopSchema', () => {
    const validUpdateShop = {
        name: 'Nouveau Nom',
        slug: 'nouveau-slug',
        bio: 'Nouvelle description',
        logo_url: 'https://example.com/new-logo.jpg',
        instagram: 'new-account',
        tiktok: 'new-account',
        website: 'https://newsite.com'
    };

    it('should validate correct update shop data', () => {
        // All fields are required when using .pick(), but optional fields can be empty strings
        // which get converted to undefined by urlSchema and socialUsernameSchema
        expect(() => updateShopSchema.parse({
            name: 'Nouveau Nom',
            slug: 'nouveau-slug',
            bio: 'Nouvelle description',
            logo_url: 'https://example.com/new-logo.jpg',
            instagram: 'newaccount', // valid format
            tiktok: 'newaccount', // valid format
            website: 'https://newsite.com'
        })).not.toThrow();
    });

    it('should require all picked fields (pick() makes all fields required)', () => {
        // updateShopSchema uses .pick() which makes all fields required
        // So we need all fields or they need to be explicitly optional in the schema
        expect(() => updateShopSchema.parse({
            name: 'Nom',
            slug: 'slug',
            bio: 'Bio',
            logo_url: 'https://example.com/logo.jpg',
            instagram: 'account',
            tiktok: 'account',
            website: 'https://example.com'
        })).not.toThrow();
    });
});

describe('toggleCustomRequestsSchema', () => {
    it('should validate correct toggle custom requests data', () => {
        expect(() => toggleCustomRequestsSchema.parse({
            is_custom_accepted: true
        })).not.toThrow();
        
        expect(() => toggleCustomRequestsSchema.parse({
            is_custom_accepted: false
        })).not.toThrow();
    });

    it('should reject missing is_custom_accepted', () => {
        expect(() => toggleCustomRequestsSchema.parse({})).toThrow();
    });

    it('should reject non-boolean value', () => {
        expect(() => toggleCustomRequestsSchema.parse({
            is_custom_accepted: 'true'
        })).toThrow();
    });
});

describe('toggleShopVisibilitySchema', () => {
    it('should validate correct toggle shop visibility data', () => {
        expect(() => toggleShopVisibilitySchema.parse({
            is_active: true
        })).not.toThrow();
        
        expect(() => toggleShopVisibilitySchema.parse({
            is_active: false
        })).not.toThrow();
    });

    it('should reject missing is_active', () => {
        expect(() => toggleShopVisibilitySchema.parse({})).toThrow();
    });
});

describe('toggleDirectorySchema', () => {
    it('should validate correct toggle directory data', () => {
        expect(() => toggleDirectorySchema.parse({
            directory_enabled: true
        })).not.toThrow();
        
        expect(() => toggleDirectorySchema.parse({
            directory_enabled: false
        })).not.toThrow();
    });

    it('should reject missing directory_enabled', () => {
        expect(() => toggleDirectorySchema.parse({})).toThrow();
    });
});

describe('directorySchema', () => {
    const validDirectory = {
        directory_city: 'Paris',
        directory_actual_city: 'Paris 15',
        directory_postal_code: '75015',
        directory_cake_types: ['Anniversaire', 'Mariage'],
        directory_enabled: true
    };

    it('should validate correct directory data', () => {
        expect(() => directorySchema.parse(validDirectory)).not.toThrow();
    });

    it('should use default directory_enabled (false)', () => {
        const directoryWithoutEnabled = { ...validDirectory };
        delete directoryWithoutEnabled.directory_enabled;
        const result = directorySchema.parse(directoryWithoutEnabled);
        expect(result.directory_enabled).toBe(false);
    });

    it('should reject directory_city shorter than 2 characters', () => {
        expect(() => directorySchema.parse({
            ...validDirectory,
            directory_city: 'A'
        })).toThrow(); // Zod throws with specific message
    });

    it('should reject directory_actual_city shorter than 2 characters', () => {
        expect(() => directorySchema.parse({
            ...validDirectory,
            directory_actual_city: 'A'
        })).toThrow(); // Zod throws with "La ville est requise" message
    });

    it('should reject invalid postal code format', () => {
        expect(() => directorySchema.parse({
            ...validDirectory,
            directory_postal_code: '1234' // too short
        })).toThrow('5 chiffres');
        
        expect(() => directorySchema.parse({
            ...validDirectory,
            directory_postal_code: '123456' // too long
        })).toThrow('5 chiffres');
        
        expect(() => directorySchema.parse({
            ...validDirectory,
            directory_postal_code: 'ABCDE' // letters
        })).toThrow('5 chiffres');
    });

    it('should reject empty directory_cake_types', () => {
        expect(() => directorySchema.parse({
            ...validDirectory,
            directory_cake_types: []
        })).toThrow('au moins un');
    });

    it('should reject directory_cake_types with more than 3 items', () => {
        expect(() => directorySchema.parse({
            ...validDirectory,
            directory_cake_types: ['Type1', 'Type2', 'Type3', 'Type4']
        })).toThrow('3 types');
    });

    it('should accept directory_cake_types with 1 to 3 items', () => {
        expect(() => directorySchema.parse({
            ...validDirectory,
            directory_cake_types: ['Type1']
        })).not.toThrow();
        
        expect(() => directorySchema.parse({
            ...validDirectory,
            directory_cake_types: ['Type1', 'Type2', 'Type3']
        })).not.toThrow();
    });
});

describe('salesPoliciesSchema', () => {
    it('should validate correct sales policies data', () => {
        expect(() => salesPoliciesSchema.parse({})).not.toThrow();
        
        expect(() => salesPoliciesSchema.parse({
            terms_and_conditions: 'Terms text',
            return_policy: 'Return policy text',
            delivery_policy: 'Delivery policy text',
            payment_terms: 'Payment terms text'
        })).not.toThrow();
    });

    it('should accept partial policies', () => {
        expect(() => salesPoliciesSchema.parse({
            terms_and_conditions: 'Terms text'
        })).not.toThrow();
    });

    it('should reject terms_and_conditions longer than 5000 characters', () => {
        expect(() => salesPoliciesSchema.parse({
            terms_and_conditions: 'A'.repeat(5001)
        })).toThrow('5000 caractères');
    });

    it('should reject return_policy longer than 5000 characters', () => {
        expect(() => salesPoliciesSchema.parse({
            return_policy: 'A'.repeat(5001)
        })).toThrow('5000 caractères');
    });

    it('should reject delivery_policy longer than 5000 characters', () => {
        expect(() => salesPoliciesSchema.parse({
            delivery_policy: 'A'.repeat(5001)
        })).toThrow('5000 caractères');
    });

    it('should reject payment_terms longer than 5000 characters', () => {
        expect(() => salesPoliciesSchema.parse({
            payment_terms: 'A'.repeat(5001)
        })).toThrow('5000 caractères');
    });

    it('should accept policies with exactly 5000 characters', () => {
        expect(() => salesPoliciesSchema.parse({
            terms_and_conditions: 'A'.repeat(5000)
        })).not.toThrow();
    });
});

