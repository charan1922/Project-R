## ADDED Requirements

### Requirement: Functional Bulk Import
The system SHALL allow users to import a list of symbols from a CSV file or clipboard and save the valid symbols to the `watchlist` table.

#### Scenario: Import valid symbols
- **WHEN** user uploads a CSV with valid symbols and clicks "Import Valid Symbols"
- **THEN** system SHALL call `POST /api/historify/watchlist` for each symbol and show a progress modal.

### Requirement: Real-time CSV Validation
The system SHALL validate imported symbols against the `master-contracts` list and provide visual feedback for valid/invalid entries.

#### Scenario: Identify invalid symbols
- **WHEN** user pastes a list containing an unknown symbol "INVALID_STK"
- **THEN** system SHALL mark the row as invalid and disable the import button if no valid symbols are found.
