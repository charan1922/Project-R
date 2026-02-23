/**
 * DhanHQ — Core Class
 * Primary client combining all REST endpoint modules with axios interceptors.
 * Mirrors the DhanContext architecture from the Python SDK (v2.2.0).
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL_PROD = 'https://api.dhan.co/v2';
const BASE_URL_SANDBOX = 'https://sandbox-api.dhan.co/v2';

// ─── APIError ────────────────────────────────────────────────────────────────

/**
 * Typed error class for all API-level failures returned by DhanHQ servers.
 * Extends the native Error so it can be caught with `instanceof Error` as well.
 */
export class APIError extends Error {
    public readonly errorType: string;
    public readonly errorCode: string;
    public readonly httpStatus?: number;

    constructor(
        errorType: string,
        errorCode: string,
        errorMessage: string,
        httpStatus?: number
    ) {
        super(errorMessage);
        this.name = 'APIError';
        this.errorType = errorType;
        this.errorCode = errorCode;
        this.httpStatus = httpStatus;
        Object.setPrototypeOf(this, new.target.prototype);
    }

    public toString(): string {
        return `APIError[${this.errorCode}] (${this.errorType}): ${this.message}`;
    }
}

// ─── DhanContext (credential store) ──────────────────────────────────────────

/**
 * Secure container for DhanHQ client credentials.
 * Mirrors the Python SDK's DhanContext to prevent credential leakage.
 */
export class DhanContext {
    private readonly _clientId: string;
    private readonly _accessToken: string;

    constructor(clientId: string, accessToken: string) {
        this._clientId = clientId;
        this._accessToken = accessToken;
    }

    get clientId(): string { return this._clientId; }
    get accessToken(): string { return this._accessToken; }
}

// ─── DhanHQ ──────────────────────────────────────────────────────────────────

/**
 * Main DhanHQ SDK client.
 *
 * @example
 * ```typescript
 * import { DhanHQ, ExchangeSegment, TransactionType, ProductType, OrderType, Validity } from 'dhanhq-ts';
 * const dhan = new DhanHQ('YOUR_CLIENT_ID', 'YOUR_ACCESS_TOKEN');
 * const order = await dhan.placeOrder({ ... });
 * ```
 */
export class DhanHQ {
    private readonly context: DhanContext;

    /** Pre-configured axios instance with auth interceptors baked in. */
    public readonly http: AxiosInstance;

    constructor(
        clientId: string,
        accessToken: string,
        environment: 'prod' | 'sandbox' = 'prod'
    ) {
        this.context = new DhanContext(clientId, accessToken);
        const baseURL = environment === 'sandbox' ? BASE_URL_SANDBOX : BASE_URL_PROD;

        this.http = axios.create({ baseURL, timeout: 30_000 });

        // ── Request interceptor: inject auth headers ─────────────────────────────
        this.http.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                config.headers['access-token'] = this.context.accessToken;
                config.headers['client-id'] = this.context.clientId;
                config.headers['Content-Type'] = 'application/json';
                return config;
            },
            (error: unknown) => Promise.reject(error)
        );

        // ── Response interceptor: parse Dhan error envelopes ────────────────────
        this.http.interceptors.response.use(
            (response: import('axios').AxiosResponse) => response,
            (error: unknown) => {
                if (axios.isAxiosError(error)) {
                    const axiosErr = error as AxiosError<{
                        errorType?: string;
                        errorCode?: string;
                        errorMessage?: string;
                        message?: string;
                    }>;

                    const data = axiosErr.response?.data;
                    const httpStatus = axiosErr.response?.status;

                    if (data && (data.errorCode ?? data.errorType)) {
                        throw new APIError(
                            data.errorType ?? 'UNKNOWN',
                            data.errorCode ?? 'UNKNOWN',
                            data.errorMessage ?? data.message ?? 'Unknown API error',
                            httpStatus
                        );
                    }

                    // Generic HTTP error (network failure, timeout, etc.)
                    throw new APIError(
                        'NETWORK_ERROR',
                        String(httpStatus ?? 'UNKNOWN'),
                        axiosErr.message,
                        httpStatus
                    );
                }

                return Promise.reject(error);
            }
        );
    }

    /** The client ID this instance was initialized with. */
    get clientId(): string { return this.context.clientId; }

    // ─── Convenience utility ─────────────────────────────────────────────────

    /**
     * Convert UNIX epoch (seconds) to a JavaScript Date in IST.
     */
    static epochToDate(epoch: number): Date {
        return new Date(epoch * 1000);
    }
}
