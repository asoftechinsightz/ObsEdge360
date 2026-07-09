import type { DiscoveryConnector } from './types';
import { StaticConnector } from './static.connector';
import { KubernetesConnector } from './kubernetes.connector';
import { AwsConnector } from './aws.connector';
import { SnmpConnector } from './snmp.connector';
import { OpcUaConnector } from './opcua.connector';
import { ModbusConnector } from './modbus.connector';
import { MqttConnector } from './mqtt.connector';

const connectors: Record<string, DiscoveryConnector> = {
  static: new StaticConnector(),
  kubernetes: new KubernetesConnector(),
  aws: new AwsConnector(),
  snmp: new SnmpConnector(),
  'opc-ua': new OpcUaConnector(),
  modbus: new ModbusConnector(),
  mqtt: new MqttConnector(),
};

export function getConnector(protocol: string): DiscoveryConnector | null {
  return connectors[protocol] ?? null;
}

export function listConnectors(): DiscoveryConnector[] {
  return Object.values(connectors);
}
