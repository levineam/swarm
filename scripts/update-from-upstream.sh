#!/bin/bash
set -e

echo "=== Swarm: Update from Upstream Script ==="
echo "This script will help you update your Swarm fork with the latest changes from the Bluesky repository."

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "❌ You have uncommitted changes. Please commit or stash them first."
    exit 1
fi

# Make sure we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️ You are not on the main branch. Switching to main..."
    git checkout main
fi

# Create a temporary branch
TEMP_BRANCH="temp-upstream-merge-$(date +%Y%m%d)"
echo "🔄 Creating temporary branch: $TEMP_BRANCH"
git checkout -b $TEMP_BRANCH

# Fetch upstream changes
echo "📥 Fetching latest changes from upstream repository..."
git fetch upstream
echo "✅ Fetched latest changes from upstream repository"

# Check if there are any changes to merge
CHANGES=$(git log --oneline HEAD..upstream/main | wc -l)
if [ "$CHANGES" -eq 0 ]; then
    echo "✅ Your fork is already up to date with the upstream repository."
    echo "🧹 Cleaning up temporary branch..."
    git checkout main
    git branch -D $TEMP_BRANCH
    exit 0
fi

echo "🔍 Found $CHANGES new commits in the upstream repository."

# Try to merge
echo "🔄 Attempting to merge upstream changes..."
if git merge upstream/main --no-commit; then
    echo "✅ Preliminary merge successful. Updating dependencies..."
    
    # Update dependencies
    echo "📦 Running yarn install to update dependencies..."
    yarn install
    
    # Add the resolved yarn.lock
    git add yarn.lock
    
    # Build to test
    echo "🏗️ Building web version to verify changes..."
    yarn build-web
    
    echo "============================================="
    echo "✅ Merge was successful and build completed."
    echo "Please review the changes before committing."
    echo ""
    echo "To commit and push the changes, run:"
    echo "  git commit -m \"Merge upstream changes from Bluesky\""
    echo "  git checkout main"
    echo "  git merge --no-ff $TEMP_BRANCH -m \"Merge upstream changes from Bluesky\""
    echo "  git push origin main"
    echo "  git branch -D $TEMP_BRANCH"
    echo "============================================="
else
    echo "⚠️ Merge conflicts detected. Resolving manually required."
    echo ""
    echo "Common conflicts and how to resolve them:"
    echo "1. For yarn.lock conflicts:"
    echo "   git checkout --theirs yarn.lock"
    echo "   yarn install"
    echo "   git add yarn.lock"
    echo ""
    echo "2. For other conflicts, edit the files manually to resolve them."
    echo ""
    echo "After resolving conflicts, run:"
    echo "  git add ."
    echo "  git commit -m \"Merge upstream changes from Bluesky\""
    echo "  yarn install"
    echo "  yarn build-web"
    echo "  git checkout main"
    echo "  git merge --no-ff $TEMP_BRANCH -m \"Merge upstream changes from Bluesky\""
    echo "  git push origin main"
    echo "  git branch -D $TEMP_BRANCH"
fi 