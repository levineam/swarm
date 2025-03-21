#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}     Swarm CORS Proxy Deployment Tool    ${NC}"
echo -e "${BLUE}=========================================${NC}"

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "Git could not be found. Please install Git first."
    exit 1
fi

# Initialize Git repository if it doesn't exist
if [ ! -d .git ]; then
  echo -e "\n${GREEN}Initializing Git repository...${NC}"
  git init
  echo "✅ Git repository initialized"
else
  echo -e "\n${GREEN}Git repository already exists${NC}"
fi

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
  # Add all files to Git
  echo -e "\n${GREEN}Adding files to Git...${NC}"
  git add .
  echo "✅ Files added to staging"

  # Commit changes
  echo -e "\n${GREEN}Committing changes...${NC}"
  git commit -m "Prepare CORS proxy for deployment"
  echo "✅ Changes committed"
else
  echo -e "\n${GREEN}No changes to commit${NC}"
fi

# Check if a remote named 'origin' exists
if ! git remote | grep -q "^origin$"; then
  echo -e "\n${GREEN}No remote repository configured.${NC}"
  echo "To add a remote repository, run:"
  echo "git remote add origin <your-github-repo-url>"
  echo ""
else
  echo -e "\n${GREEN}Remote 'origin' already configured${NC}"
  REMOTE_URL=$(git remote get-url origin)
  echo "Current remote URL: $REMOTE_URL"
  
  # Ask if user wants to push
  echo -e "\n${GREEN}Would you like to push to this remote? (y/n)${NC}"
  read -r answer
  if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
    echo -e "\n${GREEN}Pushing to remote...${NC}"
    git push -u origin $(git branch --show-current)
    echo "✅ Changes pushed to remote"
  fi
fi

echo -e "\n${GREEN}Deployment preparation complete!${NC}"
echo -e "\n${BLUE}Next steps:${NC}"
echo "1. If you haven't added a remote repository, run:"
echo "   git remote add origin <your-github-repo-url>"
echo "   git push -u origin main"
echo ""
echo "2. Deploy to Render by visiting: https://dashboard.render.com/new/web-service"
echo "   - Connect your GitHub repository"
echo "   - Render will detect the render.yaml configuration automatically"
echo ""
echo "3. Or deploy manually with these settings:"
echo "   - Name: swarm-cors-proxy"
echo "   - Runtime: Node"
echo "   - Build Command: npm install"
echo "   - Start Command: node index.js"
echo ""
echo "4. After deployment, update client code to use your new proxy URL" 