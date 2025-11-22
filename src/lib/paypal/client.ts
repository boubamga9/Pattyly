// src/lib/paypal/client.ts
// Note: PayPal environment variables are optional - if not configured, PayPal features will be disabled
import type {
    PayPalConfig,
    PayPalAccessToken,
    PayPalPartnerReferralResponse,
    PayPalOrderCreateRequest,
    PayPalOrder,
    PayPalCaptureResponse
} from './types.js';

class PayPalClient {
    private config: PayPalConfig;
    private accessToken: PayPalAccessToken | null = null;

    constructor() {
        // Use dynamic imports to avoid build-time errors if variables are not set
        // These will be loaded at runtime
        this.config = {
            clientId: '',
            clientSecret: '',
            baseUrl: ''
        };
    }

    private async loadConfig() {
        if (this.config.clientId && this.config.clientSecret && this.config.baseUrl) {
            return; // Already loaded
        }

        const { env } = await import('$env/dynamic/private');
        const { env: publicEnv } = await import('$env/dynamic/public');

        this.config = {
            clientId: env.PRIVATE_PAYPAL_CLIENT_ID || '',
            clientSecret: env.PRIVATE_PAYPAL_CLIENT_SECRET || '',
            baseUrl: publicEnv.PUBLIC_PAYPAL_BASE_URL || ''
        };

        if (!this.config.clientId || !this.config.clientSecret || !this.config.baseUrl) {
            throw new Error('PayPal environment variables are not configured');
        }
    }

    /**
     * Get or refresh PayPal access token (public for webhook verification)
     */
    public async getAccessToken(): Promise<string> {
        await this.loadConfig();
        
        // Check if token is still valid (with 5min buffer)
        if (this.accessToken && Date.now() < this.accessToken.expires_at - 300000) {
            return this.accessToken.access_token;
        }

        console.log('Requesting PayPal token from:', `${this.config.baseUrl}/v1/oauth2/token`);

        // Request new token
        const response = await fetch(`${this.config.baseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-Language': 'en_US',
                'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials'
        });

        console.log('PayPal token response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('PayPal token error response:', errorText);
            throw new Error(`PayPal token request failed: ${response.statusText}`);
        }

        const tokenData = await response.json();
        this.accessToken = {
            ...tokenData,
            expires_at: Date.now() + (tokenData.expires_in * 1000)
        };

        return this.accessToken!.access_token;
    }

    /**
     * Create partner referral for onboarding
     */
    async createPartnerReferral(trackingId: string, returnUrl: string): Promise<PayPalPartnerReferralResponse> {
        const accessToken = await this.getAccessToken();

        console.log('Creating Partner Referral with:', {
            trackingId: trackingId.substring(0, 20) + '...',
            returnUrl
        });

        const referralData = {
            tracking_id: trackingId,
            operations: [
                {
                    operation: 'API_INTEGRATION',
                    api_integration_preference: {
                        rest_api_integration: {
                            integration_method: 'PAYPAL',
                            integration_type: 'THIRD_PARTY',
                            third_party_details: {
                                features: ['PARTNER_FEE']
                            }
                        }
                    }
                }
            ],
            partner_config_override: {
                return_url: returnUrl,
                show_add_credit_card: true
            },
            legal_consents: [
                {
                    type: 'SHARE_DATA_CONSENT',
                    granted: true
                }
            ]
        };

        const response = await fetch(`${this.config.baseUrl}/v2/customer/partner-referrals`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'PayPal-Request-Id': trackingId
            },
            body: JSON.stringify(referralData)
        });

        console.log('Partner Referral response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('PayPal Partner Referral error response:', errorText);
            throw new Error(`PayPal partner referral failed: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Create PayPal order for payment
     */
    async createOrder(orderData: PayPalOrderCreateRequest): Promise<PayPalOrder> {
        const accessToken = await this.getAccessToken();

        const response = await fetch(`${this.config.baseUrl}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'PayPal-Request-Id': orderData.purchase_units[0].reference_id
            },
            body: JSON.stringify(orderData)
        });

        if (!response.ok) {
            throw new Error(`PayPal order creation failed: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Capture PayPal order
     */
    async captureOrder(orderId: string): Promise<PayPalCaptureResponse> {
        const accessToken = await this.getAccessToken();

        const response = await fetch(`${this.config.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('PayPal capture error response:', errorText);
            throw new Error(`PayPal order capture failed: ${response.statusText} - ${errorText}`);
        }

        return await response.json();
    }

    /**
     * Get PayPal order details
     */
    async getOrder(orderId: string): Promise<PayPalOrder> {
        const accessToken = await this.getAccessToken();

        const response = await fetch(`${this.config.baseUrl}/v2/checkout/orders/${orderId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`PayPal order fetch failed: ${response.statusText}`);
        }

        return await response.json();
    }
}

// Export singleton instance
export const paypalClient = new PayPalClient();
