/**
 * curriculum.ts — single source of truth for the learning system.
 *
 * Every topic in the platform is declared here, whether or not its content
 * has been written yet. Pages, the sidebar tree, the learning graph, and
 * "learn next" suggestions are all derived from this file.
 *
 * To "light up" a topic: add a markdown file in src/content/topics/ whose
 * filename matches the slug below. Nothing else needs to change.
 */

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Topic {
  slug: string;
  title: string;
  difficulty: Difficulty;
  /** slugs of topics that should be understood first */
  deps: string[];
  /** one-line description shown in cards, search, and the graph */
  summary: string;
}

export interface Section {
  id: string;
  /** short label used in eyebrows and the graph, e.g. "S0" or "L4" */
  code: string;
  title: string;
  intro: string;
  topics: Topic[];
}

export const sections: Section[] = [
  {
    id: 'section-0',
    code: 'S0',
    title: 'Core Backend Foundations',
    intro:
      'The substrate everything else is built on. If a concept in Levels 1–10 feels hazy, the missing piece is almost always here.',
    topics: [
      { slug: 'computing-runtime-basics', title: 'Computing & Runtime Basics', difficulty: 'beginner', deps: [], summary: 'Processes, threads, memory, the event loop — what your code actually runs on.' },
      { slug: 'networking-fundamentals', title: 'Networking Fundamentals', difficulty: 'beginner', deps: [], summary: 'TCP, TLS, DNS, HTTP — the path a request really takes.' },
      { slug: 'api-design', title: 'API Design', difficulty: 'intermediate', deps: ['networking-fundamentals'], summary: 'Contracts between systems: resources, versioning, idempotency, pagination.' },
      { slug: 'data-modeling-databases', title: 'Data Modeling & Databases', difficulty: 'intermediate', deps: ['computing-runtime-basics'], summary: 'Schemas, indexes, transactions, and choosing the right storage engine.' },
      { slug: 'backend-architecture', title: 'Backend Architecture', difficulty: 'intermediate', deps: ['api-design', 'data-modeling-databases'], summary: 'Layering, boundaries, and how a service is shaped internally.' },
      { slug: 'state-management', title: 'State Management', difficulty: 'intermediate', deps: ['data-modeling-databases'], summary: 'Where state lives, who owns it, and why stateless services scale.' },
      { slug: 'authn-authz', title: 'Authentication & Authorization', difficulty: 'intermediate', deps: ['api-design'], summary: 'Sessions, tokens, OAuth, and permission models that survive growth.' },
      { slug: 'caching-performance', title: 'Caching & Performance', difficulty: 'intermediate', deps: ['networking-fundamentals', 'data-modeling-databases'], summary: 'Cache layers, invalidation, and the latency budget of a request.' },
      { slug: 'concurrency-async', title: 'Concurrency & Async Processing', difficulty: 'advanced', deps: ['computing-runtime-basics'], summary: 'Threads, queues, races, backpressure — doing many things safely at once.' },
      { slug: 'error-handling-resilience', title: 'Error Handling & Resilience', difficulty: 'intermediate', deps: ['api-design', 'concurrency-async'], summary: 'Timeouts, retries, circuit breakers — designing for partial failure.' },
      { slug: 'observability', title: 'Observability', difficulty: 'intermediate', deps: ['backend-architecture'], summary: 'Logs, metrics, traces — answering "why is it slow?" in production.' },
      { slug: 'testing', title: 'Testing', difficulty: 'beginner', deps: ['backend-architecture'], summary: 'Unit, integration, contract — a test strategy that earns its runtime.' },
      { slug: 'deployment-cicd', title: 'Deployment & CI/CD', difficulty: 'intermediate', deps: ['testing'], summary: 'From commit to production: pipelines, environments, rollback.' },
      { slug: 'software-quality', title: 'Software Quality', difficulty: 'beginner', deps: ['testing'], summary: 'Code review, static analysis, and the habits that keep entropy down.' },
    ],
  },
  {
    id: 'level-1',
    code: 'L1',
    title: 'Foundations of Software Engineering',
    intro: 'Modules, coupling, cohesion, and the economics of change.',
    topics: [
      { slug: 'modularity-coupling', title: 'Modularity & Coupling', difficulty: 'beginner', deps: ['software-quality'], summary: 'Why change cost — not elegance — is the real measure of design.' },
      { slug: 'abstraction-boundaries', title: 'Abstraction & Boundaries', difficulty: 'intermediate', deps: ['modularity-coupling'], summary: 'Deep modules, leaky abstractions, and where to draw the line.' },
    ],
  },
  {
    id: 'level-2',
    code: 'L2',
    title: 'Domain Modeling (DDD)',
    intro: 'Making the business legible in code: entities, aggregates, bounded contexts.',
    topics: [
      { slug: 'ddd-strategic', title: 'Strategic DDD', difficulty: 'intermediate', deps: ['abstraction-boundaries'], summary: 'Bounded contexts, context maps, and ubiquitous language.' },
      { slug: 'ddd-tactical', title: 'Tactical DDD', difficulty: 'advanced', deps: ['ddd-strategic', 'data-modeling-databases'], summary: 'Entities, value objects, aggregates, and domain events.' },
    ],
  },
  {
    id: 'level-3',
    code: 'L3',
    title: 'Architecture Patterns',
    intro: 'Hexagonal, layered, event-driven, CQRS — patterns as trade-off bundles.',
    topics: [
      { slug: 'hexagonal-architecture', title: 'Hexagonal Architecture', difficulty: 'intermediate', deps: ['abstraction-boundaries', 'backend-architecture'], summary: 'Ports and adapters: isolating the domain from the outside world.' },
      { slug: 'event-driven-architecture', title: 'Event-Driven Architecture', difficulty: 'advanced', deps: ['concurrency-async', 'ddd-tactical'], summary: 'Events as the backbone: pub/sub, event sourcing, eventual consistency.' },
      { slug: 'cqrs', title: 'CQRS', difficulty: 'advanced', deps: ['event-driven-architecture'], summary: 'Splitting reads from writes — when it pays off and when it hurts.' },
    ],
  },
  {
    id: 'level-4',
    code: 'L4',
    title: 'Distributed Computing',
    intro: 'What breaks when one machine becomes many: time, ordering, consensus.',
    topics: [
      { slug: 'fallacies-distributed', title: 'Fallacies of Distributed Computing', difficulty: 'intermediate', deps: ['networking-fundamentals'], summary: 'The eight assumptions that quietly destroy distributed designs.' },
      { slug: 'consistency-models', title: 'Consistency Models', difficulty: 'advanced', deps: ['fallacies-distributed', 'state-management'], summary: 'Linearizability to eventual: what "consistent" actually promises.' },
      { slug: 'consensus', title: 'Consensus (Raft, Paxos)', difficulty: 'advanced', deps: ['consistency-models'], summary: 'How machines agree on anything when any of them can fail.' },
    ],
  },
  {
    id: 'level-5',
    code: 'L5',
    title: 'Distributed Systems Architecture',
    intro: 'Composing services: microservices, sagas, gateways, service meshes.',
    topics: [
      { slug: 'microservices', title: 'Microservices', difficulty: 'advanced', deps: ['networking-fundamentals', 'api-design', 'ddd-strategic'], summary: 'Service boundaries, data ownership, and the cost of distribution.' },
      { slug: 'sagas-distributed-tx', title: 'Sagas & Distributed Transactions', difficulty: 'advanced', deps: ['microservices', 'event-driven-architecture'], summary: 'Keeping multi-service workflows correct without two-phase commit.' },
      { slug: 'api-gateways-meshes', title: 'API Gateways & Service Meshes', difficulty: 'advanced', deps: ['microservices', 'caching-performance'], summary: 'The traffic layer: routing, auth offload, retries, mTLS.' },
    ],
  },
  {
    id: 'level-6',
    code: 'L6',
    title: 'Cloud Computing',
    intro: 'Elastic infrastructure: compute models, managed services, cost as a constraint.',
    topics: [
      { slug: 'cloud-compute-models', title: 'Compute Models (VMs → Serverless)', difficulty: 'intermediate', deps: ['deployment-cicd'], summary: 'VMs, containers, functions — the control/operations trade-off.' },
      { slug: 'cloud-native-patterns', title: 'Cloud-Native Patterns', difficulty: 'advanced', deps: ['cloud-compute-models', 'error-handling-resilience'], summary: 'Autoscaling, queues as shock absorbers, designing for spot failure.' },
    ],
  },
  {
    id: 'level-7',
    code: 'L7',
    title: 'Actor Systems',
    intro: 'State + behavior + mailbox: concurrency without shared memory.',
    topics: [
      { slug: 'actor-model', title: 'The Actor Model', difficulty: 'advanced', deps: ['concurrency-async', 'state-management'], summary: 'Actors, mailboxes, supervision — Erlang/Akka/Orleans thinking.' },
      { slug: 'virtual-actors', title: 'Virtual Actors & Digital Twins', difficulty: 'advanced', deps: ['actor-model', 'microservices'], summary: 'Orleans-style grains: location-transparent stateful entities.' },
    ],
  },
  {
    id: 'level-8',
    code: 'L8',
    title: 'Security',
    intro: 'Threat models, trust boundaries, and security as an architectural property.',
    topics: [
      { slug: 'threat-modeling', title: 'Threat Modeling', difficulty: 'intermediate', deps: ['authn-authz'], summary: 'STRIDE, trust boundaries, and thinking like an attacker early.' },
      { slug: 'zero-trust', title: 'Zero Trust Architecture', difficulty: 'advanced', deps: ['threat-modeling', 'api-gateways-meshes'], summary: 'Never trust the network: identity-based access everywhere.' },
    ],
  },
  {
    id: 'level-9',
    code: 'L9',
    title: 'World-Class Coding',
    intro: 'The craft layer: code that other engineers can extend without fear.',
    topics: [
      { slug: 'deep-modules', title: 'Deep Modules & Information Hiding', difficulty: 'intermediate', deps: ['abstraction-boundaries'], summary: 'Small interfaces over big functionality — Ousterhout in practice.' },
      { slug: 'evolutionary-code', title: 'Evolutionary Code & Refactoring', difficulty: 'advanced', deps: ['deep-modules', 'testing'], summary: 'Strangler figs, seams, and changing systems safely while they run.' },
    ],
  },
  {
    id: 'level-10',
    code: 'L10',
    title: 'CI/CD',
    intro: 'Delivery as a system: pipelines, progressive rollout, deploy-time safety.',
    topics: [
      { slug: 'pipeline-architecture', title: 'Pipeline Architecture', difficulty: 'intermediate', deps: ['deployment-cicd'], summary: 'Stages, gates, artifacts — pipelines as production software.' },
      { slug: 'progressive-delivery', title: 'Progressive Delivery', difficulty: 'advanced', deps: ['pipeline-architecture', 'observability'], summary: 'Canaries, feature flags, automatic rollback on bad signals.' },
    ],
  },
];

/** Flat list of all topics with their section attached. */
export const allTopics = sections.flatMap((s) =>
  s.topics.map((t) => ({ ...t, section: s }))
);

export type TopicWithSection = (typeof allTopics)[number];

export function findTopic(slug: string): TopicWithSection | undefined {
  return allTopics.find((t) => t.slug === slug);
}

/** Topics that list `slug` as a dependency — i.e. natural "learn next" candidates. */
export function dependentsOf(slug: string): TopicWithSection[] {
  return allTopics.filter((t) => t.deps.includes(slug));
}

export const difficultyLabel: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};
