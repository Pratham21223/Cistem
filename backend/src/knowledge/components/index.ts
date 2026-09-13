/**
 * Component library barrel. One JSON file per component (`architecture.md` §7.4);
 * the explicit import list keeps the whole set type-checked and bundled.
 */
import dns from "./dns.json" with { type: "json" };
import cdn from "./cdn.json" with { type: "json" };
import loadBalancer from "./load_balancer.json" with { type: "json" };
import apiGateway from "./api_gateway.json" with { type: "json" };
import reverseProxy from "./reverse_proxy.json" with { type: "json" };
import waf from "./waf.json" with { type: "json" };
import rateLimiter from "./rate_limiter.json" with { type: "json" };
import apiService from "./api_service.json" with { type: "json" };
import worker from "./worker.json" with { type: "json" };
import container from "./container.json" with { type: "json" };
import serverlessFunction from "./serverless_function.json" with { type: "json" };
import kubernetesCluster from "./kubernetes_cluster.json" with { type: "json" };
import postgresql from "./postgresql.json" with { type: "json" };
import mysql from "./mysql.json" with { type: "json" };
import mongodb from "./mongodb.json" with { type: "json" };
import cassandra from "./cassandra.json" with { type: "json" };
import dynamodb from "./dynamodb.json" with { type: "json" };
import redis from "./redis.json" with { type: "json" };
import elasticsearch from "./elasticsearch.json" with { type: "json" };
import objectStorage from "./object_storage.json" with { type: "json" };
import kafka from "./kafka.json" with { type: "json" };
import rabbitmq from "./rabbitmq.json" with { type: "json" };
import queue from "./queue.json" with { type: "json" };
import eventBus from "./event_bus.json" with { type: "json" };
import authentication from "./authentication.json" with { type: "json" };
import userService from "./user_service.json" with { type: "json" };
import paymentService from "./payment_service.json" with { type: "json" };
import notificationService from "./notification_service.json" with { type: "json" };
import searchService from "./search_service.json" with { type: "json" };
import recommendationService from "./recommendation_service.json" with { type: "json" };
import mediaService from "./media_service.json" with { type: "json" };
import fileProcessing from "./file_processing.json" with { type: "json" };
import logging from "./logging.json" with { type: "json" };
import monitoring from "./monitoring.json" with { type: "json" };
import metrics from "./metrics.json" with { type: "json" };
import tracing from "./tracing.json" with { type: "json" };
import alerting from "./alerting.json" with { type: "json" };
import identityProvider from "./identity_provider.json" with { type: "json" };
import secretsManager from "./secrets_manager.json" with { type: "json" };

export const knowledgeComponentFiles: unknown[] = [
  dns,
  cdn,
  loadBalancer,
  apiGateway,
  reverseProxy,
  waf,
  rateLimiter,
  apiService,
  worker,
  container,
  serverlessFunction,
  kubernetesCluster,
  postgresql,
  mysql,
  mongodb,
  cassandra,
  dynamodb,
  redis,
  elasticsearch,
  objectStorage,
  kafka,
  rabbitmq,
  queue,
  eventBus,
  authentication,
  userService,
  paymentService,
  notificationService,
  searchService,
  recommendationService,
  mediaService,
  fileProcessing,
  logging,
  monitoring,
  metrics,
  tracing,
  alerting,
  identityProvider,
  secretsManager,
];
