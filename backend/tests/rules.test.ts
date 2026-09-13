import { describe, expect, it } from "vitest";

import { findRule, listRules, runRules } from "@/rules/registry";
import { component, connection, graph, requirement, scaleRequirement, uuidFor } from "./helpers/graph";
import type { ArchitectureGraph } from "@/validation/architecture.schemas";

function evaluate(ruleId: string, architecture: ArchitectureGraph) {
  const rule = findRule(ruleId);
  if (!rule) throw new Error(`Unknown rule ${ruleId}`);
  return rule.evaluate(architecture);
}

describe("rule registry", () => {
  it("exposes unique, stable rule IDs across all six dimensions", () => {
    const ids = listRules().map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(listRules().map((rule) => rule.dimension))).toEqual(
      new Set(["scalability", "reliability", "performance", "security", "cost", "simplicity"]),
    );
    // Exact expected set: the frontend fast subset asserts the same IDs (drift guard).
    expect(new Set(ids)).toEqual(
      new Set([
        "scalability.load_balancer_missing",
        "scalability.cache_missing",
        "scalability.messaging_consumer_missing",
        "scalability.horizontal_scaling_missing",
        "reliability.database_replication_missing",
        "reliability.single_point_of_failure",
        "performance.database_hotspot",
        "performance.synchronous_path_long",
        "security.authentication_missing",
        "security.rate_limiter_missing",
        "cost.premature_event_stream",
        "cost.premature_orchestration",
        "simplicity.overengineered_stack",
        "simplicity.multiple_databases_unjustified",
        "simplicity.premature_microservices",
      ]),
    );
  });
});

describe("scalability rules", () => {
  it("load_balancer_missing: fires with two APIs and no distribution layer, not otherwise", () => {
    const missing = evaluate(
      "scalability.load_balancer_missing",
      graph({ components: [component("a1", "api_service"), component("a2", "api_service")] }),
    );
    expect(missing).toHaveLength(1);
    expect(missing[0]?.affected_entity_ids).toEqual([uuidFor("a1"), uuidFor("a2")]);

    expect(evaluate("scalability.load_balancer_missing", graph({ components: [component("a1", "api_service")] }))).toHaveLength(0);
    expect(
      evaluate(
        "scalability.load_balancer_missing",
        graph({ components: [component("a1", "api_service"), component("a2", "api_service"), component("lb", "load_balancer")] }),
      ),
    ).toHaveLength(0);
  });

  it("cache_missing: fires for large designs, stays quiet for modest ones", () => {
    const large = graph({
      components: [component("api", "api_service"), component("db", "postgresql")],
      requirements: [scaleRequirement(1_000_000)],
    });
    expect(evaluate("scalability.cache_missing", large)).toHaveLength(1);

    const withCache = graph({
      components: [component("api", "api_service"), component("db", "postgresql"), component("cache", "redis")],
      requirements: [scaleRequirement(1_000_000)],
    });
    expect(evaluate("scalability.cache_missing", withCache)).toHaveLength(0);

    const modest = graph({
      components: [component("api", "api_service"), component("db", "postgresql")],
      requirements: [scaleRequirement(10)],
    });
    expect(evaluate("scalability.cache_missing", modest)).toHaveLength(0);
  });

  it("messaging_consumer_missing: fires without a consumer edge", () => {
    const orphan = graph({
      components: [component("k", "kafka"), component("api", "api_service")],
      connections: [connection("e", "api", "k", "event_flow")],
    });
    expect(evaluate("scalability.messaging_consumer_missing", orphan)).toHaveLength(1);

    const consumed = graph({
      components: [component("k", "kafka"), component("w", "worker")],
      connections: [connection("e", "k", "w", "event_flow")],
    });
    expect(evaluate("scalability.messaging_consumer_missing", consumed)).toHaveLength(0);
  });

  it("horizontal_scaling_missing: only for high, explicit scale targets", () => {
    const high = graph({
      components: [component("api", "api_service")],
      requirements: [scaleRequirement(1_000_000)],
    });
    expect(evaluate("scalability.horizontal_scaling_missing", high)).toHaveLength(1);

    const low = graph({
      components: [component("api", "api_service")],
      requirements: [scaleRequirement(10)],
    });
    expect(evaluate("scalability.horizontal_scaling_missing", low)).toHaveLength(0);
  });
});

describe("reliability rules", () => {
  it("database_replication_missing: fires for availability targets without replication", () => {
    const risky = graph({
      components: [component("db", "postgresql")],
      requirements: [requirement("availability", "must survive region failure")],
    });
    expect(evaluate("reliability.database_replication_missing", risky)).toHaveLength(1);

    const replicated = graph({
      components: [component("db", "postgresql"), component("replica", "postgresql")],
      connections: [connection("rep", "db", "replica", "replication")],
      requirements: [requirement("availability", "must survive region failure")],
    });
    expect(evaluate("reliability.database_replication_missing", replicated)).toHaveLength(0);
  });

  it("single_point_of_failure: fires for one API under an availability target", () => {
    const risky = graph({
      components: [component("api", "api_service")],
      requirements: [requirement("availability", "99.99%")],
    });
    expect(evaluate("reliability.single_point_of_failure", risky)).toHaveLength(1);

    const redundant = graph({
      components: [component("api", "api_service"), component("lb", "load_balancer")],
      requirements: [requirement("availability", "99.99%")],
    });
    expect(evaluate("reliability.single_point_of_failure", redundant)).toHaveLength(0);
  });
});

describe("performance rules", () => {
  it("database_hotspot: fires with three direct readers and no cache", () => {
    const hot = graph({
      components: [
        component("db", "postgresql"),
        component("a", "api_service"),
        component("b", "worker"),
        component("c", "search_service"),
      ],
      connections: [
        connection("e1", "a", "db", "data_flow"),
        connection("e2", "b", "db", "data_flow"),
        connection("e3", "c", "db", "data_flow"),
      ],
    });
    expect(evaluate("performance.database_hotspot", hot)).toHaveLength(1);

    const cached = graph({
      ...hot,
      components: [...hot.components, component("cache", "redis")],
    });
    expect(evaluate("performance.database_hotspot", cached)).toHaveLength(0);
  });

  it("synchronous_path_long: fires at four or more synchronous hops", () => {
    const long = graph({
      components: [
        component("a", "load_balancer"),
        component("b", "api_service"),
        component("c", "authentication"),
        component("d", "postgresql"),
        component("e", "worker"),
      ],
      connections: [
        connection("e1", "a", "b"),
        connection("e2", "b", "c"),
        connection("e3", "c", "d"),
        connection("e4", "d", "e"),
      ],
    });
    expect(evaluate("performance.synchronous_path_long", long)).toHaveLength(1);

    const short = graph({
      components: [component("a", "load_balancer"), component("b", "api_service"), component("c", "postgresql")],
      connections: [connection("e1", "a", "b"), connection("e2", "b", "c")],
    });
    expect(evaluate("performance.synchronous_path_long", short)).toHaveLength(0);
  });
});

describe("security rules", () => {
  it("authentication_missing: fires without an auth component", () => {
    expect(evaluate("security.authentication_missing", graph({ components: [component("api", "api_service")] }))).toHaveLength(1);
    expect(
      evaluate(
        "security.authentication_missing",
        graph({ components: [component("api", "api_service"), component("auth", "authentication")] }),
      ),
    ).toHaveLength(0);
  });

  it("rate_limiter_missing: fires without rate limiting or a WAF", () => {
    expect(evaluate("security.rate_limiter_missing", graph({ components: [component("api", "api_service")] }))).toHaveLength(1);
    expect(
      evaluate(
        "security.rate_limiter_missing",
        graph({ components: [component("api", "api_service"), component("rl", "rate_limiter")] }),
      ),
    ).toHaveLength(0);
  });
});

describe("cost and simplicity guardrails (context.md §59)", () => {
  it("cost.premature_event_stream: fires for small explicit scale only", () => {
    const small = graph({
      components: [component("k", "kafka")],
      requirements: [scaleRequirement(10)],
    });
    expect(evaluate("cost.premature_event_stream", small)).toHaveLength(1);

    const large = graph({
      components: [component("k", "kafka")],
      requirements: [scaleRequirement(10_000_000)],
    });
    expect(evaluate("cost.premature_event_stream", large)).toHaveLength(0);

    const unknown = graph({ components: [component("k", "kafka")] });
    expect(evaluate("cost.premature_event_stream", unknown)).toHaveLength(0);
  });

  it("cost.premature_orchestration: fires for small explicit scale only", () => {
    const small = graph({
      components: [component("k8s", "kubernetes_cluster")],
      requirements: [scaleRequirement(10)],
    });
    expect(evaluate("cost.premature_orchestration", small)).toHaveLength(1);
  });

  it("simplicity.overengineered_stack: fires for several heavy components at small scale", () => {
    const overbuilt = graph({
      components: [component("k", "kafka"), component("k8s", "kubernetes_cluster")],
      requirements: [scaleRequirement(100)],
    });
    expect(evaluate("simplicity.overengineered_stack", overbuilt)).toHaveLength(1);

    const justified = graph({
      components: [component("k", "kafka"), component("k8s", "kubernetes_cluster")],
      requirements: [scaleRequirement(5_000_000)],
    });
    expect(evaluate("simplicity.overengineered_stack", justified)).toHaveLength(0);
  });

  it("simplicity.multiple_databases_unjustified: fires without a stated reason", () => {
    const twoDbs = graph({
      components: [component("pg", "postgresql"), component("my", "mysql")],
    });
    expect(evaluate("simplicity.multiple_databases_unjustified", twoDbs)).toHaveLength(1);

    const justified = graph({
      components: [component("pg", "postgresql"), component("my", "mysql")],
      requirements: [requirement("consistency", "strong consistency required")],
    });
    expect(evaluate("simplicity.multiple_databases_unjustified", justified)).toHaveLength(0);
  });

  it("simplicity.premature_microservices: fires for service sprawl at small scale", () => {
    const services = Array.from({ length: 7 }, (_, index) =>
      component(`s${index}`, "user_service", { category: "services" }),
    );
    const sprawl = graph({ components: services, requirements: [scaleRequirement(100)] });
    expect(evaluate("simplicity.premature_microservices", sprawl)).toHaveLength(1);

    const scaled = graph({ components: services, requirements: [scaleRequirement(5_000_000)] });
    expect(evaluate("simplicity.premature_microservices", scaled)).toHaveLength(0);
  });

  it("a 10-user design never receives growth recommendations", () => {
    const tiny = graph({
      components: [component("api", "api_service"), component("db", "postgresql")],
      requirements: [scaleRequirement(10)],
    });
    const findings = runRules(tiny).map((finding) => finding.rule_id);
    expect(findings).not.toContain("scalability.cache_missing");
    expect(findings).not.toContain("scalability.horizontal_scaling_missing");
    expect(findings).not.toContain("reliability.single_point_of_failure");
  });
});
