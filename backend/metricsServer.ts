import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';

interface GeminiMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalProcessingTime: number;
  averageProcessingTime: number;
  requestHistory: GeminiRequest[];
  fileMetrics: FileMetrics;
  responseMetrics: ResponseMetrics;
}

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

interface FileMetrics {
  totalFilesProcessed: number;
  totalFileSize: number;
  averageFileSize: number;
  fileTypes: Record<string, number>;
  processingErrors: number;
}

interface ResponseMetrics {
  totalResponseSize: number;
  averageResponseSize: number;
  responseTypes: Record<string, number>;
  parseErrors: number;
}

class MetricsCollector {
  private metrics: GeminiMetrics;
  private metricsFile: string;

  constructor() {
    this.metricsFile = path.join(process.cwd(), 'metrics.json');
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      requestHistory: [],
      fileMetrics: {
        totalFilesProcessed: 0,
        totalFileSize: 0,
        averageFileSize: 0,
        fileTypes: {},
        processingErrors: 0
      },
      responseMetrics: {
        totalResponseSize: 0,
        averageResponseSize: 0,
        responseTypes: {},
        parseErrors: 0
      }
    };
    this.loadMetrics();
  }

  private async loadMetrics(): Promise<void> {
    try {
      const data = await fs.readFile(this.metricsFile, 'utf-8');
      this.metrics = JSON.parse(data);
    } catch {
      console.log('No existing metrics file found, starting fresh');
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      await fs.writeFile(this.metricsFile, JSON.stringify(this.metrics, null, 2));
    } catch (saveError) {
      console.error('Error saving metrics:', saveError);
    }
  }

  public addRequest(request: GeminiRequest): void {
    this.metrics.totalRequests++;
    this.metrics.requestHistory.push(request);
    
    // Keep only last 1000 requests to prevent memory issues
    if (this.metrics.requestHistory.length > 1000) {
      this.metrics.requestHistory = this.metrics.requestHistory.slice(-1000);
    }

    if (request.status === 'success') {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    this.metrics.totalProcessingTime += request.processingTime;
    this.metrics.averageProcessingTime = this.metrics.totalProcessingTime / this.metrics.totalRequests;

    // Update file metrics
    if (request.fileSize && request.fileName) {
      this.metrics.fileMetrics.totalFilesProcessed++;
      this.metrics.fileMetrics.totalFileSize += request.fileSize;
      this.metrics.fileMetrics.averageFileSize = 
        this.metrics.fileMetrics.totalFileSize / this.metrics.fileMetrics.totalFilesProcessed;
      
      const fileExt = path.extname(request.fileName).toLowerCase();
      this.metrics.fileMetrics.fileTypes[fileExt] = 
        (this.metrics.fileMetrics.fileTypes[fileExt] || 0) + 1;
    }

    // Update response metrics
    if (request.responseSize) {
      this.metrics.responseMetrics.totalResponseSize += request.responseSize;
      this.metrics.responseMetrics.averageResponseSize = 
        this.metrics.responseMetrics.totalResponseSize / this.metrics.successfulRequests;
    }

    this.saveMetrics();
  }

  public getMetrics(): GeminiMetrics {
    return this.metrics;
  }

  public getRecentRequests(limit: number = 20): GeminiRequest[] {
    return this.metrics.requestHistory.slice(-limit);
  }

  public clearMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      requestHistory: [],
      fileMetrics: {
        totalFilesProcessed: 0,
        totalFileSize: 0,
        averageFileSize: 0,
        fileTypes: {},
        processingErrors: 0
      },
      responseMetrics: {
        totalResponseSize: 0,
        averageResponseSize: 0,
        responseTypes: {},
        parseErrors: 0
      }
    };
    this.saveMetrics();
  }
}

const metricsCollector = new MetricsCollector();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files for the dashboard
app.use(express.static(path.join(process.cwd(), 'metrics-dashboard')));

// API endpoints
app.get('/api/metrics', (req, res) => {
  res.json(metricsCollector.getMetrics());
});

app.get('/api/metrics/recent', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  res.json(metricsCollector.getRecentRequests(limit));
});

app.post('/api/metrics/clear', (req, res) => {
  metricsCollector.clearMetrics();
  res.json({ message: 'Metrics cleared successfully' });
});

// Add metric endpoint for external services to report
app.post('/api/metrics/add', (req, res) => {
  const request: GeminiRequest = req.body;
  metricsCollector.addRequest(request);
  res.json({ message: 'Metric added successfully' });
});

// Dashboard endpoint
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dashboard.html'));
});

const PORT = process.env.METRICS_PORT || 3001;

app.listen(PORT, () => {
  console.log(`Metrics server running on port ${PORT}`);
  console.log(`Dashboard available at http://localhost:${PORT}`);
});

export { metricsCollector };