# Sprint 0 Discovery Engine v2

## Protocols

| Protocol | Connector | Discovery Type |
|----------|-----------|----------------|
| rest | `rest.connector.ts` | REST API endpoints |
| ssh | `ssh.connector.ts` | Server via SSH |
| winrm | `winrm.connector.ts` | Windows via WinRM SOAP |
| wmi | `winrm.connector.ts` | WMI via WinRM |
| vmware | `vmware.connector.ts` | vCenter REST API |
| azure | `azure.connector.ts` | Azure Resource Manager |
| gcp | `gcp.connector.ts` | GCP Compute API |
| network | `network.connector.ts` | TCP port scan / subnet |
| dependency | `dependency.connector.ts` | CMDB relationship graph |
| business-service | `business-service.connector.ts` | Tagged business services |
| snmp | existing | Network devices |
| kubernetes | existing | K8s clusters |
| aws | existing | AWS resources |
| opc-ua/modbus/mqtt | existing | OT/IoT |

## Configuration Examples

### REST Discovery
```json
{
  "protocol": "rest",
  "config": {
    "endpoints": [
      { "url": "https://internal-api/services", "ciType": "application", "idField": "id", "nameField": "name" }
    ]
  }
}
```

### Network Discovery
```json
{
  "protocol": "network",
  "config": {
    "subnets": ["10.0.1.0/24"],
    "ports": [22, 80, 443, 5432]
  }
}
```

### Azure Discovery
```json
{
  "protocol": "azure",
  "config": {
    "tenantId": "...",
    "clientId": "...",
    "clientSecret": "...",
    "subscriptionId": "..."
  }
}
```

## Event Flow

Scans publish `asset.discovered` events → CMDB Kafka consumer → CI upsert → topology refresh.

## Backward Compatibility

All Phase 0 connectors and APIs remain unchanged. New protocols are additive in `SUPPORTED_PROTOCOLS`.
