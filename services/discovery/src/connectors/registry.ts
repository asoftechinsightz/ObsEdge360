import type { DiscoveryConnector } from './types';
import { StaticConnector } from './static.connector';
import { KubernetesConnector } from './kubernetes.connector';
import { AwsConnector } from './aws.connector';
import { SnmpConnector } from './snmp.connector';
import { OpcUaConnector } from './opcua.connector';
import { ModbusConnector } from './modbus.connector';
import { MqttConnector } from './mqtt.connector';
import { RestConnector } from './rest.connector';
import { SshConnector } from './ssh.connector';
import { WinRmConnector, WmiConnector } from './winrm.connector';
import { VmwareConnector } from './vmware.connector';
import { AzureConnector } from './azure.connector';
import { GcpConnector } from './gcp.connector';
import { NetworkConnector } from './network.connector';
import { DependencyConnector } from './dependency.connector';
import { BusinessServiceConnector } from './business-service.connector';

const connectors: Record<string, DiscoveryConnector> = {
  static: new StaticConnector(),
  kubernetes: new KubernetesConnector(),
  aws: new AwsConnector(),
  snmp: new SnmpConnector(),
  'opc-ua': new OpcUaConnector(),
  modbus: new ModbusConnector(),
  mqtt: new MqttConnector(),
  rest: new RestConnector(),
  ssh: new SshConnector(),
  winrm: new WinRmConnector(),
  wmi: new WmiConnector(),
  vmware: new VmwareConnector(),
  azure: new AzureConnector(),
  gcp: new GcpConnector(),
  network: new NetworkConnector(),
  dependency: new DependencyConnector(),
  'business-service': new BusinessServiceConnector(),
};

export function getConnector(protocol: string): DiscoveryConnector | null {
  return connectors[protocol] ?? null;
}

export function listConnectors(): DiscoveryConnector[] {
  return Object.values(connectors);
}
