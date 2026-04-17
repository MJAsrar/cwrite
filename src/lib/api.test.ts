import axios, { type AxiosError, type AxiosResponse } from 'axios';

// Must be `var` — jest.mock() is hoisted above `let`/`const` declarations,
// so only `var` (which is hoisted and initialized as undefined) is accessible
// inside the factory.
var mockAxiosInstance: {
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  delete: jest.Mock;
  interceptors: {
    request: { use: jest.Mock };
    response: { use: jest.Mock };
  };
};

jest.mock('axios', () => {
  mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockAxiosInstance),
    },
  };
});

import { api } from '@/lib/api';

describe('api client retry and error handling', () => {
  // responseErrorHandler is registered once when ApiClient constructs — capture after import.
  const responseErrorHandler = (mockAxiosInstance.interceptors.response.use as jest.Mock)
    .mock.calls[0][1] as (error: any) => Promise<never>;

  let removeItemSpy: jest.SpyInstance;

  beforeEach(() => {
    mockAxiosInstance.get.mockReset();
    mockAxiosInstance.post.mockReset();
    removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');
    jest.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('retries network errors then succeeds', async () => {
    mockAxiosInstance.get
      .mockRejectedValueOnce({ message: 'network-1' } as AxiosError)
      .mockRejectedValueOnce({ message: 'network-2' } as AxiosError)
      .mockResolvedValueOnce({ data: { ok: true } } as AxiosResponse<{ ok: boolean }>);

    const result = await api.get<{ ok: boolean }>('/api/v1/projects');

    expect(result).toEqual({ ok: true });
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
    expect(removeItemSpy).not.toHaveBeenCalled();
  });

  it('does not retry auth errors and returns categorized auth error', async () => {
    const authError = {
      message: 'unauthorized',
      response: { status: 401, data: {} },
    } as AxiosError;

    mockAxiosInstance.get.mockRejectedValueOnce(authError);

    await expect(api.get('/api/v1/auth/me')).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);

    await expect(responseErrorHandler(authError)).rejects.toMatchObject({
      category: 'auth',
      status: 401,
      error: 'api_error',
    });
  });

  it('maps validation detail array into a readable message', async () => {
    const validationError = {
      message: 'validation failed',
      response: {
        status: 422,
        data: {
          detail: [{ loc: ['body', 'name'], msg: 'field required' }],
        },
      },
    } as AxiosError;

    await expect(responseErrorHandler(validationError)).rejects.toMatchObject({
      category: 'validation',
      status: 422,
      detail: [{ loc: ['body', 'name'], msg: 'field required' }],
    });
  });
});
