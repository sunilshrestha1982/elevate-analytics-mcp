import { context, trace, SpanStatusCode, type Attributes, type Tracer } from '@opentelemetry/api';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BasicTracerProvider, BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const serviceName = process.env.OTEL_SERVICE_NAME ?? 'elevate-analytics-mcp';
const tracingEnabled = process.env.OTEL_ENABLED === 'true';

let providerInitialized = false;

function initializeTracing() {
  if (providerInitialized || !tracingEnabled) return;

  const provider = new BasicTracerProvider({
    resource: resourceFromAttributes({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV ?? 'development',
    }),
    spanProcessors: [new BatchSpanProcessor(new ConsoleSpanExporter())],
  });

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
  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
  };
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
