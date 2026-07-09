# OpsEdge360

**Standalone enterprise observability platform**

OpsEdge360 unifies IT, OT, network, cloud, security, business transactions, digital twin, CMDB, compliance, and AI-assisted operations — **separate from LeadEdge360 and RetailEdge360**.

**Version:** 1.0.0 (GA)

See [docs/PRODUCT_IDENTITY.md](docs/PRODUCT_IDENTITY.md) for product boundaries.  
Release notes: [docs/RELEASE-NOTES-1.0.0.md](docs/RELEASE-NOTES-1.0.0.md).  
Execution history: [SPRINT_PLAN.md](SPRINT_PLAN.md).

## Quick Start

```bash
cp .env.example .env
docker compose --profile core up -d    # postgres + redis + kafka
npm install
npm run db:migrate
npm run dev
npm run dev:agents    # separate terminal
```

See **[docs/DEPLOYMENT-TOPOLOGY.md](docs/DEPLOYMENT-TOPOLOGY.md)** for SaaS / Hybrid / On-prem configuration.  
See **[docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md)** for implementation status.

- **Web UI**: http://localhost:3000
- **API Gateway**: http://localhost:4000
- **API Docs**: http://localhost:4000/api/docs
- **Platform config**: http://localhost:4000/api/v1/platform/config

## Repository Structure

```
OpsEdge360/
├── apps/
│   ├── web/                 # Next.js 14 executive & ops dashboards
│   └── api-gateway/         # NestJS API gateway (OpenAPI, auth, routing)
├── services/
│   ├── discovery/           # Universal Discovery Engine
│   ├── cmdb/                # Enterprise CMDB service
│   ├── observability/       # Metrics, logs, traces, network flows
│   └── compliance/          # Compliance & governance engine
├── ai-agents/               # Python LangGraph autonomous agents
├── packages/shared-types/   # Cross-service TypeScript contracts
├── database/                # Schemas, migrations, ER diagrams
├── openapi/                 # OpenAPI 3.1 specifications
├── infra/                   # Terraform, Helm, Kubernetes manifests
└── docs/                    # Product, architecture, operations docs
```

## Core Capabilities

| Module | Description |
|--------|-------------|
| Universal Discovery | Continuous asset discovery across IT, OT, cloud, network |
| Enterprise CMDB | Live configuration items, relationships, ownership |
| Digital Twin | Real-time enterprise topology visualization |
| Business Transactions | End-to-end transaction mapping & correlation |
| Observability | OpenTelemetry-native IT/OT/network monitoring |
| AI Agents | Autonomous discovery, RCA, remediation, compliance |
| Compliance | ISO, NIST, PCI, GDPR, RBI, NPCI framework validation |
| Fraud Detection | Adaptive baselines, behavioral analytics, explainable AI |
| Sustainability | Energy, carbon, PUE, efficiency recommendations |
| Executive BI | CIO/CISO/CFO dashboards with business impact metrics |
| Multi-Topology | SaaS, Hybrid, On-prem via env config (no code forks) |
| Performance | Redis/memory cache, tuned DB pools, horizontal scale ready |

## Documentation Index

| # | Document | Path |
|---|----------|------|
| 1 | Product Vision | [docs/01-PRODUCT-VISION.md](docs/01-PRODUCT-VISION.md) |
| 2 | Business Requirements (BRD) | [docs/02-BRD.md](docs/02-BRD.md) |
| 3 | Functional Requirements (FRS) | [docs/03-FRS.md](docs/03-FRS.md) |
| 4 | Non-Functional Requirements | [docs/04-NFR.md](docs/04-NFR.md) |
| 5 | Enterprise Architecture | [docs/architecture/05-ENTERPRISE-ARCHITECTURE.md](docs/architecture/05-ENTERPRISE-ARCHITECTURE.md) |
| 6 | Solution Architecture | [docs/architecture/06-SOLUTION-ARCHITECTURE.md](docs/architecture/06-SOLUTION-ARCHITECTURE.md) |
| 7 | C4 Diagrams | [docs/architecture/07-C4-DIAGRAMS.md](docs/architecture/07-C4-DIAGRAMS.md) |
| 8 | ER Diagrams | [database/schemas/ER-DIAGRAM.md](database/schemas/ER-DIAGRAM.md) |
| 9 | Database Design | [database/schemas/DATABASE-DESIGN.md](database/schemas/DATABASE-DESIGN.md) |
| 10 | Microservices Design | [docs/architecture/10-MICROSERVICES-DESIGN.md](docs/architecture/10-MICROSERVICES-DESIGN.md) |
| 11 | API Specifications | [openapi/trinetra360-v1.yaml](openapi/trinetra360-v1.yaml) |
| 12 | UI/UX Design System | [docs/12-DESIGN-SYSTEM.md](docs/12-DESIGN-SYSTEM.md) |
| 13 | Dashboard Wireframes | [docs/13-WIREFRAMES.md](docs/13-WIREFRAMES.md) |
| 14 | AI Agent Architecture | [docs/architecture/14-AI-AGENT-ARCHITECTURE.md](docs/architecture/14-AI-AGENT-ARCHITECTURE.md) |
| 15 | Digital Twin Architecture | [docs/architecture/15-DIGITAL-TWIN-ARCHITECTURE.md](docs/architecture/15-DIGITAL-TWIN-ARCHITECTURE.md) |
| 16 | CMDB Data Model | [database/schemas/CMDB-DATA-MODEL.md](database/schemas/CMDB-DATA-MODEL.md) |
| 17 | Security Architecture | [docs/architecture/17-SECURITY-ARCHITECTURE.md](docs/architecture/17-SECURITY-ARCHITECTURE.md) |
| 18 | Compliance Framework | [docs/18-COMPLIANCE-FRAMEWORK.md](docs/18-COMPLIANCE-FRAMEWORK.md) |
| 19 | Testing Strategy | [docs/19-TESTING-STRATEGY.md](docs/19-TESTING-STRATEGY.md) |
| 20 | CI/CD Pipeline | [.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml) |
| 21 | Infrastructure as Code | [infra/terraform/](infra/terraform/) |
| 22 | Production Deployment | [docs/guides/22-PRODUCTION-DEPLOYMENT.md](docs/guides/22-PRODUCTION-DEPLOYMENT.md) |
| 23 | Operations Manual | [docs/guides/23-OPERATIONS-MANUAL.md](docs/guides/23-OPERATIONS-MANUAL.md) |
| 24 | Administrator Guide | [docs/guides/24-ADMINISTRATOR-GUIDE.md](docs/guides/24-ADMINISTRATOR-GUIDE.md) |
| 25 | Developer Guide | [docs/guides/25-DEVELOPER-GUIDE.md](docs/guides/25-DEVELOPER-GUIDE.md) |
| 26 | End User Documentation | [docs/guides/26-END-USER-GUIDE.md](docs/guides/26-END-USER-GUIDE.md) |

## Technology Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, Cytoscape.js
- **Backend**: NestJS, Node.js, TypeScript
- **AI**: Python, LangGraph, MCP, RAG
- **Data**: PostgreSQL, MongoDB, Redis, Neo4j, OpenSearch
- **Messaging**: Apache Kafka, RabbitMQ
- **Observability**: OpenTelemetry, Prometheus, Grafana, Jaeger
- **Deployment**: Docker, Kubernetes, Helm, Terraform, GitHub Actions

## License

Proprietary — AsoftechInsightz © 2026
