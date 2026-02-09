import { beforeEach, describe, expect, it, vi } from 'vitest';

type TokenClientConfig = {
  client_id: string;
  scope: string;
  callback: (tokenResponse: {
    access_token: string;
    token_type: string;
    expires_in: number;
  }) => void;
};

const setupGoogleApis = () => {
  let latestTokenConfig: TokenClientConfig | null = null;

  const requestAccessTokenMock = vi.fn(() => {
    latestTokenConfig?.callback({
      access_token: 'token-123',
      token_type: 'Bearer',
      expires_in: 3600,
    });
  });

  const initTokenClientMock = vi.fn((config: TokenClientConfig) => {
    latestTokenConfig = config;
    return {
      requestAccessToken: requestAccessTokenMock,
    };
  });

  const initMock = vi.fn().mockResolvedValue(undefined);
  const createMock = vi.fn().mockResolvedValue({
    result: {
      spreadsheetId: 'sheet-1',
      spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/sheet-1',
      properties: { title: 'Sheet' },
    },
  });
  const updateMock = vi.fn().mockResolvedValue({
    result: { updatedCells: 3, updatedColumns: 1, updatedRows: 2 },
  });
  const loadMock = vi.fn((_libraries: string, callback: () => void) =>
    callback()
  );

  Object.defineProperty(window, 'google', {
    value: {
      accounts: {
        oauth2: {
          initTokenClient: initTokenClientMock,
        },
      },
    },
    configurable: true,
    writable: true,
  });

  Object.defineProperty(window, 'gapi', {
    value: {
      load: loadMock,
      client: {
        init: initMock,
        sheets: {
          spreadsheets: {
            create: createMock,
            values: {
              update: updateMock,
            },
          },
        },
      },
    },
    configurable: true,
    writable: true,
  });

  return {
    initTokenClientMock,
    requestAccessTokenMock,
    initMock,
    createMock,
    updateMock,
    getLatestTokenConfig: () => latestTokenConfig,
  };
};

describe('GoogleSheetsService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes Google APIs when scripts are already available', async () => {
    const { initMock, initTokenClientMock } = setupGoogleApis();
    const { default: GoogleSheetsService } = await import('./googleSheetsApi');
    const service = new GoogleSheetsService('client-id');

    await service.initialize();

    expect(initMock).toHaveBeenCalledWith({
      discoveryDocs: [
        'https://sheets.googleapis.com/$discovery/rest?version=v4',
      ],
    });
    expect(initTokenClientMock).toHaveBeenCalled();
  });

  it('authorizes and stores token in memory', async () => {
    const { requestAccessTokenMock } = setupGoogleApis();
    const { default: GoogleSheetsService } = await import('./googleSheetsApi');
    const service = new GoogleSheetsService('client-id');

    await service.initialize();
    const token = await service.authorize();

    expect(requestAccessTokenMock).toHaveBeenCalledTimes(1);
    expect(token).toBe('token-123');
    expect(service.isAuthorized()).toBe(true);
  });

  it('updates in-memory token from initialize token-client callback', async () => {
    const { getLatestTokenConfig } = setupGoogleApis();
    const { default: GoogleSheetsService } = await import('./googleSheetsApi');
    const service = new GoogleSheetsService('client-id');
    await service.initialize();

    getLatestTokenConfig()?.callback({
      access_token: 'token-from-init',
      token_type: 'Bearer',
      expires_in: 3600,
    });

    expect(service.isAuthorized()).toBe(true);
  });

  it('rejects authorization when service is not initialized', async () => {
    setupGoogleApis();
    const { default: GoogleSheetsService } = await import('./googleSheetsApi');
    const service = new GoogleSheetsService('client-id');

    await expect(service.authorize()).rejects.toThrow(
      'Google Sheets service not initialized'
    );
  });

  it('creates spreadsheet with data after authorization', async () => {
    const { createMock, updateMock } = setupGoogleApis();
    const { default: GoogleSheetsService } = await import('./googleSheetsApi');
    const service = new GoogleSheetsService('client-id');
    await service.initialize();
    await service.authorize();

    const result = await service.createSpreadsheetWithData(
      'Laporan',
      ['Nama', 'Qty'],
      [['Paracetamol', 2]]
    );

    expect(createMock).toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        spreadsheetId: 'sheet-1',
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
      })
    );
    expect(result.spreadsheetUrl).toContain('docs.google.com/spreadsheets');
  });

  it('throws unauthorized error when creating spreadsheet without token', async () => {
    setupGoogleApis();
    const { default: GoogleSheetsService } = await import('./googleSheetsApi');
    const service = new GoogleSheetsService('client-id');

    await expect(
      service.createSpreadsheetWithData('Laporan', ['A'], [['1']])
    ).rejects.toThrow('Not authorized. Please call authorize() first.');
  });

  it('exports data and wraps auth-expired errors', async () => {
    setupGoogleApis();
    const { default: GoogleSheetsService } = await import('./googleSheetsApi');
    const service = new GoogleSheetsService('client-id');
    await service.initialize();

    const createSpy = vi
      .spyOn(service, 'createSpreadsheetWithData')
      .mockRejectedValueOnce(new Error('401 unauthorized'));

    await expect(
      service.exportGridDataToSheets([['a']], ['col'], 'file')
    ).rejects.toThrow('Authentication token expired. Please try again.');

    expect(createSpy).toHaveBeenCalled();
    expect(service.isAuthorized()).toBe(false);
  });

  it('clears token state', async () => {
    setupGoogleApis();
    const { default: GoogleSheetsService } = await import('./googleSheetsApi');
    const service = new GoogleSheetsService('client-id');
    await service.initialize();
    await service.authorize();

    sessionStorage.setItem('google_sheets_access_token', 'legacy-token');
    service.clearToken();

    expect(sessionStorage.getItem('google_sheets_access_token')).toBeNull();
    expect(service.isAuthorized()).toBe(false);
  });

  it('loads GIS script when google accounts object is unavailable', async () => {
    const { initMock } = setupGoogleApis();
    Object.defineProperty(window, 'google', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const appendSpy = vi
      .spyOn(document.head, 'appendChild')
      .mockImplementation(node => {
        const script = node as HTMLScriptElement;
        if (script.src.includes('accounts.google.com/gsi/client')) {
          Object.defineProperty(window, 'google', {
            value: {
              accounts: {
                oauth2: {
                  initTokenClient: vi.fn(() => ({
                    requestAccessToken: vi.fn(),
                  })),
                },
              },
            },
            configurable: true,
            writable: true,
          });
          script.onload?.(new Event('load'));
        }
        return node;
      });

    const { default: GoogleSheetsService } = await import('./googleSheetsApi');
    const service = new GoogleSheetsService('client-id');
    await service.initialize();

    expect(appendSpy).toHaveBeenCalled();
    expect(initMock).toHaveBeenCalled();
  });

  it('loads Google API script when gapi object is unavailable', async () => {
    const { initMock } = setupGoogleApis();
    Object.defineProperty(window, 'gapi', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const appendSpy = vi
      .spyOn(document.head, 'appendChild')
      .mockImplementation(node => {
        const script = node as HTMLScriptElement;
        if (script.src.includes('apis.google.com/js/api.js')) {
          Object.defineProperty(window, 'gapi', {
            value: {
              load: (_libraries: string, callback: () => void) => callback(),
              client: {
                init: initMock,
                sheets: {
                  spreadsheets: {
                    create: vi.fn(),
                    values: { update: vi.fn() },
                  },
                },
              },
            },
            configurable: true,
            writable: true,
          });
          script.onload?.(new Event('load'));
        }
        return node;
      });

    const { default: GoogleSheetsService } = await import('./googleSheetsApi');
    const service = new GoogleSheetsService('client-id');
    await service.initialize();

    expect(appendSpy).toHaveBeenCalled();
    expect(initMock).toHaveBeenCalled();
  });

  it('rejects initialization when GIS script fails to load', async () => {
    setupGoogleApis();
    Object.defineProperty(window, 'google', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    vi.spyOn(document.head, 'appendChild').mockImplementation(node => {
      const script = node as HTMLScriptElement;
      script.onerror?.(new Event('error'));
      return node;
    });

    const { default: GoogleSheetsService } = await import('./googleSheetsApi');
    const service = new GoogleSheetsService('client-id');

    await expect(service.initialize()).rejects.toThrow(
      'Failed to load Google Identity Services'
    );
  });

  it('rejects initialization when Google API script fails to load', async () => {
    setupGoogleApis();
    Object.defineProperty(window, 'gapi', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    vi.spyOn(document.head, 'appendChild').mockImplementation(node => {
      const script = node as HTMLScriptElement;
      if (script.src.includes('apis.google.com/js/api.js')) {
        script.onerror?.(new Event('error'));
      }
      return node;
    });

    const { default: GoogleSheetsService } = await import('./googleSheetsApi');
    const service = new GoogleSheetsService('client-id');

    await expect(service.initialize()).rejects.toThrow(
      'Failed to load Google API client'
    );
  });

  it('rejects initialization when loaded Google API client init throws', async () => {
    setupGoogleApis();
    Object.defineProperty(window, 'gapi', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    vi.spyOn(document.head, 'appendChild').mockImplementation(node => {
      const script = node as HTMLScriptElement;
      if (script.src.includes('apis.google.com/js/api.js')) {
        Object.defineProperty(window, 'gapi', {
          value: {
            load: (_libraries: string, callback: () => void) => callback(),
            client: {
              init: vi.fn().mockRejectedValue(new Error('init failed')),
              sheets: {
                spreadsheets: {
                  create: vi.fn(),
                  values: { update: vi.fn() },
                },
              },
            },
          },
          configurable: true,
          writable: true,
        });
        script.onload?.(new Event('load'));
      }
      return node;
    });

    const { default: GoogleSheetsService } = await import('./googleSheetsApi');
    const service = new GoogleSheetsService('client-id');

    await expect(service.initialize()).rejects.toThrow(
      'Failed to initialize Google API client'
    );
  });

  it('rejects initialization when gapi client init throws in existing gapi path', async () => {
    const { initMock } = setupGoogleApis();
    initMock.mockRejectedValueOnce(new Error('init failed'));
    const { default: GoogleSheetsService } = await import('./googleSheetsApi');
    const service = new GoogleSheetsService('client-id');

    await expect(service.initialize()).rejects.toThrow(
      'Failed to initialize Google API client'
    );
  });

  it('resolves authorize immediately when in-memory token already exists', async () => {
    const { requestAccessTokenMock } = setupGoogleApis();
    const { default: GoogleSheetsService } = await import('./googleSheetsApi');
    const service = new GoogleSheetsService('client-id');
    await service.initialize();
    await service.authorize();

    const serviceState = service as unknown as { accessToken: string | null };
    serviceState.accessToken = 'cached-token';

    const token = await service.authorize();

    expect(token).toBe('cached-token');
    expect(requestAccessTokenMock).toHaveBeenCalledTimes(1);
  });

  it('wraps createSpreadsheetWithData failures with user-facing error', async () => {
    const { createMock } = setupGoogleApis();
    createMock.mockRejectedValueOnce(new Error('network down'));
    const { default: GoogleSheetsService } = await import('./googleSheetsApi');
    const service = new GoogleSheetsService('client-id');
    await service.initialize();
    await service.authorize();

    await expect(
      service.createSpreadsheetWithData('Laporan', ['A'], [['1']])
    ).rejects.toThrow('Failed to create Google Sheet');
  });

  it('rethrows non-auth errors from export workflow', async () => {
    setupGoogleApis();
    const { default: GoogleSheetsService } = await import('./googleSheetsApi');
    const service = new GoogleSheetsService('client-id');
    await service.initialize();

    vi.spyOn(service, 'createSpreadsheetWithData').mockRejectedValueOnce(
      new Error('quota exceeded')
    );

    await expect(
      service.exportGridDataToSheets([['x']], ['h'], 'report')
    ).rejects.toThrow('quota exceeded');
  });

  it('returns spreadsheet URL on successful export workflow', async () => {
    setupGoogleApis();
    const { default: GoogleSheetsService } = await import('./googleSheetsApi');
    const service = new GoogleSheetsService('client-id');
    await service.initialize();
    await service.authorize();

    vi.spyOn(service, 'createSpreadsheetWithData').mockResolvedValueOnce({
      spreadsheetId: 'sheet-123',
      spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/sheet-123',
    });

    await expect(
      service.exportGridDataToSheets([['value']], ['header'], 'report')
    ).resolves.toBe('https://docs.google.com/spreadsheets/d/sheet-123');
  });
});
