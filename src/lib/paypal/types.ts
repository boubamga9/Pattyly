// src/lib/paypal/types.ts
export interface PayPalConfig {
    clientId: string;
    clientSecret: string;
    baseUrl: string;
}

export interface PayPalAccessToken {
    access_token: string;
    token_type: string;
    expires_in: number;
    expires_at: number;
}

export interface PayPalPartnerReferral {
    tracking_id: string;
    operations: Array<{
        operation: string;
        api_integration_preference: {
            rest_api_integration: {
                integration_method: string;
                integration_type: string;
            }
        }
    }>;
    products: string[];
    legal_consents: Array<{
        type: string;
        granted: boolean;
    }>;
}

export interface PayPalPartnerReferralResponse {
    links: Array<{
        href: string;
        rel: string;
        method: string;
    }>;
}

export interface PayPalOrder {
    id: string;
    intent: string;
    status: string;
    purchase_units: Array<{
        reference_id: string;
        amount: {
            currency_code: string;
            value: string;
        };
        payee: {
            merchant_id: string;
        };
    }>;
    links: Array<{
        href: string;
        rel: string;
        method: string;
    }>;
}

export interface PayPalOrderCreateRequest {
    intent: string;
    purchase_units: Array<{
        reference_id: string;
        amount: {
            currency_code: string;
            value: string;
        };
        payee: {
            merchant_id: string;
        };
    }>;
    application_context: {
        return_url: string;
        cancel_url: string;
    };
}

export interface PayPalCaptureResponse {
    id: string;
    status: string;
    purchase_units: Array<{
        payments: {
            captures: Array<{
                id: string;
                status: string;
                amount: {
                    currency_code: string;
                    value: string;
                };
            }>;
        };
    }>;
}

export interface PayPalWebhookEvent {
    id: string;
    event_type: string;
    create_time: string;
    resource_type: string;
    resource_version: string;
    event_version: string;
    summary: string;
    resource: any;
    links: Array<{
        href: string;
        rel: string;
        method: string;
    }>;
}
