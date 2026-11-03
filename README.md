<div align="center">

# 🛡️ CIVICGUARD
### Real-Time Public Safety, Asset Recovery & Command Intelligence Platform

[![DevSecOps CI/CD](https://github.com/SajithDevPro/civicguard/actions/workflows/devsecops-pipeline.yml/badge.svg)](https://github.com/SajithDevPro/civicguard/actions/workflows/devsecops-pipeline.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.0-61DAFB?style=flat&logo=react)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Security Hardened](https://img.shields.io/badge/Security-OWASP%20Hardened-red?style=flat&logo=shield)](https://owasp.org/)

*An enterprise-grade, geospatial command center and citizen intelligence ecosystem designed for high-density crime triage, automated serial matching, real-time dispatch alerts, and multi-tenant Role-Based Access Control (RBAC).*

</div>

---

## 📸 Executive Command Center Preview


```text
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ [LIVE MAP ENGINE]                                [AUTHORIZED OFFICER TRIAGE DASHBOARD]    │
│ ┌───────────────────────────────────────┐        ┌──────────────────────────────────────┐ │
│ │  📍 Cluster Node (12 Incidents)       │        │ PRIORITY | CASE ID | SERIAL   | STATUS│ │
│ │  🔥 Heatmap Zone: High Density Theft  │        │ 🔴 CRIT  │ #CG-892 │ VIN-9831 │ PENDING│ │
│ │  📡 Realtime WebSocket Sync Active    │        │ 🟡 HIGH  │ #CG-410 │ SN-99823 │ ACTIVE │ │
│ └───────────────────────────────────────┘        └──────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────────────┘

📐 End-to-End System Architecture
The diagram below illustrates CivicGuard's multi-tier microservice architecture, highlighting the zero-trust security gateway, backend PostgreSQL triggers, and WebSocket telemetry stream:

┌─────────────────────────────────────────┐
                  │          PUBLIC / CITIZEN LAYER         │
                  └────────────────────┬────────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
     [ Citizen Web Portal ]                         [ Public Serial Checker ]
  (Report Stolen Asset + Map Pin)                 (Verify second-hand items)
                │                                             │
                └──────────────────────┬──────────────────────┘
                                       │ (Sanitization & Rate Limiting)
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │       SECURITY & API GATEWAY LAYER      │
                  │   - XSS & Input Sanitization Engine     │
                  │   - JWT Auth & Role Verification (RBAC) │
                  │   - Audit Logger & Dynamic Rate Limiter │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │      POSTGRESQL / SUPABASE DATABASE     │
                  │   - Granular Row-Level Security (RLS)   │
                  │   - PostGIS Spatial Radius Queries      │
                  │   - Immutable Trigger Audit Logging     │
                  └──────┬───────────────────────────┬──────┘
                         │                           │
          (Auto-Trigger Matching)             (Real-Time WebSockets)
                         │                           │
                         ▼                           ▼
       ┌───────────────────────────┐   ┌───────────────────────────┐
       │   SERIAL MATCHING ENGINE  │   │ REAL-TIME NOTIFICATION    │
       │   - Exact/Fuzzy Matching  │   │   - Dispatch Sound Chime  │
       │   - Levenshtein Distance  │   │   - In-App Alert Badges   │
       └──────────────┬────────────┘   └─────────────┬─────────────┘
                      │                              │
                      └──────────────┬───────────────┘
                                     │
                                     ▼
                  ┌─────────────────────────────────────────┐
                  │      OFFICER COMMAND CENTER (PORTAL)    │
                  │  - Canvas Heatmap Layer (leaflet.heat)  │
                  │  - Incident Triage Grid & Case Inspector│
                  │  - Intelligence PDF/CSV Export Engine   │
                  └─────────────────────────────────────────┘

## 🔒 Enterprise Security Hardening & Compliance

CivicGuard is engineered according to **OWASP Top 10** defense-in-depth principles:

* 🛡️ **Row-Level Security (RLS):** Database policies strictly segregate access—citizens can only access their personal reports, while officers are scoped to their assigned precinct jurisdiction ID.
* 📝 **Immutable Audit Logging:** System events, badge verification changes, and status updates trigger database-level logging into a read-only `audit_logs` table (`UPDATE` and `DELETE` queries are strictly disabled).
* 🧹 **XSS & Injection Protection:** Inputs undergo strict regex sanitization prior to processing to prevent XSS and injection vectors.
* ⚡ **Sliding-Window Rate Limiting:** Public serial queries and reporting endpoints are throttled per IP address to prevent brute-force data scraping and DDoS abuse.
* 🔒 **Strict HTTP Headers:** Production builds enforce `Content-Security-Policy`, `HSTS`, `X-Frame-Options: DENY`, and `X-Content-Type-Options: nosniff`.

---

## 🚀 DevSecOps Automated CI/CD Pipeline

Zero unverified code reaches production. Every commit to `main` executes a multi-stage automated workflow (`.github/workflows/devsecops-pipeline.yml`):

```text
 [ Git Push ] ──► [ 1. Security Audit ] ──► [ 2. Test & Typecheck ] ──► [ 3. Production Deploy ]
                   • npm audit (High CVEs)   • tsc --noEmit             • Vercel Edge Release
                   • ESLint Security Rules   • Vitest Component Tests   • Automated Deployment

⚡ Core Engineering Modules
Geospatial Hotspot Analytics Layer: Real-time spatial density engine utilizing leaflet.heat to render dynamic risk gradient zones (Green ➔ Yellow ➔ Red) across city sectors.

Automated Asset Recovery Matcher: SQL trigger-based engine using Levenshtein distance fuzzy string matching to cross-reference reported stolen VINs/Serial numbers against pawnshop & police recovery registries.

Authorized Officer Triage Center: Command dashboard for officers featuring full-text incident search, quick status transitions (pending ➔ investigated ➔ recovered), and precinct-wide data grid filters.

Real-Time WebSocket Dispatch Pipeline: Audio-visual Web Audio API dispatch alerts firing under 50ms when critical incidents land inside an officer's precinct boundary.

Executive Intelligence Export Suite: Custom PDF briefing and CSV export module for producing official municipal crime briefings and patrol shift logs.

💻 Local Installation & Setup Guide
Prerequisites
Node.js: v18.0.0 or higher

npm: v9.0.0 or higher

Database: Active Supabase Project Account                  
