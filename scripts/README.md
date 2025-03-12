# Swarm Scripts

This directory contains utility scripts for the Swarm project.

## Available Scripts

### `update-from-upstream.sh`

This script automates the process of updating the Swarm fork with the latest changes from the upstream Bluesky Social App repository.

#### Usage

```bash
./update-from-upstream.sh
```

#### What it does

1. Checks if you have uncommitted changes
2. Creates a temporary branch for the merge
3. Fetches the latest changes from the upstream repository
4. Checks if there are any new changes to merge
5. Attempts to merge the upstream changes
6. Updates dependencies with `yarn install`
7. Builds the web version to verify changes
8. Provides instructions for completing the process

#### When to use

Run this script periodically (e.g., monthly) to keep your fork up to date with the latest features, improvements, and bug fixes from the upstream repository.

#### Handling conflicts

If the script encounters merge conflicts, it will provide guidance on how to resolve them. Common conflicts include:

- **yarn.lock conflicts**: These can usually be resolved by accepting the upstream version and regenerating the file.
- **Custom feature conflicts**: These require manual resolution to preserve Swarm-specific functionality.

For more detailed guidance on handling complex merge scenarios, refer to the [Upstream Sync Guide](../docs/upstream-sync-guide.md).

## Other Scripts

[List other scripts in this directory with brief descriptions]
