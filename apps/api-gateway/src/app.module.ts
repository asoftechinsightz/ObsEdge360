import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
import { HealthController } from './health.controller';
import { ExecutiveController } from './executive.controller';
import { DashboardController } from './dashboard/dashboard.controller';
import { CmdbProxyController } from './cmdb-proxy.controller';
import { DiscoveryProxyController } from './discovery-proxy.controller';
import { TwinController } from './twin.controller';
import { ComplianceController } from './compliance.controller';
import { AgentsController } from './agents.controller';
import { ObservabilityController } from './observability.controller';
import { TransactionsController } from './transactions.controller';
import { NetworkController } from './network.controller';
import { SecurityController } from './security.controller';
import { RemediationController } from './remediation.controller';
import { SustainabilityController } from './sustainability.controller';
import { AnalyticsController } from './analytics.controller';
import { QuantumController } from './quantum.controller';
import { GovernanceController } from './governance.controller';
import { PlatformController } from './platform.controller';
import { CacheService } from './cache/cache.service';
import { ProxyService } from './proxy.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthGuard } from './auth/auth.guard';
import { AuthorizationGuard } from './auth/authorization.guard';
import { SecurityExceptionFilter } from './auth/security-exception.filter';
import { SsoController } from './auth/sso.controller';
import { SsoService } from './auth/sso.service';
import { CopilotController } from './copilot/copilot.controller';
import { CopilotService } from './copilot/copilot.service';
import { AuditController } from './audit/audit.controller';
import { AuditEvidenceWriterService } from './audit/audit-evidence-writer.service';
import { SecretsController } from './secrets/secrets.controller';
import { SecretsRotationScheduler } from './secrets/secrets-rotation.scheduler';
import { TrustController } from './trust/trust.controller';
import { TrustMeshController } from './trust/trust-mesh.controller';
import { SecurityObservabilityController } from './security-observability/security-observability.controller';
import { MeshBootstrapService } from './trust/mesh-bootstrap.service';
import { UaController } from './ua/ua.controller';
import { OpsIntelligenceController } from './ops-intelligence.controller';
import { DashboardsController } from './dashboards.controller';
import { AiController } from './ai.controller';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { HaService } from './admin/ha.service';
import { GovernanceService } from './admin/governance.service';
import { AutomationController } from './admin/automation.controller';
import { AutomationService } from './admin/automation.service';
import { IntegrationsController } from './admin/integrations.controller';
import { IntegrationsService } from './admin/integrations.service';
import { Wave6Controller } from './admin/wave6.controller';
import { Wave6Service } from './admin/wave6.service';
import { Wave7Controller } from './admin/wave7.controller';
import { Wave7Service } from './admin/wave7.service';
import { Wave8Controller } from './admin/wave8.controller';
import { Wave8Service } from './admin/wave8.service';
import { Wave9Controller } from './admin/wave9.controller';
import { Wave9Service } from './admin/wave9.service';
import { SyntheticsController } from './synthetics/synthetics.controller';
import { SyntheticsService } from './synthetics/synthetics.service';
import { Phase2Controller } from './phase2/phase2.controller';
import { Phase3Controller } from './phase3/phase3.controller';
import { Phase3Service } from './phase3/phase3.service';
import { Phase4Controller } from './phase4/phase4.controller';
import { Phase4Service } from './phase4/phase4.service';
import { Rc2Controller } from './rc2/rc2.controller';
import { Rc2Service } from './rc2/rc2.service';
import { Rc3Controller } from './rc3/rc3.controller';
import { Rc3Service } from './rc3/rc3.service';
import { EdeController } from './ede/ede.controller';
import { EdeSeedService } from './ede/ede-seed.service';
import { DashboardAggregationService } from './dashboard/dashboard-aggregation.service';
import { DashboardCacheService } from './dashboard/dashboard-cache.service';
import { DashboardRulesService } from './dashboard/dashboard-rules.service';
import { ExecutiveDataService } from './dashboard/executive-data.service';
import { EstateService } from './dashboard/estate.service';
import { ObserveService } from './dashboard/observe.service';
import { ComplianceService as DashboardComplianceService } from './dashboard/compliance.service';
import { SecurityService as DashboardSecurityService } from './dashboard/security.service';
import { NetworkService as DashboardNetworkService } from './dashboard/network.service';
import { AiInsightService } from './dashboard/ai-insight.service';
import { WidgetRegistryService } from './dashboard/widget-registry.service';

@Module({
  controllers: [
    HealthController,
    AuthController,
    SsoController,
    CopilotController,
    ExecutiveController,
    DashboardController,
    CmdbProxyController,
    DiscoveryProxyController,
    TwinController,
    ComplianceController,
    AgentsController,
    ObservabilityController,
    TransactionsController,
    NetworkController,
    SecurityController,
    RemediationController,
    SustainabilityController,
    AnalyticsController,
    QuantumController,
    GovernanceController,
    PlatformController,
    Phase2Controller,
    Phase3Controller,
    Phase4Controller,
    Rc2Controller,
    Rc3Controller,
    EdeController,
    SyntheticsController,
    AuditController,
    SecretsController,
    TrustController,
    TrustMeshController,
    SecurityObservabilityController,
    UaController,
    OpsIntelligenceController,
    DashboardsController,
    AiController,
    AdminController,
    AutomationController,
    IntegrationsController,
    Wave6Controller,
    Wave7Controller,
    Wave8Controller,
    Wave9Controller,
  ],
  providers: [
    ProxyService,
    CacheService,
    AuthService,
    SsoService,
    CopilotService,
    AuditEvidenceWriterService,
    SecretsRotationScheduler,
    MeshBootstrapService,
    AdminService,
    HaService,
    GovernanceService,
    AutomationService,
    IntegrationsService,
    Wave6Service,
    Wave7Service,
    Wave8Service,
    Wave9Service,
    SyntheticsService,
    Phase3Service,
    Phase4Service,
    Rc2Service,
    Rc3Service,
    EdeSeedService,
    DashboardAggregationService,
    DashboardCacheService,
    DashboardRulesService,
    ExecutiveDataService,
    EstateService,
    ObserveService,
    DashboardComplianceService,
    DashboardSecurityService,
    DashboardNetworkService,
    AiInsightService,
    WidgetRegistryService,
    Reflector,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: AuthorizationGuard },
    { provide: APP_FILTER, useClass: SecurityExceptionFilter },
  ],
})
export class AppModule {}
