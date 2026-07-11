import { Kafka, type Consumer, type Producer, logLevel } from 'kafkajs';

export const TOPICS = {
  ASSET_DISCOVERED: 'asset.discovered',
  ASSET_UPDATED: 'asset.updated',
  ASSET_REMOVED: 'asset.removed',
  CMDB_UPDATED: 'cmdb.updated',
  TWIN_UPDATED: 'twin.updated',
  TELEMETRY_RECEIVED: 'telemetry.received',
  COMPLIANCE_VIOLATION: 'compliance.violation',
  COMPLIANCE_CHECKED: 'compliance.checked',
  TRANSACTION_DISCOVERED: 'transaction.discovered',
  NETWORK_FLOW: 'network.flow',
  AGENT_RUN_COMPLETED: 'agent.run.completed',
  FRAUD_DETECTED: 'fraud.detected',
  ANOMALY_DETECTED: 'anomaly.detected',
  REMEDIATION_REQUESTED: 'remediation.requested',
  REMEDIATION_EXECUTED: 'remediation.executed',
  SIEM_EVENT: 'siem.event',
  SUSTAINABILITY_ALERT: 'sustainability.alert',
  FORECAST_GENERATED: 'forecast.generated',
  INCIDENT_CORRELATED: 'incident.correlated',
  RCA_COMPLETED: 'rca.completed',
  OPS_SIGNAL: 'ops_intelligence.signal',
  QUANTUM_JOB_SUBMITTED: 'quantum.job.submitted',
  QUANTUM_READINESS_ASSESSED: 'quantum.readiness.assessed',
  HA_DR_TESTED: 'ha_dr.tested',
  FEDRAMP_ASSESSED: 'fedramp.assessed',
  INDUSTRY_PACK_ENABLED: 'industry.pack.enabled',
} as const;

export interface PlatformEvent<T = unknown> {
  eventType: string;
  tenantId: string;
  timestamp: string;
  payload: T;
}

export class EventBus {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumers: Consumer[] = [];
  private connected = false;
  private readonly enabled: boolean;

  constructor(clientId = 'trinetra360') {
    const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(',');
    this.enabled = process.env.KAFKA_ENABLED !== 'false';
    this.kafka = new Kafka({
      clientId,
      brokers,
      logLevel: logLevel.WARN,
      retry: { retries: 3 },
    });
  }

  async connect(): Promise<void> {
    if (!this.enabled || this.connected) return;
    try {
      this.producer = this.kafka.producer();
      await this.producer.connect();
      this.connected = true;
      console.log('[event-bus] Kafka producer connected');
    } catch (err) {
      console.warn('[event-bus] Kafka unavailable, events will be logged only:', (err as Error).message);
    }
  }

  async publish<T>(topic: string, event: PlatformEvent<T>): Promise<void> {
    const message = JSON.stringify(event);
    if (!this.producer) {
      console.log(`[event-bus] (local) ${topic}:`, message.slice(0, 200));
      return;
    }
    await this.producer.send({
      topic,
      messages: [{ key: event.tenantId, value: message }],
    });
  }

  async subscribe(
    groupId: string,
    topics: string[],
    handler: (topic: string, event: PlatformEvent) => Promise<void>,
  ): Promise<void> {
    if (!this.enabled) {
      console.warn(`[event-bus] Kafka disabled, skipping consumer ${groupId}`);
      return;
    }
    const consumer = this.kafka.consumer({ groupId });
    this.consumers.push(consumer);
    await consumer.connect();
    await consumer.subscribe({ topics, fromBeginning: false });
    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        if (!message.value) return;
        try {
          const event = JSON.parse(message.value.toString()) as PlatformEvent;
          await handler(topic, event);
        } catch (err) {
          console.error(`[event-bus] handler error on ${topic}:`, err);
        }
      },
    });
    console.log(`[event-bus] Consumer ${groupId} subscribed to`, topics);
  }

  async disconnect(): Promise<void> {
    for (const c of this.consumers) await c.disconnect();
    if (this.producer) await this.producer.disconnect();
    this.connected = false;
  }
}

export function createEvent(type: string, tenantId: string, payload: unknown): PlatformEvent {
  return {
    eventType: type,
    tenantId,
    timestamp: new Date().toISOString(),
    payload,
  };
}
