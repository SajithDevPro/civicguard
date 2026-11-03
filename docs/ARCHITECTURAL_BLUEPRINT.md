# CivicGuard Architectural System Blueprint

## Executive Overview
**CivicGuard** is an enterprise-grade, high-stakes public safety and asset recovery platform designed to bridge citizens and law enforcement. The platform combines real-time geospatial intelligence, automated jurisdiction dispatching, and Row-Level Security (RLS) to ensure verifiable chain of custody, data protection, and instant operational responsiveness.

---

## 1. System Architecture & Topology

```
+-----------------------------------------------------------------------------------------+
|                                    CLIENT TIER                                          |
|                                                                                         |
|   +------------------------------------+      +-------------------------------------+   |
|   |         CITIZEN INTERFACE          |      |     OFFICER COMMAND CONSOLE         |   |
|   |  - GPS / Pin-Drop Incident Filing  |      |  - Tactical Geospatial GIS Radar    |   |
|   |  - Anti-Fencing Serial Lookup      |      |  - Multi-Sector Operations Board    |   |
|   |  - Personal Filings Dossier        |      |  - Triage Workflow & Case Logging   |   |
|   +-----------------+------------------+      +------------------^------------------+   |
+---------------------|--------------------------------------------|----------------------+
                      | HTTPS / REST                               | WebSocket (WSS)
                      v                                            | (Supabase Realtime)
+------------------------------------------------------------------+----------------------+
|                           EDGE ROUTER & APPLICATION GATEWAY                             |
|  - TLS 1.3 Termination, Helmet Security Headers                                        |
|  - JWT Bearer Token Validation & Role Extraction (Citizen / Officer / Admin)           |
|  - Token Bucket Rate Limiting (5 requests / 60s per unauthenticated / citizen IP)       |
+---------------------+--------------------------------------------^----------------------+
                      |                                            |
                      v                                            | Postgres WAL Filter
+------------------------------------------------------------------+----------------------+
|                       DATABASE LAYER (PostgreSQL 15+ / PostGIS)                         |
|                                                                                         |
|   +------------------------------------+      +-------------------------------------+   |
|   |     ROW-LEVEL SECURITY (RLS)       |      |     SPATIAL & DOMAIN INDEXES        |   |
|   |  - incidents_insert_citizen        |      |  - GiST / Compound (lat, lng)       |   |
|   |  - incidents_select_policy         |      |  - Partial idx_incidents_serial     |   |
|   |  - incidents_update_officer        |      |  - idx_incidents_assigned_station   |   |
|   +-----------------+------------------+      +------------------^------------------+   |
|                     |                                            |                      |
|                     v                                            v                      |
|   +---------------------------------------------------------------------------------+   |
|   |           AUTOMATED JURISDICTION ASSIGNMENT TRIGGER                             |   |
|   |    assign_incident_jurisdiction() -> Spherical Haversine / PostGIS ST_Distance  |   |
|   |    Auto-links nearest public.police_stations(id) on INSERT                      |   |
|   +---------------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------------+
```

---

## 2. End-to-End Geospatial Data Flow Architecture

When a citizen discovers stolen property and files a report, the data traverses the following sequence:

### Step 1: Client Pin-Drop & In-Browser Sanitization
1. **Interactive Pin-Drop:** The citizen clicks directly on the tactical map or permits browser geolocation (`navigator.geolocation.getCurrentPosition()`). 
2. **Client Validation:** The client runs `validateReportInput()`, ensuring:
   - Latitude $\in [-90.0, 90.0]$ and Longitude $\in [-180.0, 180.0]$.
   - String inputs are trimmed and bounded (Title: 5–120 chars; Description $\ge 10$ chars).
   - Serial numbers are capitalized and sanitized of non-alphanumeric separators.
3. **Optimistic Preview:** The client executes the local Haversine distance calculator against registered precinct coordinates (`findNearestPoliceStation()`), previewing the assigned precinct and distance in kilometers before submission.

### Step 2: Ingestion & API Authentication
1. **Payload Dispatch:** The client issues an authenticated `POST` request to `/rest/v1/incident_reports` carrying the user's Supabase JWT token.
2. **Identity Verification:** The database extracts `auth.uid()`. The RLS policy `incidents_insert_citizen` verifies `WITH CHECK (auth.uid() = user_id)`:
   - This prevents spoofing or filing reports under another citizen's account.

### Step 3: Automated Spatial Resolution & Database Indexing
1. **BEFORE INSERT Trigger Execution:** The `trg_assign_incident_jurisdiction` trigger fires inside PostgreSQL:
   ```sql
   SELECT id INTO closest_station_id
   FROM public.police_stations
   ORDER BY (
       6371 * acos(
           LEAST(1.0, GREATEST(-1.0,
               cos(radians(NEW.lat)) * cos(radians(lat)) *
               cos(radians(lng) - radians(NEW.lng)) +
               sin(radians(NEW.lat)) * sin(radians(lat))
           ))
       )
   ) ASC
   LIMIT 1;
   ```
2. **Index Traversal:** The coordinates are indexed via compound B-Tree or PostGIS spatial GiST indexing (`idx_incidents_spatial`), allowing near-instantaneous radial bounding box queries ($O(\log N)$).
3. **Serial Number Indexing:** The partial index `idx_incidents_serial_number_clean` on `lower(trim(serial_number))` is updated, instantly enabling anti-fencing serial lookups.

### Step 4: Real-Time Broadcast to Law Enforcement Terminals
1. **Write-Ahead Logging (WAL):** PostgreSQL writes the committed transaction to the write-ahead log.
2. **Logical Replication Slot:** Supabase Realtime picks up the insert event from the `supabase_realtime` publication.
3. **RLS Push Filtering:** Supabase inspects the connected WebSocket listeners:
   - Connected **Officers** and **Admins** have subscriptions authorized to receive all incident payloads across their district.
   - Connected **Citizens** only receive broadcasts for public safety advisories or their own updates.
4. **Instant Terminal Dispatch:** Officer command consoles receive the WebSocket message (`INSERT`), recalculate triage queues, and render an active pulsing radar indicator on the tactical map within $< 150\text{ms}$.

---

## 3. Security Audit & Hardening Specifications

### 3.1 Input Sanitization & Data Integrity
- **Database-Level Constraints:** Field boundaries are enforced directly in the PostgreSQL table definition:
  - `CHECK (lat >= -90.0 AND lat <= 90.0)`
  - `CHECK (lng >= -180.0 AND lng <= 180.0)`
  - `CHECK (length(trim(title)) >= 5)`
  - `CHECK (length(trim(description)) >= 10)`
  - `CHECK (estimated_value IS NULL OR estimated_value >= 0)`
- **Enum Integrity:** `user_role`, `incident_status`, and `asset_category` are strictly defined as database-level ENUM types, rejecting invalid string inputs at the parser layer.

### 3.2 SQL Injection Prevention
- **Zero Dynamic String Concatenation:** All database interactions through the Supabase client use parameterized queries ($1, $2, ...) over PostgreSQL binary protocol.
- **SECURITY DEFINER Safeguards:** Stored functions (`is_officer_or_admin()`, `current_user_role()`) are designated `SECURITY DEFINER` and execute with explicit schema scoping (`public.profiles`), preventing `search_path` injection vulnerabilities.

### 3.3 Role Escalation & Privilege Defense
- **Immutable Role Assignment:** The `profiles_update_self` policy prohibits callers from updating their own `role` or `badge_number`:
  ```sql
  CREATE POLICY "profiles_update_self" ON public.profiles
      FOR UPDATE TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (
          auth.uid() = id
          AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
      );
  ```
- **Officer Badge Verification Constraint:** A table constraint ensures that any user holding the `'officer'` role must have a non-empty, valid badge number:
  ```sql
  CONSTRAINT chk_badge_for_officers CHECK (
      (role = 'officer' AND badge_number IS NOT NULL AND length(trim(badge_number)) > 0)
      OR (role != 'officer')
  )
  ```

### 3.4 Rate Limiting & Denial of Service (DoS) Mitigation
- **Token Bucket Algorithm:** For production deployment, public submission endpoints are protected by rate limiting:
  - Anonymous/Citizen IP limit: **5 submissions per 60 minutes**.
  - Officer status updates: **60 operations per minute**.
- **Payload Caps:** Request body size limit restricted to 2MB (limiting base64/URL evidence payloads).

### 3.5 Tamper-Proof Chain of Custody
- **Prohibited Citizen Updates/Deletes:** Once a citizen submits an incident report, they cannot modify the historical record or coordinates.
- **Admin-Only Deletions:** Incident deletion is restricted strictly to users with `role = 'admin'` (`incidents_delete_admin`), ensuring evidence is never purged by unauthorized parties.
