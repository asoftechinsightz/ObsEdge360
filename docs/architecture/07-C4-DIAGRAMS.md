# OpsEdge360 — C4 Architecture Diagrams

**Version:** 1.0

---

## Level 1: System Context

```mermaid
C4Context
    title System Context — OpsEdge360

    Person(exec, "Executive", "CIO, CISO, CFO")
    Person(ops, "Operations", "SRE, NOC, OT Engineer")
    Person(audit, "Compliance Officer", "Audit, governance")

    System(trinetra, "OpsEdge360", "AI-Native Enterprise Intelligence Platform")

    System_Ext(cloud, "Cloud Providers", "AWS, Azure, GCP")
    System_Ext(idp, "Identity Provider", "OIDC/SAML")
    System_Ext(siem, "SIEM/SOAR", "Splunk, Sentinel")
    System_Ext(ot, "OT/IoT Devices", "PLCs, SCADA, sensors")

    Rel(exec, trinetra, "Views dashboards, KPIs")
    Rel(ops, trinetra, "Monitors, remediates")
    Rel(audit, trinetra, "Reviews compliance")
    Rel(trinetra, cloud, "Discovers resources")
    Rel(trinetra, idp, "Authenticates users")
    Rel(trinetra, siem, "Correlates security events")
    Rel(trinetra, ot, "Read-only monitoring")
```

## Level 2: Container Diagram

```mermaid
C4Container
    title Container Diagram — OpsEdge360

    Person(user, "Platform User")

    Container(web, "Web Application", "Next.js", "Dashboards, digital twin UI")
    Container(gateway, "API Gateway", "NestJS", "Auth, routing, rate limiting")
    Container(discovery, "Discovery Service", "NestJS", "Asset discovery connectors")
    Container(cmdb, "CMDB Service", "NestJS", "Configuration items, relationships")
    Container(obs, "Observability Service", "NestJS", "Metrics, logs, traces")
    Container(compliance, "Compliance Service", "NestJS", "Framework validation")
    Container(agents, "AI Agents", "Python/LangGraph", "RCA, remediation, fraud")
    ContainerDb(pg, "PostgreSQL", "Relational DB", "CMDB, compliance, audit")
    ContainerDb(neo4j, "Neo4j", "Graph DB", "Digital twin topology")
    ContainerDb(os, "OpenSearch", "Search/Logs", "Telemetry, fraud signals")
    ContainerQueue(kafka, "Kafka", "Event Bus", "Domain events")

    Rel(user, web, "HTTPS")
    Rel(web, gateway, "REST/WS")
    Rel(gateway, discovery, "REST")
    Rel(gateway, cmdb, "REST")
    Rel(gateway, obs, "REST")
    Rel(gateway, compliance, "REST")
    Rel(gateway, agents, "REST")
    Rel(discovery, kafka, "Publishes events")
    Rel(cmdb, kafka, "Consumes/Publishes")
    Rel(cmdb, pg, "Reads/Writes")
    Rel(cmdb, neo4j, "Syncs graph")
    Rel(obs, os, "Indexes telemetry")
    Rel(agents, kafka, "Consumes events")
```

## Level 3: CMDB Service Components

```mermaid
C4Component
    title Component Diagram — CMDB Service

    Container_Boundary(cmdb, "CMDB Service") {
        Component(api, "REST API", "NestJS Controller", "CRUD for CIs and relationships")
        Component(svc, "CMDB Service", "Domain Logic", "Business rules, scoring")
        Component(repo, "CI Repository", "TypeORM", "PostgreSQL persistence")
        Component(graph, "Graph Sync", "Neo4j Driver", "Digital twin sync")
        Component(consumer, "Event Consumer", "Kafka", "Handles asset.discovered")
    }

    Rel(api, svc, "Calls")
    Rel(svc, repo, "Persists")
    Rel(svc, graph, "Syncs")
    Rel(consumer, svc, "Triggers upsert")
```

## Level 4: Discovery Connector (Code)

```
services/discovery/src/
├── connectors/
│   ├── ssh.connector.ts      # Linux/Unix discovery
│   ├── snmp.connector.ts     # Network devices
│   ├── kubernetes.connector.ts
│   └── aws.connector.ts
├── discovery.service.ts      # Orchestration
├── discovery.controller.ts   # REST API
└── events/
    └── asset.publisher.ts    # Kafka producer
```

## Deployment View

```mermaid
graph TB
    subgraph K8s Cluster
        Ingress[Ingress / Load Balancer]
        Web[web pods]
        GW[api-gateway pods]
        DISC[discovery pods]
        CMDB[cmdb pods]
        OBS[observability pods]
        AI[ai-agents pods]
    end

    subgraph Data Tier
        PG[(PostgreSQL HA)]
        NEO[(Neo4j Cluster)]
        OS[(OpenSearch Cluster)]
        KF[Kafka Cluster]
        RD[(Redis)]
    end

    Ingress --> Web
    Ingress --> GW
    GW --> DISC & CMDB & OBS & AI
    DISC & CMDB & OBS --> KF
    CMDB --> PG & NEO
    OBS --> OS
    GW --> RD
```

---

*Diagrams use Mermaid C4 extension syntax. Render in GitHub, VS Code, or Mermaid Live Editor.*
