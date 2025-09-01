/**
 * =============================================================================
 * AI CRYPTO TRADING AGENT - ORCHESTRATION MODULE INDEX
 * =============================================================================
 * 
 * This module exports all orchestration components for system integration
 * and coordination. It provides a unified interface for system lifecycle
 * management, dependency injection, and inter-component communication.
 * 
 * @author AI Crypto Trading System
 * @version 1.0.0
 * @license PROPRIETARY
 * =============================================================================
 */

// System Orchestrator
export {
  SystemOrchestrator,
  SystemComponent,
  ComponentStatus,
  ComponentHealth,
  ComponentMetrics,
  OrchestrationConfig,
  OrchestrationEvents,
  defaultOrchestrationConfig
} from './system-orchestrator';

// Dependency Manager
export {
  DependencyManager,
  DependencyConfig,
  DependencyMetadata,
  DependencyStatus,
  DependencyToken,
  DependencyFactory,
  ResolutionContext,
  DependencyTokens,
  dependencyManager,
  Inject,
  registerSingleton,
  registerTransient
} from './dependency-manager';

// Communication Bus
export {
  CommunicationBus,
  Message,
  MessageMetadata,
  MessagePriority,
  MessageHandler,
  Subscription,
  SubscriptionOptions,
  SubscriptionStats,
  CommunicationBusConfig,
  DeliveryResult,
  defaultCommunicationBusConfig,
  communicationBus
} from './communication-bus';

// System Health Monitor
export {
  SystemHealthMonitor,
  SystemHealthStatus,
  HealthCheckResult,
  HealthIssue,
  SystemMetrics,
  HealthMonitorConfig,
  defaultHealthMonitorConfig
} from './system-health-monitor';

// =============================================================================
// ORCHESTRATION MODULE NOTES
// =============================================================================
// 1. Comprehensive system orchestration with dependency management
// 2. Event-driven inter-component communication
// 3. Health monitoring and automatic recovery capabilities
// 4. Dependency injection with circular dependency detection
// 5. Message queuing with priority-based processing
// 6. System metrics collection and alerting
// 7. Graceful startup and shutdown procedures
// 8. Component lifecycle management and coordination
// =============================================================================