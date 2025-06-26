# Gemini API Metrics System

This system provides comprehensive monitoring and analytics for the Gemini API integration in the PharmaSys application.

## Features

- **Real-time Metrics Dashboard**: Web-based dashboard showing live metrics
- **Traffic Monitoring**: Track all Gemini API calls with detailed timing
- **File Processing Analytics**: Monitor uploaded files and their sizes
- **Response Analysis**: Track Gemini API response sizes and parsing success
- **Error Tracking**: Monitor and categorize API failures
- **Historical Data**: Store and display request history
- **Interactive Charts**: Visual representation of metrics using Chart.js

## Architecture

### Components

1. **Metrics Server** (`metricsServer.ts`): Standalone server running on port 3001
2. **Metrics Middleware** (`metricsMiddleware.ts`): Collects and reports metrics
3. **Gemini Service Wrapper** (`geminiServiceWithMetrics.ts`): Wraps original Gemini calls
4. **Dashboard** (`dashboard.html`): Web interface for viewing metrics

### Data Flow

```
Gemini API Call → Metrics Wrapper → Original Gemini Service → Metrics Collection → Metrics Server → Dashboard
```

## Usage

### Starting the Metrics System

```bash
# Start only the metrics server
yarn metrics

# Start both main server and metrics server
yarn dev:metrics
```

### Accessing the Dashboard

Open your browser and navigate to: `http://localhost:3001`

### Environment Variables

```env
# Metrics Configuration
METRICS_PORT=3001
METRICS_SERVER_URL=http://localhost:3001
ENABLE_METRICS=true
```

## Metrics Collected

### Request Metrics
- Total requests count
- Success/failure rate
- Average processing time
- Request timestamps
- Endpoint usage

### File Metrics
- Total files processed
- Average file size
- File type distribution
- Processing errors

### Response Metrics
- Average response size
- Response parsing success rate
- Error categorization

### Dashboard Features

#### Overview Cards
- Total Requests
- Success Rate
- Average Processing Time
- Files Processed
- Average File Size
- Average Response Size

#### Charts
- **Success Rate Chart**: Doughnut chart showing successful vs failed requests
- **Processing Time Chart**: Line chart showing processing time trends

#### Request History Table
- Recent 20 requests with details
- Timestamp, endpoint, status, processing time, file size, response size

#### Controls
- **Refresh Data**: Manual refresh of all metrics
- **Clear Metrics**: Reset all collected metrics (with confirmation)
- **Auto-refresh**: Automatic refresh every 30 seconds

## API Endpoints

### Metrics API

- `GET /api/metrics`: Get all metrics data
- `GET /api/metrics/recent?limit=N`: Get recent N requests
- `POST /api/metrics/add`: Add a metric (used by middleware)
- `POST /api/metrics/clear`: Clear all metrics

### Dashboard

- `GET /`: Serve the metrics dashboard

## Data Storage

Metrics are stored in `metrics.json` file in the backend directory. The system automatically:
- Loads existing metrics on startup
- Saves metrics after each update
- Maintains only the last 1000 requests to prevent memory issues

## Integration Points

The metrics system integrates with the existing codebase at these points:

1. **Gemini API Calls**: All calls to `getGeminiResponse()` are wrapped
2. **Response Parsing**: JSON parsing operations are tracked
3. **Database Operations**: Supabase insertions are monitored
4. **File Operations**: File uploads and processing are tracked

## Performance Impact

The metrics system is designed to have minimal impact on the main application:
- Asynchronous metric reporting
- Silent failure for metric collection (won't break main functionality)
- Configurable via `ENABLE_METRICS` environment variable
- Separate server process for dashboard

## Troubleshooting

### Metrics Not Appearing
1. Check if `ENABLE_METRICS=true` in environment
2. Verify metrics server is running on port 3001
3. Check network connectivity between servers

### Dashboard Not Loading
1. Ensure metrics server is running
2. Check browser console for JavaScript errors
3. Verify `dashboard.html` file exists

### High Memory Usage
The system limits request history to 1000 entries. If memory issues persist:
1. Clear metrics using the dashboard
2. Restart the metrics server
3. Consider reducing the history limit in code

## Security Considerations

- The metrics dashboard has no authentication (suitable for internal use only)
- Sensitive data is not logged in metrics
- File paths are limited to basename only
- Error messages are sanitized