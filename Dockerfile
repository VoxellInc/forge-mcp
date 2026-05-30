# Builds the Forge MCP server for container runtimes (Glama introspection, OCI distribution).
# The server starts WITHOUT FORGE_API_KEY (tools are listed; `embed` errors until a key is set),
# so introspection/`tools/list` works credential-free.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# stdio MCP server
ENTRYPOINT ["node", "dist/cli.js"]
