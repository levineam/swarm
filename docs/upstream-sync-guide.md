# Swarm: Guide to Syncing with Upstream Bluesky Repository

This document provides guidance on keeping the Swarm fork up-to-date with the upstream Bluesky Social App repository.

## Automated Approach

We've created a script that automates most of the process. To use it:

```bash
./scripts/update-from-upstream.sh
```

The script will:
1. Check for uncommitted changes
2. Create a temporary branch
3. Fetch upstream changes
4. Attempt to merge them
5. Update dependencies
6. Build the application to verify changes
7. Provide instructions for completing the process

## Manual Process

If you prefer to do the process manually or if the script encounters issues, follow these steps:

### 1. Preparation

Ensure you're on the main branch and have no uncommitted changes:
```bash
git checkout main
git status
```

### 2. Create a Temporary Branch

```bash
git checkout -b temp-upstream-merge-$(date +%Y%m%d)
```

### 3. Fetch Upstream Changes

```bash
git fetch upstream
```

### 4. Check for New Changes

```bash
git log --oneline HEAD..upstream/main
```

### 5. Merge Upstream Changes

```bash
git merge upstream/main --no-commit
```

### 6. Resolve Conflicts

If there are conflicts, you'll need to resolve them:

#### For yarn.lock conflicts:
```bash
git checkout --theirs yarn.lock
yarn install
git add yarn.lock
```

#### For other conflicts:
- Edit the files manually to resolve conflicts
- Look for markers like `<<<<<<<`, `=======`, and `>>>>>>>` to identify conflict areas
- Choose the appropriate changes to keep
- After resolving, mark the file as resolved with `git add <file>`

### 7. Update Dependencies

```bash
yarn install
```

### 8. Verify Changes

Build the application to ensure everything works:
```bash
yarn build-web
```

### 9. Commit the Merge

```bash
git commit -m "Merge upstream changes from Bluesky"
```

### 10. Merge to Main

```bash
git checkout main
git merge --no-ff temp-upstream-merge-$(date +%Y%m%d) -m "Merge upstream changes from Bluesky"
```

### 11. Push Changes

```bash
git push origin main
```

### 12. Clean Up

```bash
git branch -D temp-upstream-merge-$(date +%Y%m%d)
```

## Handling Complex Scenarios

### Significant Conflicts

If there are significant conflicts between Swarm customizations and upstream changes:

1. Identify the conflicting areas
2. Understand the purpose of both changes
3. Decide whether to:
   - Keep Swarm's implementation
   - Adopt the upstream implementation
   - Create a hybrid solution

Focus on preserving Swarm-specific features while benefiting from upstream improvements.

### Breaking Changes in Upstream

If upstream introduces breaking changes:

1. Review the upstream commit history to understand the changes
2. Check if the changes affect Swarm-specific features
3. Adapt Swarm code to work with the new upstream implementation
4. Test thoroughly before committing

### Failed Builds After Merge

If the build fails after merging:

1. Check the error messages to identify the issue
2. Look for missing dependencies or version conflicts
3. Review recent upstream changes that might have introduced the issue
4. Fix the issues one by one, testing after each fix

## Key Areas to Watch

When merging, pay special attention to these areas where Swarm has significant customizations:

1. **Feed Generator Implementation**: Files in `swarm-feed-generator/`
2. **Koinos Blockchain Integration**: Files in `src/lib/koinos/`
3. **Wallet Functionality**: Files in `src/screens/Wallet/`
4. **Swarm Community Features**: Files related to community functionality
5. **Custom UI Components**: Swarm-specific UI components and branding

## Getting Help

If you encounter complex issues during the merge process:

1. Review this guide and the script output for guidance
2. Check the commit history of both repositories to understand changes
3. Use an AI assistant with this guide as context to help resolve specific issues
4. Reach out to the development team for assistance with complex conflicts

Remember, the goal is to incorporate beneficial upstream changes while preserving Swarm's unique features and functionality. 