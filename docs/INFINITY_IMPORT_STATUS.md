# Infinity Tab Import Support

The "Import from Infinity Tab" feature is partially implemented. The UI button is available in Settings > Data & Backup to select a file.

## Missing Implementation
We currently lack the JSON schema for Infinity Tab's export format. The `parseInfinityImport` function in `src/services/exportImportService.ts` currently throws an error:
`"Infinity Tab import format not yet supported. Please contact support."`

## How to Enable Support
1. Export a backup file from Infinity New Tab extension.
2. Provide this file to the development team.
3. Update `src/services/exportImportService.ts` to parse the file structure into `QuickLink[]` objects.
