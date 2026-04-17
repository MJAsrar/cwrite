import axios, { type AxiosError, type AxiosResponse } from 'axios';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(),
        },
        response: {
          use: jest.fn(),
        },
      },
    })),
  },
}));

import { api } from '@/lib/api';

type MockAxiosInstance = {
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  delete: jest.Mock;
  interceptors: {
    request: { use: jest.Mock };
    response: { use: jest.Mock };
  };
};

describe('api client retry and error handling', () => {
  const client = (axios.create as jest.Mock).mock.results[0].value as MockAxiosInstance;
  const mockGet = client.get as jest.Mock<(...args: any[]) => any>;
  const mockPost = client.post as jest.Mock<(...args: any[]) => any>;
  const responseUse = client.interceptors.response.use as jest.Mock<(...args: any[]) => any>;
  const responseErrorHandler = responseUse.mock.calls[0][1] as (error: any) => Promise<never>;
  const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('retries network errors then succeeds', async () => {
    mockGet
      .mockRejectedValueOnce({ message: 'network-1' } as AxiosError)
      .mockRejectedValueOnce({ message: 'network-2' } as AxiosError)
      .mockResolvedValueOnce({ data: { ok: true } } as AxiosResponse<{ ok: boolean }>);

    const result = await api.get<{ ok: boolean }>('/api/v1/projects');

    expect(result).toEqual({ ok: true });
    expect(mockGet).toHaveBeenCalledTimes(3);
    expect(removeItemSpy).not.toHaveBeenCalled();
  });

  it('does not retry auth errors and returns categorized auth error', async () => {
    const authError = {
      message: 'unauthorized',
      response: {
        status: 401,
        data: {},
      },
    } as AxiosError;

    mockGet.mockRejectedValueOnce(authError);

    await expect(api.get('/api/v1/auth/me')).rejects.toMatchObject({
      response: {
        status: 401,
      },
    });
    expect(mockGet).toHaveBeenCalledTimes(1);

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
