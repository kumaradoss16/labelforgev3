# LabelForge v3 — Industrial Security & Production Architecture

## 1. Overview & Security Architecture

LabelForge v3 is an industrial label design and high-throughput thermal printing platform. Because it operates in regulated industrial, logistics, and pharmaceutical manufacturing settings where barcode duplication or payload tampering can result in misrouted freight, compliance violations, or counterfeiting, the application enforces strict hardware-level trust boundaries.

### Core Industrial Principle
> **"Data successfully transmitted does NOT automatically mean a label has successfully printed."**
> 
> The application preserves this distinction throughout the print lifecycle to prevent duplicate printing of serialized barcodes, SSCC pallets, and GTIN compliance labels.

```
React Renderer
    ↓ (Typed IPC with context isolation)
IPC Security Layer
    ├── Sender validation (origin & protocol)
    └── Runtime schema validation (Zod)
    ↓
Authentication (LocalAuthenticationProvider / Windows / Domain)
    ↓
SessionManager (Cryptographic session IDs, sliding TTL, fail-closed)
    ↓
Authorization / RBAC (Permissions Table: SYSTEM_ADMIN, PRINT_MANAGER, OPERATOR, VIEWER)
    ↓
Print Job Service & Canonical Payload Store
    ├── SHA-256 payload integrity check
    └── Strict isolation from visual preview data
    ↓
Durable Transactional Queue & Print Attempt State Machine
    ↓
Printer Transport Adapters (ZPL, TSPL, EPL, CPCL, SBPL, DPL, Windows Spooler, Network RAW)
    ↓
Accurate Delivery Status Semantics (QUEUED → SUBMITTING → TRANSMITTED / SPOOLER_ACCEPTED → COMPLETED / STATUS_UNKNOWN)
    ↓
Audit Event Store (SQLite WAL Mode, Monotonic Sequence, Deterministic Hash Chain, Continuous Segments)
    ↓
Signed Audit Export (Ed25519 digital signatures & independent verification)
```

---

## 2. Authentication & Session Lifecycle (P0-1)

### Non-Negotiable Boundary
- The renderer **never** supplies `userId`, `userName`, `role`, `email`, or privileged credentials as a source of trust.
- Session creation is strictly bounded to an `AuthenticatedIdentity` returned by an `AuthenticationProvider`.
- Role assignment and identity tokens cannot be forged or self-escalated by the renderer.

### Provider Abstraction
- `AuthenticationProvider`: Provides `authenticate(credentials: AuthenticationCredentials): Promise<AuthenticatedIdentity>`.
- `LocalAuthenticationProvider`: Stores industrial operator credentials hashed using PBKDF2 with SHA-512 (100,000 iterations) and cryptographically random per-user salts.
- Automatic rate-limiting and 60-second account lockout defenses protect against brute-force attacks.

### Session Lifecycle
- `SessionPrincipal`: Contains `sessionId` (256-bit cryptographically secure token), `userId`, `userName`, `role`, `authenticationMethod`, `authenticatedAt`, and `expiresAt` (8-hour sliding TTL).
- `sessionManager.requireAuthenticatedPrincipal()`: Fails closed. If no session exists or if the session has expired, it immediately aborts privileged IPC execution with `AuthenticationRequiredError` or `SessionExpiredError`.
- Explicit session revocation is enforced via `auth:logout` and `destroySession()`.

---

## 3. Print Payload Security & Integrity Lifecycle (P0-2)

### Absolute Rule: Preview is NEVER a Print Payload
A visual preview (e.g. `rawPayloadPreview`, canvas renders, base64 images, or HTML) exists exclusively for display. The printer hardware transport **never** receives visual preview data. Any attempt to dispatch a print job missing its canonical payload throws `PrintPayloadUnavailableError`.

### Canonical Payload Store
- `PrintPayloadReference`: Contains `{ payloadId, sha256, byteLength }`.
- Prior to physical transmission to hardware:
  1. The canonical raw byte stream is retrieved.
  2. Length is matched exactly against `byteLength`.
  3. SHA-256 is recomputed and verified using timing-safe comparison (`crypto.timingSafeEqual`).
  4. If any discrepancy exists, the job is aborted with `PrintPayloadIntegrityError`.

### Delivery State Semantics
- **TCP RAW / Network Socket**:
  - `QUEUED` → `TRANSMITTING` → `TRANSMITTED`.
  - TCP transmission success indicates bytes reached the socket buffer; it is **never** reported as physical paper output completion unless hardware bi-directional status feedback confirms it.
- **Windows Spooler**:
  - `QUEUED` → `TRANSMITTING` → `SPOOLER_ACCEPTED` → `PRINTING` → `COMPLETED` (only upon spooler job verification).

### Unknown Transmission Status & Automatic Retry Protection
- If a socket drops or connection times out after bytes were transmitted, the attempt transitions to `STATUS_UNKNOWN`.
- **Automatic Retry Policy**:
  - Automated retries are **permitted only** for `FAILED_BEFORE_TRANSMISSION`.
  - Automatic retries are **strictly prohibited** for `STATUS_UNKNOWN`, `TRANSMITTED`, or `SPOOLER_ACCEPTED`.
  - Bypassing this policy is prevented by `printAttemptService.isEligibleForAutoRetry()`, ensuring identical physical labels are not printed twice.

---

## 4. Transaction-Safe, Continuous Audit Persistence (P0-3)

### Tamper-Evident vs. Immutable
> **Notice**: Local files on an operating system with administrative access are inherently mutable at the block/drive level. LabelForge does not falsely claim the local database is "immutable"; instead, it provides a **mathematically continuous, transaction-safe, tamper-evident hash chain** with **Ed25519 digital signatures** and independent cryptographic verification.

### SQLite WAL Mode Architecture
- Audit events are stored in SQLite using WAL mode (`PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;`).
- Serialized single-writer mutex guarantees concurrent callers in the Node event loop do not fork or corrupt the chain.
- Every audit entry executes within `BEGIN IMMEDIATE ... COMMIT`:
  1. Atomically reads the latest monotonic `sequenceNumber` and `recordHash`.
  2. Increments `sequenceNumber` by exactly 1 (no gaps or duplicates).
  3. Deterministically canonicalizes fields into normalized key-sorted JSON (`canonicalizeAuditPayload`).
  4. Computes `recordHash = SHA-256(canonicalString + ":" + previousHash)`.
  5. Inserts into `audit_events` table and updates `audit_metadata` and `audit_segments`.
  6. On failure, `ROLLBACK` ensures no partial chain updates.

### Continuous Segment Rotation
- Segments (`audit_segments`) track chunked logs.
- When rotation occurs, Segment $N+1$ records `previousSegmentHash = Segment_N.lastRecordHash`. The hash chain remains continuous across file rotations and restarts without ever resetting to genesis.

### Ed25519 Signed Audit Export & Verification
- `AuditSigner`: Generates an asymmetric Ed25519 digital signature of audit export packages.
- `AuditVerifier`: Independent offline engine that validates:
  1. Monotonic sequence continuity.
  2. Cryptographic hash chaining.
  3. Continuous segment hashes.
  4. Digital signature validity.
  5. Detects deletions, alterations, insertions, and re-ordered records.

---

## 5. IPC Security & Destination Hardening

- **Sender Validation**: `assertTrustedRenderer` verifies that IPC callers originate from internal frame URLs with authorized application protocols (`file:`, `app:` in production).
- **Runtime Schema Validation**: All IPC payloads are parsed using Zod schemas (`PrintCommandSchema`, `LoginCredentialsSchema`, `AppSettingsSchema`). Security-sensitive `any` types have been removed.
- **SSRF & Network Defense**:
  - Rejects loopback addresses (`127.0.0.0/8`, `::1`).
  - Rejects obfuscated IP notations (hex `0x7f000001`, dword `2130706433`, octal).
  - Rejects cloud instance metadata targets (`169.254.169.254`, `169.254.169.250`).
  - Restricts TCP ports to valid numeric ranges (1–65535).
- **Sensitive Log Sanitization**:
  - Passwords, authorization tokens, session secrets, and raw response dumps (such as BarTender `response.text()`) are redacted prior to structured logging.

---

## 6. Known Limitations & Remaining Roadmap Items

1. **Windows Native RAW Print Helper**:
   - Current implementation dispatches RAW thermal bytes via safe PowerShell arguments with shell character injection guards (`;&|$\`).
   - Planned roadmap improvement: compile a standalone C++ helper (`NativePrintHelper.exe`) directly invoking `winspool.drv` `OpenPrinterW` / `WritePrinter` to bypass PowerShell entirely on Windows installations with restricted script execution policies.
2. **Hardware Bi-Directional Status**:
   - Direct status queries for legacy serial/USB printers require physical hardware polling threads, supported on ZPL via `~HS` host status return.
