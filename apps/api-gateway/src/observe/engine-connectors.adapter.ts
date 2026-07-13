import { FixtureBackedObserveAdapter } from './fixture-backed.adapter';

/**
 * Engine connector slot A (historically SkyWalking GraphQL).
 * Internal implementation detail — never exposed in customer DTOs or UI.
 */
export class SkyWalkingObserveAdapter extends FixtureBackedObserveAdapter {
  readonly id = 'engine-connector-a';

  override async health(tenantId: string) {
    const base = await super.health(tenantId);
    if (process.env.SKYWALKING_GRAPHQL_URL || process.env.OBSERVE_ENGINE_URL) {
      return {
        ...base,
        message: 'Observability engine connector reserved; serving curated OpsEdge telemetry',
      };
    }
    return base;
  }
}

/** Alternate engine proof: OpenObserve-shaped connector behind the same SPI. */
export class OpenObserveObserveAdapter extends FixtureBackedObserveAdapter {
  readonly id = 'engine-connector-b';
}

/** Alternate engine proof: Datadog API-shaped connector behind the same SPI. */
export class DatadogApiObserveAdapter extends FixtureBackedObserveAdapter {
  readonly id = 'engine-connector-c';
}
