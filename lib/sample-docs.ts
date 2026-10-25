export interface SampleDoc {
  id: string;
  title: string;
  description: string;
  markdown: string;
}

export const SAMPLE_DOCS: SampleDoc[] = [
  {
    id: 'technical-spec',
    title: 'System Architecture Specification',
    description: 'Headings, tables, syntax-highlighted code, blockquotes, and lists',
    markdown: `# Cloud Migration & Architecture Specification
**Document Version:** 2.4.0  
**Status:** Approved for Implementation  
**Author:** Lead Systems Architect

---

## 1. Executive Summary

This document specifies the technical architecture for transitioning our monolith infrastructure to a distributed event-driven cloud architecture. The goals are **99.99% availability**, sub-50ms latency, and automated elastic scalability.

> **Architecture Principle:** Every service must be stateless, horizontally scalable, and isolated behind contract-first REST and gRPC endpoints.

---

## 2. Infrastructure Topology Matrix

The following component distribution represents target deployment clusters:

| Component | Target Runtime | Resilience Tier | Auto-scale Threshold |
| :--- | :--- | :---: | :--- |
| **API Gateway** | Envoy Proxy (K8s) | Multi-AZ Active | 75% CPU / 12k Req/sec |
| **Auth Engine** | Node.js 20 LTS | Multi-Region Active | 65% CPU Utilization |
| **Data Lake** | PostgreSQL 16 HA | Hot Standby Replication | Dynamic Storage Auto-grow |
| **Cache Tier** | Redis Cluster | Multi-AZ Failover | Memory Cap 80% |

---

## 3. Core Implementation

Here is the event ingestion handler implemented in TypeScript:

\`\`\`typescript
import { createServer, IncomingMessage, ServerResponse } from 'http';

interface HealthReport {
  status: 'healthy' | 'degraded';
  uptimeSeconds: number;
  timestamp: string;
}

export function handleHealthCheck(req: IncomingMessage, res: ServerResponse): void {
  const report: HealthReport = {
    status: 'healthy',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(report, null, 2));
}
\`\`\`

---

## 4. Key Deployment Milestones

The rollout will follow a 4-phase canary release:

1. **Phase 1: Canary Sandbox (10% Traffic)**
   - Verify zero regression in p99 latency
   - Validate distributed tracing across spans
2. **Phase 2: Regional Beta (30% Traffic)**
   - Monitor database connection pools
   - Confirm cross-region replication lag < 100ms
3. **Phase 3: General Production (100% Traffic)**
   - Deprecate legacy ingress routes
   - Archive initial database snapshots

---

## 5. Security & Governance

- All payloads encrypted with **AES-256-GCM** at rest.
- Strict TLS 1.3 enforcement with HSTS headers.
- Automated vulnerability scanning integrated in the CI/CD pipeline.

*Confidential & Proprietary - Cloud Engineering Operations*
`,
  },
  {
    id: 'meeting-notes',
    title: 'Quarterly Product Strategy Review',
    description: 'Clean formatting, bullet points, task lists, and quotes',
    markdown: `# Q4 Product Roadmap & Strategic Initiatives
**Date:** October 25, 2026  
**Attendees:** Product Management, Engineering Leads, Design Team  

---

## Strategic Objectives

Our focus for this quarter revolves around three key pillars:

- **User Velocity:** Cut down workflow completion time by 40%.
- **Reliability:** Maintain four nines uptime across document pipelines.
- **Developer Experience:** Deliver SDKs and comprehensive documentation.

> *"Simplicity is prerequisite for reliability."* — Edsger W. Dijkstra

---

## Action Items & Ownership

| Priority | Initiative | Owner | Target Date |
| :--- | :--- | :--- | :--- |
| 🔴 High | Multi-document batch processing engine | Engineering | Nov 15 |
| 🟡 Medium | Modern Dark & Light theme redesign | UX Design | Nov 20 |
| 🟢 Low | Interactive live markdown preview | Frontend | Dec 01 |

---

## Summary of Decisions

1. Adopt unified document parser for DOCX, PDF, and Markdown.
2. Provide immediate one-click batch ZIP exports.
3. Automatically detect scanned PDFs and inform users clearly.
`,
  },
];
