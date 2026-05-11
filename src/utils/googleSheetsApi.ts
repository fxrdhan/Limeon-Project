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
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface CreateSpreadsheetResponse {
  spreadsheetId: string;
  spreadsheetUrl: string;
  properties: {
    title: string;
  };
}

interface GoogleSheetsApiErrorBody {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

interface UpdateValuesRequestBody {
  values: string[][];
}

const googleSheetsInitializeTimeoutMs = 15_000;
const googleIdentityServicesUrl = 'https://accounts.google.com/gsi/client';
const googleSheetsApiBaseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';

class GoogleSheetsService {
  private clientId: string;
  private tokenClient: TokenClient | null = null;
  private accessToken: string | null = null;
  private initialized = false;
  private initializePromise: Promise<void> | null = null;
  private tokenStorageKey = 'google_sheets_access_token';

  constructor(clientId: string) {
    this.clientId = clientId;
    // Don't auto-restore token - force fresh authentication each session
    // This prevents using expired tokens that cause 401 errors
    this.accessToken = null;
  }

  // Initialize Google APIs
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializePromise) return this.initializePromise;

    this.initializePromise = new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(
          new Error(
            'Timed out while loading Google Sheets services. Check network access, popup/privacy blockers, or Google API availability.'
          )
        );
      }, googleSheetsInitializeTimeoutMs);
      const resolveInitialization = () => {
        window.clearTimeout(timeoutId);
        resolve();
      };
      const rejectInitialization = (error: Error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      };

      // Load Google Identity Services
      if (!window.google?.accounts) {
        const script = document.createElement('script');
        script.src = googleIdentityServicesUrl;
        script.onload = () => {
          try {
            this.initializeTokenClient();
            resolveInitialization();
          } catch (error) {
            rejectInitialization(
              error instanceof Error
                ? error
                : new Error('Failed to initialize Google Identity Services')
            );
          }
        };
        script.onerror = () =>
          rejectInitialization(
            new Error('Failed to load Google Identity Services')
          );
        document.head.appendChild(script);
      } else {
        this.initializeTokenClient();
        resolveInitialization();
      }
    })
      .then(() => {
        this.initialized = true;
      })
      .catch(error => {
        this.initializePromise = null;
        throw error;
      });

    return this.initializePromise;
  }

  isInitialized(): boolean {
    return this.initialized && this.tokenClient !== null;
  }

  private applyAccessToken(accessToken: string): void {
    this.accessToken = accessToken;
  }

  private getTokenResponseError(tokenResponse: TokenResponse): string | null {
    if (tokenResponse.error) {
      return tokenResponse.error_description ?? tokenResponse.error;
    }

    if (!tokenResponse.access_token) {
      return 'Google authorization did not return an access token';
    }

    return null;
  }

  private getGoogleApiErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;

    if (error && typeof error === 'object') {
      const responseError = (
        error as {
          error?: {
            code?: number;
            message?: string;
            status?: string;
          };
        }
      ).error;

      if (responseError) {
        return [responseError.code, responseError.status, responseError.message]
          .filter(Boolean)
          .join(' ');
      }

      try {
        return JSON.stringify(error);
      } catch {
        return 'Unserializable Google API error';
      }
    }

    return String(error);
  }

  private isAuthorizationError(error: unknown): boolean {
    const errorMessage = this.getGoogleApiErrorMessage(error).toLowerCase();

    return (
      errorMessage.includes('401') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('permission_denied')
    );
  }

  private async requestGoogleSheets<ResponseBody>(
    path: string,
    options: RequestInit
  ): Promise<ResponseBody> {
    if (!this.accessToken) {
      throw new Error('Not authorized. Please call authorize() first.');
    }

    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${this.accessToken}`);
    headers.set('Content-Type', 'application/json');

    const response = await fetch(`${googleSheetsApiBaseUrl}${path}`, {
      ...options,
      headers,
    });
    const responseText = await response.text();
    const responseBody =
      responseText.length > 0 ? (JSON.parse(responseText) as unknown) : null;

    if (!response.ok) {
      const apiError = responseBody as GoogleSheetsApiErrorBody | null;
      const responseError = apiError?.error;
      throw new Error(
        [
          response.status,
          responseError?.status,
          responseError?.message ?? response.statusText,
        ]
          .filter(Boolean)
          .join(' ')
      );
    }

    return responseBody as ResponseBody;
  }

  private initializeTokenClient(): void {
    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: this.clientId,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      callback: (tokenResponse: TokenResponse) => {
        if (!tokenResponse.access_token) return;

        this.applyAccessToken(tokenResponse.access_token);
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
            const tokenError = this.getTokenResponseError(tokenResponse);
            if (tokenError) {
              reject(new Error(tokenError));
              return;
            }

            const accessToken = tokenResponse.access_token;
            if (!accessToken) {
              reject(
                new Error('Google authorization did not return an access token')
              );
              return;
            }

            this.applyAccessToken(accessToken);
            // sessionStorage.setItem(
            //   this.tokenStorageKey,
            //   tokenResponse.access_token
            // );
            resolve(accessToken);
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
        await this.requestGoogleSheets<CreateSpreadsheetResponse>('', {
          method: 'POST',
          body: JSON.stringify({
            properties: {
              title,
            },
          }),
        });

      const spreadsheetId = createResponse.spreadsheetId;
      const spreadsheetUrl = createResponse.spreadsheetUrl;

      // Prepare the data with headers
      const values = [headers, ...data.map(row => row.map(String))];
      const range = encodeURIComponent('Sheet1!A1');
      const updateBody: UpdateValuesRequestBody = {
        values,
      };

      // Add data to the spreadsheet
      await this.requestGoogleSheets(
        `/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          body: JSON.stringify(updateBody),
        }
      );

      return {
        spreadsheetId,
        spreadsheetUrl,
      };
    } catch (error) {
      console.error('Error creating Google Sheet:', error);
      throw new Error(
        `Failed to create Google Sheet: ${this.getGoogleApiErrorMessage(error)}`
      );
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
      if (this.isAuthorizationError(error)) {
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
