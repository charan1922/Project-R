/**
 * DhanHTTP — Axios-powered HTTP client for the DhanHQ API v2.
 *
 * Replaces the original native-fetch implementation with axios for:
 *  - Automatic JSON serialization / deserialization
 *  - Typed request/response interceptors for auth header injection
 *  - Richer error introspection (AxiosError vs generic Error)
 *  - Interceptor-based parsing of Dhan error envelopes into typed errors
 */

import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { DhanApiError, DhanAuthError, DhanNetworkError, DhanErrorRemarks } from './errors';

const BASE_URL_PROD = 'https://api.dhan.co/v2';
const BASE_URL_SANDBOX = 'https://sandbox.dhan.co/v2';

// ─── Response types ───────────────────────────────────────────────────────────

/** Successful response from the Dhan API. */
export interface DhanSuccess<T> {
    status: 'success';
    data: T;
    remarks?: never;
}

/** Failed response — either API-level or client-side validation. */
export interface DhanFailure {
    status: 'failure';
    data: null;
    remarks: DhanErrorRemarks | string;
}

/**
 * Discriminated union response type.
 * Narrow with `if (res.status === 'success')`.
 */
export type DhanResponse<T> = DhanSuccess<T> | DhanFailure;

/** Convenience failure factory. */
export function failureResponse(remarks: DhanErrorRemarks | string): DhanFailure {
    return { status: 'failure', data: null, remarks };
}

// ─── DhanHTTP ─────────────────────────────────────────────────────────────────

export class DhanHTTP {
    private readonly clientId: string;
    private readonly axiosInstance: AxiosInstance;

    constructor(
        clientId: string,
        accessToken: string,
        environment: 'sandbox' | 'prod' = 'prod',
        timeoutMs = 60_000
    ) {
        this.clientId = clientId;
        const baseURL = environment === 'sandbox' ? BASE_URL_SANDBOX : BASE_URL_PROD;

        this.axiosInstance = axios.create({
            baseURL,
            timeout: timeoutMs,
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        });

        // ── Request interceptor: inject auth headers on every call ───────────
        this.axiosInstance.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                config.headers['access-token'] = accessToken;
                config.headers['client-id'] = clientId;
                return config;
            },
            (error: unknown) => Promise.reject(error)
        );

        // ── Response interceptor: parse Dhan error envelopes ─────────────────
        this.axiosInstance.interceptors.response.use(
            (response: AxiosResponse) => response,
            (error: unknown) => {
                if (axios.isAxiosError(error)) {
                    const axiosErr = error as AxiosError<Record<string, unknown>>;
                    const data = axiosErr.response?.data;
                    const httpStatus = axiosErr.response?.status;

                    // Timeout / network failure (no response)
                    if (!axiosErr.response) {
                        const isTimeout = axiosErr.code === 'ECONNABORTED';
                        throw new DhanNetworkError(
                            isTimeout
                                ? `Request timed out: ${axiosErr.config?.url ?? ''}`
                                : `Network error: ${axiosErr.message}`,
                            isTimeout
                        );
                    }

                    const remarks: DhanErrorRemarks = {
                        error_code: typeof data?.['errorCode'] === 'string' ? data['errorCode'] : undefined,
                        error_type: typeof data?.['errorType'] === 'string' ? data['errorType'] : undefined,
                        error_message: typeof data?.['errorMessage'] === 'string' ? data['errorMessage'] : axiosErr.message,
                        http_status: httpStatus,
                    };

                    if (httpStatus === 401 || httpStatus === 403) {
                        throw new DhanAuthError(remarks);
                    }

                    throw new DhanApiError(remarks);
                }
                return Promise.reject(error);
            }
        );
    }

    // ─── Public HTTP verbs ────────────────────────────────────────────────────

    public async get<T = Record<string, unknown>>(endpoint: string): Promise<DhanResponse<T>> {
        const resp = await this.axiosInstance.get<T>(endpoint);
        return { status: 'success', data: resp.data };
    }

    public async post<T = Record<string, unknown>>(
        endpoint: string,
        payload?: Record<string, unknown>
    ): Promise<DhanResponse<T>> {
        const body = { ...(payload ?? {}), dhanClientId: this.clientId };
        const resp = await this.axiosInstance.post<T>(endpoint, body);
        return { status: 'success', data: resp.data };
    }

    public async put<T = Record<string, unknown>>(
        endpoint: string,
        payload?: Record<string, unknown>
    ): Promise<DhanResponse<T>> {
        const body = { ...(payload ?? {}), dhanClientId: this.clientId };
        const resp = await this.axiosInstance.put<T>(endpoint, body);
        return { status: 'success', data: resp.data };
    }

    public async delete<T = Record<string, unknown>>(endpoint: string): Promise<DhanResponse<T>> {
        const resp = await this.axiosInstance.delete<T>(endpoint);
        return { status: 'success', data: resp.data };
    }

    /**
     * POST with raw body (no automatic clientId injection).
     * Used for endpoints like /killswitch that use URL query params.
     */
    public async postRaw<T = Record<string, unknown>>(
        endpoint: string,
        payload?: Record<string, unknown>
    ): Promise<DhanResponse<T>> {
        const resp = await this.axiosInstance.post<T>(endpoint, payload ?? {});
        return { status: 'success', data: resp.data };
    }
}
