# Release process

This prototype follows a small, reviewable release process.

## Before a release

Update the version and changelog, confirm the README still describes the current scope, and run the local validation commands.

```bash
npm ci
npm run lint
npm run build
```

## Publishing

Create an annotated version tag from a validated commit and publish release notes that describe user-visible behavior, known limitations, and any compatibility concerns. Do not label a simulation prototype as a production operational system.
