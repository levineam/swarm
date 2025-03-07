FROM golang:1.23-bullseye AS build-env

WORKDIR /usr/src/social-app

ENV DEBIAN_FRONTEND=noninteractive

# Node
ENV NODE_VERSION=20
ENV NVM_DIR=/usr/share/nvm

# Go
ENV GODEBUG="netdns=go"
ENV GOOS="linux"
ENV GOARCH="amd64"
ENV CGO_ENABLED=1
ENV GOEXPERIMENT="loopvar"

# Expo
ARG EXPO_PUBLIC_BUNDLE_IDENTIFIER
ENV EXPO_PUBLIC_BUNDLE_IDENTIFIER=${EXPO_PUBLIC_BUNDLE_IDENTIFIER:-dev}

COPY . .

#
# Generate the JavaScript webpack.
#
RUN mkdir --parents $NVM_DIR && \
  wget \
    --output-document=/tmp/nvm-install.sh \
    https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh && \
  bash /tmp/nvm-install.sh

RUN \. "$NVM_DIR/nvm.sh" && \
  nvm install $NODE_VERSION && \
  nvm use $NODE_VERSION && \
  echo "Using bundle identifier: $EXPO_PUBLIC_BUNDLE_IDENTIFIER" && \
  echo "EXPO_PUBLIC_BUNDLE_IDENTIFIER=$EXPO_PUBLIC_BUNDLE_IDENTIFIER" >> .env && \
  echo "EXPO_PUBLIC_BUNDLE_DATE=$(date -u +"%y%m%d%H")" >> .env && \
  npm install --global yarn && \
  yarn && \
  yarn intl:build && \
  EXPO_PUBLIC_BUNDLE_IDENTIFIER=$EXPO_PUBLIC_BUNDLE_IDENTIFIER EXPO_PUBLIC_BUNDLE_DATE=$() yarn build-web

# DEBUG
RUN echo "Listing static files:" && \
  find ./bskyweb/static && \
  echo "Listing web-build files:" && \
  find ./web-build/static

# Copy web-build static files to bskyweb/static
RUN mkdir -p ./bskyweb/static/js && \
    mkdir -p ./bskyweb/static/css && \
    mkdir -p ./bskyweb/static/media && \
    cp -r ./web-build/static/js/* ./bskyweb/static/js/ && \
    cp -r ./web-build/static/css/* ./bskyweb/static/css/ && \
    cp -r ./web-build/static/media/* ./bskyweb/static/media/ || true

#
# Generate the bskyweb Go binary.
#
RUN cd bskyweb/ && \
  go mod download && \
  go mod verify

RUN cd bskyweb/ && \
  go build \
    -v  \
    -trimpath \
    -tags timetzdata \
    -o /bskyweb \
    ./cmd/bskyweb

FROM debian:bullseye-slim

ENV GODEBUG=netdns=go
ENV TZ=Etc/UTC
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install --yes \
  dumb-init \
  ca-certificates \
  curl \
  procps \
  net-tools

ENTRYPOINT ["dumb-init", "--"]

WORKDIR /bskyweb
COPY --from=build-env /bskyweb /usr/bin/bskyweb
COPY --from=build-env /usr/src/social-app/bskyweb/static /bskyweb/static
COPY --from=build-env /usr/src/social-app/bskyweb/templates /bskyweb/templates
COPY healthcheck.sh /usr/bin/healthcheck.sh

# Create a wrapper script to set HTTP_ADDRESS based on PORT
RUN echo '#!/bin/bash\n\
export HTTP_ADDRESS=":${PORT:-10000}"\n\
echo "Starting server on HTTP_ADDRESS=$HTTP_ADDRESS"\n\
echo "Listing contents of /bskyweb:"\n\
ls -la /bskyweb\n\
echo "Listing contents of /bskyweb/static:"\n\
ls -la /bskyweb/static || echo "Static directory not found"\n\
echo "Listing contents of /bskyweb/templates:"\n\
ls -la /bskyweb/templates || echo "Templates directory not found"\n\
echo "Starting bskyweb server..."\n\
exec /usr/bin/bskyweb serve\n\
' > /usr/bin/start.sh && chmod +x /usr/bin/start.sh

# Use the wrapper script as the command
CMD ["/usr/bin/start.sh"]

LABEL org.opencontainers.image.source=https://github.com/bluesky-social/social-app
LABEL org.opencontainers.image.description="bsky.app Web App"
LABEL org.opencontainers.image.licenses=MIT

# NOOP
