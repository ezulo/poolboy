#!/bin/bash

set -e

# Check local environment
if [ -z "$POOLBOY_HOST" ]; then
  echo "env: POOLBOY_HOST not defined. Please define ( user@hostname )";
  exit 1;
fi
if [ -z "$POOLBOY_REMOTE_PATH" ]; then
  echo "env: POOLBOY_REMOTE_PATH not defined. Please set path of server deployment.";
  exit 1;
fi
if [ -z "$POOLBOY_SSH_KEY" ]; then
  echo "env (WARNING): POOLBOY_SSH_KEY not defined. Using default";
  SSH_CMD="ssh"
else
  SSH_CMD="ssh -i $POOLBOY_SSH_KEY"
fi

# Derive ORIGIN from POOLBOY_HOST (strip user@, add port)
POOLBOY_HOSTNAME="${POOLBOY_HOST#*@}"
POOLBOY_PORT="${POOLBOY_PORT:-3000}"
POOLBOY_ORIGIN="http://${POOLBOY_HOSTNAME}"


# Build locally
echo "Building..."
npm run build

# Stop remote server
echo "Stopping remote server..."
$SSH_CMD "$POOLBOY_HOST" "source ~/.nvm/nvm.sh && pm2 stop poolboy 2>/dev/null || true"

# Sync build output
echo "Syncing files..."
rsync -avz -e "$SSH_CMD" --delete build/ "$POOLBOY_HOST:$POOLBOY_REMOTE_PATH/build/"

# Sync package files
rsync -avz -e "$SSH_CMD" package.json package-lock.json "$POOLBOY_HOST:$POOLBOY_REMOTE_PATH/"

# Generate pm2 config with correct ORIGIN
$SSH_CMD "$POOLBOY_HOST" "cat > $POOLBOY_REMOTE_PATH/ecosystem.config.cjs << PMEOF
module.exports = {
  apps: [{
    name: 'poolboy',
    script: 'build/index.js',
    env: {
      DATABASE_URL: 'local.db',
      ORIGIN: '$POOLBOY_ORIGIN:$POOLBOY_PORT'
    }
  }]
}
PMEOF"

# Create fresh database if server doesn't have one (or if overwrite requested)
if [ -n "$POOLBOY_DB_OVERWRITE" ] || ! $SSH_CMD "$POOLBOY_HOST" "test -f $POOLBOY_REMOTE_PATH/local.db"; then
  echo "Creating fresh database..."
  TMPDB=$(mktemp)
  DATABASE_URL="$TMPDB" npx drizzle-kit push --force
  rsync -avz -e "$SSH_CMD" "$TMPDB" "$POOLBOY_HOST:$POOLBOY_REMOTE_PATH/local.db"
  rm "$TMPDB"
fi

# Install deps and restart
echo "Installing dependencies and restarting..."
$SSH_CMD "$POOLBOY_HOST" "source ~/.nvm/nvm.sh && cd $POOLBOY_REMOTE_PATH && npm ci --omit=dev && pm2 start ecosystem.config.cjs"

echo "-------------------------"
echo "Deployment successful! :)"
echo "Hosting at: $POOLBOY_ORIGIN:$POOLBOY_PORT"
echo "-------------------------"

