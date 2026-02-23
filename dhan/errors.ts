/**
 * Structured error details returned from the Dhan API.
 */
export interface DhanErrorRemarks {
    error_code?: string;
    error_type?: string;
    error_message?: string;
    http_status?: number;
}

/**
 * Base error for all Dhan API-level failures (non-2xx responses).
 */
export class DhanApiError extends Error {
    public readonly errorCode: string;
    public readonly errorType: string;
    public readonly httpStatus: number;

    constructor(remarks: DhanErrorRemarks, message?: string) {
        super(
            message ??
            remarks.error_message ??
            `Dhan API error [${remarks.error_code ?? 'UNKNOWN'}]: ${remarks.error_type ?? ''}`
        );
        this.name = 'DhanApiError';
        this.errorCode = remarks.error_code ?? 'UNKNOWN';
        this.errorType = remarks.error_type ?? 'UNKNOWN';
        this.httpStatus = remarks.http_status ?? 0;
    }
}

/**
 * Thrown on HTTP 401 Unauthorized or 403 Forbidden responses.
 */
export class DhanAuthError extends DhanApiError {
    constructor(remarks: DhanErrorRemarks) {
        super(remarks, `Dhan authentication failed: ${remarks.error_message ?? 'Unauthorized'}`);
        this.name = 'DhanAuthError';
    }
}

/**
 * Thrown when the request cannot reach the server (timeout, DNS failure, etc.).
 */
export class DhanNetworkError extends Error {
    public readonly isTimeout: boolean;

    constructor(message: string, isTimeout = false) {
        super(message);
        this.name = 'DhanNetworkError';
        this.isTimeout = isTimeout;
    }
}

/**
 * Thrown when client-side validation of arguments fails.
 */
export class DhanValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DhanValidationError';
    }
}
