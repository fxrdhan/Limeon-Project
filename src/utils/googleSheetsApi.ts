// Google Sheets API integration for client-side export
// This utility handles authentication and data export to Google Sheets

// Google Identity Services types
declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: TokenClientConfig) => TokenClient;
        };
      };
    };
    gapi: {
      load: (libraries: string, callback: () => void) => void;
      client: {
        init: (config: GapiInitConfig) => Promise<void>;
        sheets: {
          spreadsheets: {
            create: (
              params: CreateSpreadsheetParams
            ) => Promise<CreateSpreadsheetResponse>;
            values: {
              update: (
                params: UpdateValuesParams
              ) => Promise<UpdateValuesResponse>;
            };
          };
        };
      };
    };
  }
}

interface TokenClientConfig {
  client_id: string;
  scope: string;
  callback: (tokenResponse: TokenResponse) => void;
}

interface TokenClient {
  requestAccessToken: () => void;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface GapiInitConfig {
  apiKey?: string;
  discoveryDocs: string[];
}

interface CreateSpreadsheetParams {
  resource: {
    properties: {
      title: string;
    };
  };
}

interface CreateSpreadsheetResponse {
  result: {
    spreadsheetId: string;
    spreadsheetUrl: string;
    properties: {
      title: string;
    };
  };
}

interface UpdateValuesParams {
  spreadsheetId: string;
  range: string;
  valueInputOption: 'RAW' | 'USER_ENTERED';
  resource: {
    values: string[][];
  };
}

interface UpdateValuesResponse {
  result: {
    updatedCells: number;
    updatedColumns: number;
    updatedRows: number;
  };
}

class GoogleSheetsService {
  private clientId: string;
  private tokenClient: TokenClient | null = null;
  private accessToken: string | null = null;
  private tokenStorageKey = 'google_sheets_access_token';

  constructor(clientId: string) {
    this.clientId = clientId;
    // Don't auto-restore token - force fresh authentication each session
    // This prevents using expired tokens that cause 401 errors
    this.accessToken = null;
  }

  // Initialize Google APIs
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Load Google Identity Services
      if (!window.google?.accounts) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = () => {
          this.loadGapiClient(resolve, reject);
        };
        script.onerror = () =>
          reject(new Error('Failed to load Google Identity Services'));
        document.head.appendChild(script);
      } else {
        this.loadGapiClient(resolve, reject);
      }
    });
  }

  private loadGapiClient(
    resolve: () => void,
    reject: (error: Error) => void
  ): void {
    // Load Google API client
    if (!window.gapi) {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        window.gapi.load('client', async () => {
          try {
            await window.gapi.client.init({
              discoveryDocs: [
                'https://sheets.googleapis.com/$discovery/rest?version=v4',
              ],
            });
            this.initializeTokenClient();
            resolve();
          } catch {
            reject(new Error('Failed to initialize Google API client'));
          }
        });
      };
      script.onerror = () =>
        reject(new Error('Failed to load Google API client'));
      document.head.appendChild(script);
    } else {
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            discoveryDocs: [
              'https://sheets.googleapis.com/$discovery/rest?version=v4',
            ],
          });
          this.initializeTokenClient();
          resolve();
        } catch {
          reject(new Error('Failed to initialize Google API client'));
        }
      });
    }
  }

  private initializeTokenClient(): void {
    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: this.clientId,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      callback: (tokenResponse: TokenResponse) => {
        this.accessToken = tokenResponse.access_token;
      },
    });
  }

  // Request user authorization
  async authorize(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        reject(new Error('Google Sheets service not initialized'));
        return;
      }

      // Only request new authentication if we don't have a token in memory
      if (!this.accessToken) {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: this.clientId,
          scope: 'https://www.googleapis.com/auth/spreadsheets',
          callback: (tokenResponse: TokenResponse) => {
            this.accessToken = tokenResponse.access_token;
            // sessionStorage.setItem(
            //   this.tokenStorageKey,
            //   tokenResponse.access_token
            // );
            resolve(tokenResponse.access_token);
          },
        });

        this.tokenClient.requestAccessToken();
      } else {
        // Already have token in memory, resolve immediately
        resolve(this.accessToken);
      }
    });
  }

  // Clear stored token
  clearToken(): void {
    this.accessToken = null;
    sessionStorage.removeItem(this.tokenStorageKey);
  }

  // Create a new spreadsheet with data
  async createSpreadsheetWithData(
    title: string,
    headers: string[],
    data: unknown[][]
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
    if (!this.accessToken) {
      throw new Error('Not authorized. Please call authorize() first.');
    }

    try {
      // Create the spreadsheet
      const createResponse =
        await window.gapi.client.sheets.spreadsheets.create({
          resource: {
            properties: {
              title,
            },
          },
        });

      const spreadsheetId = createResponse.result.spreadsheetId;
      const spreadsheetUrl = createResponse.result.spreadsheetUrl;

      // Prepare the data with headers
      const values = [headers, ...data.map(row => row.map(String))];

      // Add data to the spreadsheet
      await window.gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Sheet1!A1',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values,
        },
      });

      return {
        spreadsheetId,
        spreadsheetUrl,
      };
    } catch (error) {
      console.error('Error creating Google Sheet:', error);
      throw new Error('Failed to create Google Sheet');
    }
  }

  // Check if user is authorized
  isAuthorized(): boolean {
    // Check if we have a token in memory (valid for current session)
    // Note: we don't auto-restore from sessionStorage to avoid expired tokens
    return !!this.accessToken;
  }

  // Export AG Grid data to Google Sheets
  async exportGridDataToSheets(
    processedData: string[][],
    headers: string[],
    filename: string
  ): Promise<string> {
    try {
      // Ensure we're authorized
      if (!this.accessToken) {
        await this.authorize();
      }

      // Data is already processed from AG Grid
      const dataArray = processedData;

      // Create spreadsheet with data
      const result = await this.createSpreadsheetWithData(
        `${filename} - ${new Date().toLocaleDateString()}`,
        headers,
        dataArray
      );

      return result.spreadsheetUrl;
    } catch (error) {
      console.error('Error exporting to Google Sheets:', error);

      // If error might be due to expired/invalid token, clear it and retry once
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('401') ||
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('invalid')
      ) {
        this.clearToken();

        // Don't auto-retry to avoid infinite loop - let caller handle retry
        throw new Error('Authentication token expired. Please try again.');
      }

      throw error;
    }
  }
}

// Export a singleton instance
export const googleSheetsService = new GoogleSheetsService(
  '81215613762-5974vmto34pgir8hkvqbp2pv8uilp3vt.apps.googleusercontent.com'
);

export default GoogleSheetsService;
