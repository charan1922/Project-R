## ADDED Requirements

### Requirement: Manage Dhan Credentials
The system SHALL provide a Settings page for the user to view and update their Dhan Client ID and Access Token.

#### Scenario: Save valid credentials
- **WHEN** user enters a Client ID and Access Token and clicks "Save Credentials"
- **THEN** system SHALL store them in `data/historify-settings.json` and show a success notification.

### Requirement: Toggle Credential Visibility
The system SHALL allow the user to toggle the visibility of the Dhan Access Token to prevent accidental exposure.

#### Scenario: Show/Hide token
- **WHEN** user clicks the "eye" icon next to the Access Token
- **THEN** system SHALL toggle the input type between "password" and "text".

### Requirement: App Preferences
The system SHALL allow the user to manage application-level preferences, such as the default theme and display options.

#### Scenario: Update preferences
- **WHEN** user changes a UI preference and clicks "Save Preferences"
- **THEN** system SHALL persist the preference in the settings JSON.
