# Phase 5: File Operations - Execution Requirements

## Overview

**Goal:** Implement safe, user-controlled file copy/move operations with full progress tracking, error handling, and rollback capabilities.

**Context:** Users can currently scan photos, visualize them on a map, select them via lasso tool, and preview operations in dry-run mode. This phase adds the actual execution of file operations.

**Critical Principles:**

- **Safety First:** Never lose user data. All operations must be reversible or recoverable.
- **User Control:** Operations require explicit confirmation. Progress can be cancelled at any time.
- **Transparency:** Clear progress indication, error reporting, and operation logging.
- **Performance:** Handle large operations (10,000+ files) without blocking the UI.
- **Atomicity:** Operations should succeed completely or fail cleanly (no partial states).

## Requirements

### Core Functionality

#### 1. Operation Engine (Core Package)

- **File:** `packages/core/src/operations/engine.ts`
- **Purpose:** Platform-agnostic operation logic
- **Requirements:**
  - Support copy and move operations
  - Calculate total size and file count
  - Validate destinations (space, permissions, conflicts)
  - Generate operation plan with source→destination mapping
  - Support dry-run mode (already exists, extend if needed)

#### 2. Database Schema

- **File:** `packages/desktop/src/main/database/schema.ts` (extend existing)
- **Requirements:**
  - `operation_log` table:
    - `id` (primary key)
    - `operation_type` ('copy' | 'move')
    - `status` ('pending' | 'running' | 'completed' | 'failed' | 'cancelled')
    - `source_path`, `destination_path`
    - `file_size`, `file_hash` (for verification)
    - `created_at`, `started_at`, `completed_at`
    - `error_message` (if failed)
    - `user_id` (future multi-user support)
  - `operation_items` table (for batch operations):
    - `operation_id` (foreign key)
    - `photo_id` (foreign key to photos table)
    - `status` ('pending' | 'completed' | 'failed' | 'skipped')
    - `error_details`

#### 3. Main Process Implementation

- **File:** `packages/desktop/src/main/services/operations.ts` (new)
- **Requirements:**
  - Execute operations asynchronously (worker threads if needed)
  - Stream progress updates via IPC
  - Handle file I/O with proper error checking
  - Support cancellation mid-operation
  - Update database status in real-time
  - Implement rollback for failed operations

#### 4. IPC Handlers

- **File:** `packages/desktop/src/main/ipc/operations.ts` (new)
- **Requirements:**
  - `startOperation(operationId)` - Begin execution
  - `cancelOperation(operationId)` - Stop gracefully
  - `getOperationStatus(operationId)` - Current progress
  - `retryOperation(operationId)` - Retry failed items
  - Progress events: `operation-progress` (percentage, current file, speed)

#### 5. UI Components

##### Progress Modal

- **File:** `packages/desktop/src/renderer/src/components/Operations/OperationProgressModal.tsx` (new)
- **Requirements:**
  - Overall progress bar (0-100%)
  - Current file being processed
  - Speed indicator (files/sec, MB/sec)
  - Time remaining estimate
  - Cancel button (with confirmation)
  - Error display (non-blocking)

##### Operation History

- **File:** `packages/desktop/src/renderer/src/components/Operations/OperationHistory.tsx` (new)
- **Requirements:**
  - List recent operations
  - Show status, timestamps, file counts
  - Allow retry of failed operations
  - View detailed logs

##### Confirmation Dialog

- **File:** Extend existing confirmation system
- **Requirements:**
  - Show operation summary (file count, total size, destinations)
  - Warn about destructive operations (moves)
  - Require explicit confirmation

### Safety & Error Handling

#### 1. Pre-Operation Validation

- Check destination disk space
- Verify write permissions
- Detect file conflicts (same name different content)
- Validate source files still exist
- Check for read locks (files in use)

#### 2. Error Recovery

- **Copy Operations:** Failed copies don't affect source. Can retry.
- **Move Operations:** Failed moves leave source intact. Partial moves can be rolled back.
- **Database Consistency:** Operation status always reflects reality.
- **User Notification:** Clear error messages with actionable recovery steps.

#### 3. Cancellation

- Graceful stop at next safe point
- No partial files left behind
- Database status updated to 'cancelled'
- Allow resume/retry of cancelled operations

#### 4. Rollback

- For move operations, track original locations
- Implement undo functionality for recent operations
- Warn user about rollback limitations (deleted files can't be recovered)

### Performance Requirements

#### 1. Large Dataset Handling

- Support 10,000+ files per operation
- Memory usage < 500MB during operation
- UI remains responsive (progress updates don't block)
- Operation can run in background

#### 2. Progress Tracking

- Real-time updates (at least 1 update per second)
- Accurate time remaining estimates
- File-by-file progress for transparency

#### 3. Concurrency

- Single operation at a time (prevent conflicts)
- Queue system for multiple pending operations

### User Experience

#### 1. Feedback

- Clear progress indicators
- Informative error messages
- Success notifications with summary
- Operation history for accountability

#### 2. Control

- Pause/resume capability
- Speed limiting options
- Priority settings (future)

#### 3. Transparency

- Detailed logs accessible to user
- Operation can be audited
- No hidden background operations

## Work Tracker

### Phase 1: Planning & Design

- [ ] Create this requirements document
- [ ] Review and approve requirements
- [ ] Design database schema changes
- [ ] Design IPC API
- [ ] Design UI components

### Phase 2: Core Infrastructure

- [ ] Implement `operation_log` and `operation_items` tables
- [ ] Create database migration script
- [ ] Implement core operation engine (`packages/core/src/operations/engine.ts`)
- [ ] Add operation types and interfaces to core package
- [ ] Unit tests for operation engine

### Phase 3: Main Process

- [ ] Create `packages/desktop/src/main/services/operations.ts`
- [ ] Implement file copy/move with progress streaming
- [ ] Add error handling and recovery logic
- [ ] Implement cancellation support
- [ ] Create IPC handlers (`packages/desktop/src/main/ipc/operations.ts`)
- [ ] Integration tests for main process operations

### Phase 4: UI Implementation

- [ ] Create `OperationProgressModal` component
- [ ] Create `OperationHistory` component
- [ ] Extend confirmation dialogs for operations
- [ ] Add operation controls to main UI
- [ ] Implement progress event handling in renderer
- [x] **BONUS: Add "Show in Folder" for multiple selected files** ✅ IMPLEMENTED (opens folder and selects oldest file; Windows limitation: cannot select multiple files in Explorer)

### Phase 5: Integration & Testing

- [ ] Wire up IPC communication
- [ ] Test end-to-end operation flow
- [ ] Performance testing with large datasets
- [ ] Error scenario testing (disk full, permissions, network issues)
- [ ] UI/UX testing and polish

### Phase 6: Safety & Polish

- [ ] Implement rollback functionality
- [ ] Add duplicate detection (bonus feature)
- [ ] Security audit (path traversal, etc.)
- [ ] Documentation updates
- [ ] Final integration testing

## Implementation Plan

### Architecture

```
User Action → Confirmation Dialog → IPC Call → Main Process
    ↓                                           ↓
Operation Plan ← Database Logging ← File Operations
    ↓                                           ↓
Progress Updates → UI Feedback ← Status Updates
```

### Key Design Decisions

1. **Database-First Logging:** All operations logged before execution for auditability
2. **Streaming Progress:** Real-time updates via IPC events, not polling
3. **Cancellation Points:** Safe stop points between files, not mid-file
4. **Error Isolation:** Failed files don't stop the entire operation
5. **Memory Efficiency:** Process files one-by-one, not load all into memory

### Risk Mitigation

| Risk                 | Likelihood | Impact   | Mitigation                                                    |
| -------------------- | ---------- | -------- | ------------------------------------------------------------- |
| Data Loss            | Low        | Critical | Comprehensive validation, rollback support, user confirmation |
| Performance Issues   | Medium     | High     | Background processing, progress streaming, memory limits      |
| Complex Error States | High       | Medium   | Extensive testing, clear error messages, recovery options     |
| User Confusion       | Medium     | Medium   | Clear UI, progress feedback, operation history                |
| Platform Differences | Low        | Medium   | Abstract file operations, test on Windows/macOS               |

### Success Criteria

- [ ] Operations complete successfully for 10,000+ files
- [ ] UI remains responsive during operations
- [ ] All error scenarios handled gracefully
- [ ] Operations are fully auditable via logs
- [ ] Users can cancel and retry operations
- [ ] No data loss in failure scenarios
- [ ] Performance acceptable (< 5 minutes for 10k files)

## Testing Strategy

### Unit Tests

- Operation engine logic
- Database operations
- IPC message handling

### Integration Tests

- End-to-end operation flow
- Error injection testing
- Cancellation testing

### Performance Tests

- Large file sets (10k+ files)
- Memory usage monitoring
- UI responsiveness during operations

### Manual Testing

- Real file operations on test data
- Error scenarios (disk full, permissions)
- Cross-platform testing (Windows/macOS)

## Dependencies

- Existing dry-run functionality (extend)
- Database schema (extend)
- IPC system (extend)
- UI components (extend confirmation dialogs)

## Timeline Estimate

- **Phase 1-2:** 1-2 days (design & core)
- **Phase 3:** 2-3 days (main process)
- **Phase 4:** 2-3 days (UI)
- **Phase 5-6:** 2-3 days (integration & safety)

**Total:** 7-11 days for complete implementation

## Known Limitations

- **Windows Explorer Multiple Selection:** Due to Windows Explorer command-line limitations, the "Show in Folder" feature opens the folder and selects the oldest file as a reference point. True multiple file selection would require complex COM automation that's unreliable across Windows versions.

## Next Steps

1. Review and approve this requirements document
2. Start with Phase 1: Database schema design
3. Implement core operation engine
4. Build incrementally with extensive testing at each step

## Implementation Proposal

### Recommended Approach

**Start Small, Test Often:** Begin with the core operation engine and database schema, then build outward. Each component should be fully tested before integration.

### Phase 1 Starting Point

1. **First Task:** Design and implement the database schema changes
   - Add `operation_log` and `operation_items` tables
   - Create migration script
   - Test with sample data

2. **Second Task:** Implement core operation engine
   - Start with validation logic (dry-run extension)
   - Add operation planning
   - Unit tests for all edge cases

3. **Third Task:** Main process file operations
   - Implement basic copy/move with progress
   - Add error handling
   - Test with real files

### Safety-First Development

- **Never commit without tests** for critical operations
- **Always test with real files** (use a test directory with sample photos)
- **Implement cancellation first** before full operations
- **Add logging at every step** for debugging

### Development Workflow

1. **Branch:** Create `feature/phase5-file-operations`
2. **Incremental Commits:** One feature at a time
3. **Testing:** Manual testing after each major component
4. **Code Review:** Self-review against requirements before integration

### Risk Reduction

- **Start with copy operations** (safer than move)
- **Implement rollback immediately** for any destructive operations
- **Add comprehensive validation** before any file I/O
- **Test error scenarios** proactively (disk full, permissions, etc.)

### Success Metrics

- All operations are logged and auditable
- Failed operations can be retried or rolled back
- UI provides clear feedback at all times
- Performance scales to 10,000+ files
- No data loss in any failure scenario

---

**Ready to begin Phase 1 implementation?**</content>
<parameter name="filePath">c:\Github_Projects\placemark\PHASE5_FILE_OPERATIONS.md
