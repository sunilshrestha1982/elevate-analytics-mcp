import { context, propagation, trace, SpanStatusCode, type Attributes, type Tracer } from '@opentelemetry/api';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BasicTracerProvider, BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const serviceName = process.env.OTEL_SERVICE_NAME ?? 'elevate-analytics-mcp';
const tracingEnabled = process.env.OTEL_ENABLED === 'true';
const zeroTraceId = '00000000000000000000000000000000';

function toCloudRunResourceAttributes() {
  return {
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV ?? 'development',
    ...(process.env.K_SERVICE ? { 'cloud.run.service.name': process.env.K_SERVICE } : {}),
    ...(process.env.K_REVISION ? { 'cloud.run.revision': process.env.K_REVISION } : {}),
    ...(process.env.K_CONFIGURATION ? { 'cloud.run.configuration': process.env.K_CONFIGURATION } : {}),
    ...(process.env.K_REGION ? { 'cloud.region': process.env.K_REGION } : {}),
    ...(process.env.K_SERVICE ? { 'cloud.platform': 'gcp_cloud_run' } : {}),
  };
}

function parseOtlpHeaders() {
  const raw = process.env.OTEL_EXPORTER_OTLP_HEADERS;
  if (!raw) return undefined;

  return Object.fromEntries(
    raw
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separator = entry.indexOf('=');
        if (separator === -1) return [entry, ''];
        return [entry.slice(0, separator).trim(), entry.slice(separator + 1).trim()];
      })
  );
}

function getOtlpExporter() {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
  if (!endpoint) return undefined;

  const normalizedUrl = endpoint.endsWith('/v1/traces') ? endpoint : `${endpoint.replace(/\/$/, '')}/v1/traces`;
  return new OTLPTraceExporter({
    url: normalizedUrl,
    headers: parseOtlpHeaders(),
  });
}

let providerInitialized = false;

function initializeTracing() {
  if (providerInitialized || !tracingEnabled) return;

  const exporter = getOtlpExporter();
  const spanProcessors = [
    ...(exporter ? [new BatchSpanProcessor(exporter)] : []),
    ...(process.env.OTEL_EXPORTER_CONSOLE === 'true' || !exporter ? [new BatchSpanProcessor(new ConsoleSpanExporter())] : []),
  ];

  const provider = new BasicTracerProvider({
    resource: resourceFromAttributes(toCloudRunResourceAttributes()),
    spanProcessors,
  });

  context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());
  trace.setGlobalTracerProvider(provider);
  providerInitialized = true;
}

initializeTracing();

export function getTracer(scope: string): Tracer {
  return trace.getTracer(scope);
}

export function getActiveTraceContext() {
  const activeSpan = trace.getSpan(context.active());
  if (!activeSpan) {
    return {};
  }

  const spanContext = activeSpan.spanContext();
  if (spanContext.traceId === zeroTraceId) {
    return {};
  }

  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
  };
}

export function extractTraceContextFromHeaders(headers: Record<string, unknown>) {
  return propagation.extract(context.active(), headers as Record<string, string>);
}

export async function traceAsync<T>(scope: string, name: string, attributes: Attributes, run: () => Promise<T>): Promise<T> {
  const tracer = getTracer(scope);
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      const result = await context.with(trace.setSpan(context.active(), span), run);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error instanceof Error ? error : new Error(String(error)));
      span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : String(error) });
      throw error;
    } finally {
      span.end();
    }
  });
}
