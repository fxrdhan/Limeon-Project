import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import GoogleSheetsService from './googleSheetsApi';

type GoogleTokenConfig = Parameters<
  Window['google']['accounts']['oauth2']['initTokenClient']
>[0];

const installGoogleIdentityStub = () => {
  const initTokenClient = vi.fn((config: GoogleTokenConfig) => ({
    requestAccessToken: vi.fn(() => {
      config.callback({ access_token: 'access-token' });
    }),
  }));

  Object.defineProperty(window, 'google', {
    configurable: true,
    value: {
      accounts: {
        oauth2: {
          initTokenClient,
        },
      },
    },
  });

  return initTokenClient;
};

const createAuthorizedService = async () => {
  const service = new GoogleSheetsService('client-id');

  await service.initialize();
  await service.authorize();

  return service;
};

describe('GoogleSheetsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installGoogleIdentityStub();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, 'google');
  });

  it('preserves structured Google API error details', async () => {
    const service = await createAuthorizedService();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 403,
            message: 'The caller does not have permission',
            status: 'PERMISSION_DENIED',
          },
        }),
        {
          status: 403,
          statusText: 'Forbidden',
        }
      )
    );

    await expect(
      service.createSpreadsheetWithData('Items', ['Name'], [['Paracetamol']])
    ).rejects.toThrow(
      'Failed to create Google Sheet: 403 PERMISSION_DENIED The caller does not have permission'
    );
  });

  it('falls back to the HTTP status when an error response is not JSON', async () => {
    const service = await createAuthorizedService();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>Server overloaded</html>', {
        status: 503,
        statusText: 'Service Unavailable',
      })
    );

    await expect(
      service.createSpreadsheetWithData('Items', ['Name'], [['Paracetamol']])
    ).rejects.toThrow('Failed to create Google Sheet: 503 Service Unavailable');
  });

  it('rejects invalid spreadsheet creation success payloads', async () => {
    const service = await createAuthorizedService();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          spreadsheetId: 'spreadsheet-1',
        }),
        {
          status: 200,
        }
      )
    );

    await expect(
      service.createSpreadsheetWithData('Items', ['Name'], [['Paracetamol']])
    ).rejects.toThrow(
      'Failed to create Google Sheet: Google Sheets API returned an invalid spreadsheet response'
    );
  });
});
