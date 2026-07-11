import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
import { HealthController } from './health.controller';
import { ExecutiveController } from './executive.controller';
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

@Module({
  controllers: [
    HealthController,
    AuthController,
    SsoController,
    CopilotController,
    ExecutiveController,
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
  ],
  providers: [
    ProxyService,
    CacheService,
    AuthService,
    SsoService,
    CopilotService,
    Reflector,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: AuthorizationGuard },
    { provide: APP_FILTER, useClass: SecurityExceptionFilter },
  ],
})
export class AppModule {}
