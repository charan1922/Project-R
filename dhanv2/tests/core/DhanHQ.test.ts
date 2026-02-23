import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { DhanHQ, APIError } from '../../src/core/DhanHQ.js';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

// Helper to build a mock AxiosInstance
function buildMockClient(overrides?: Record<string, unknown>) {
    const instance = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() },
        },
        ...overrides,
    };
    mockedAxios.create = vi.fn().mockReturnValue(instance);
    return instance;
}

describe('DhanHQ core', () => {
    beforeEach(() => vi.clearAllMocks());

    it('creates an axios instance with the correct prod baseURL', () => {
        buildMockClient();
        new DhanHQ('CUST', 'TOKEN', 'prod');
        expect(mockedAxios.create).toHaveBeenCalledWith(
            expect.objectContaining({ baseURL: 'https://api.dhan.co/v2' })
        );
    });

    it('creates an axios instance with the correct sandbox baseURL', () => {
        buildMockClient();
        new DhanHQ('CUST', 'TOKEN', 'sandbox');
        expect(mockedAxios.create).toHaveBeenCalledWith(
            expect.objectContaining({ baseURL: 'https://sandbox-api.dhan.co/v2' })
        );
    });

    it('registers both request and response interceptors', () => {
        const client = buildMockClient();
        new DhanHQ('CUST', 'TOKEN');
        expect(client.interceptors.request.use).toHaveBeenCalledTimes(1);
        expect(client.interceptors.response.use).toHaveBeenCalledTimes(1);
    });

    it('defaults to prod environment', () => {
        buildMockClient();
        new DhanHQ('CUST', 'TOKEN');
        expect(mockedAxios.create).toHaveBeenCalledWith(
            expect.objectContaining({ baseURL: 'https://api.dhan.co/v2' })
        );
    });
});

describe('APIError', () => {
    it('extends Error', () => {
        const e = new APIError('INPUT_EXCEPTION', 'DH-905', 'bad input', 400);
        expect(e).toBeInstanceOf(Error);
        expect(e).toBeInstanceOf(APIError);
    });

    it('has correct name', () => {
        const e = new APIError('T', 'C', 'M');
        expect(e.name).toBe('APIError');
    });

    it('exposes errorType and errorCode', () => {
        const e = new APIError('Order_Error', 'DH-906', 'Market closed', 422);
        expect(e.errorType).toBe('Order_Error');
        expect(e.errorCode).toBe('DH-906');
        expect(e.httpStatus).toBe(422);
    });

    it('message equals errorMessage arg', () => {
        const e = new APIError('T', 'C', 'something went wrong');
        expect(e.message).toBe('something went wrong');
    });

    it('works without httpStatus', () => {
        const e = new APIError('T', 'C', 'msg');
        expect(e.httpStatus).toBeUndefined();
    });

    it('instanceof check survives transpiler prototype issue (setPrototypeOf fix)', () => {
        function throwAndCatch(): boolean {
            try { throw new APIError('T', 'C', 'M'); }
            catch (err) { return err instanceof APIError; }
            return false;
        }
        expect(throwAndCatch()).toBe(true);
    });
});
