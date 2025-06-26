import axios from 'axios';
import { promises as fs } from 'fs';

interface GeminiRequest {
  timestamp: string;
  endpoint: string;
  processingTime: number;
  status: 'success' | 'error';
  fileSize?: number;
  fileName?: string;
  responseSize?: number;
  errorMessage?: string;
}

class MetricsReporter {
  private metricsServerUrl: string;
  private enabled: boolean;

  constructor() {
    this.metricsServerUrl = process.env.METRICS_SERVER_URL || 'http://localhost:3001';
    this.enabled = process.env.ENABLE_METRICS !== 'false';
  }

  async reportMetric(metric: GeminiRequest): Promise<void> {
    if (!this.enabled) return;

    try {
      await axios.post(`${this.metricsServerUrl}/api/metrics/add`, metric, {
        timeout: 5000
      });
    } catch (error) {
      // Silently fail to avoid disrupting main application
      console.warn('Failed to report metric to metrics server:', error instanceof Error ? error.message : String(error));
    }
  }

  async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  getResponseSize(response: unknown): number {
    try {
      return JSON.stringify(response).length;
    } catch {
      return 0;
    }
  }

  async trackGeminiRequest<T>(
    endpoint: string,
    operation: () => Promise<T>,
    fileName?: string,
    filePath?: string
  ): Promise<T> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    let fileSize: number | undefined;

    // Get file size if file path is provided
    if (filePath) {
      fileSize = await this.getFileSize(filePath);
    }

    try {
      const result = await operation();
      const processingTime = Date.now() - startTime;
      const responseSize = this.getResponseSize(result);

      // Report successful request
      await this.reportMetric({
        timestamp,
        endpoint,
        processingTime,
        status: 'success',
        fileSize,
        fileName,
        responseSize
      });

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Report failed request
      await this.reportMetric({
        timestamp,
        endpoint,
        processingTime,
        status: 'error',
        fileSize,
        fileName,
        errorMessage
      });

      throw error; // Re-throw the error to maintain original behavior
    }
  }
}

export const metricsReporter = new MetricsReporter();