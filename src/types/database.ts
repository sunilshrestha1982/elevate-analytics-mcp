export interface HealthCheckResponse {
  status: 'ok' | 'error';
  service: 'database';
  timestamp: string;
  error?: string;
}
