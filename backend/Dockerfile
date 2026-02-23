FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init su-exec python3 make g++

FROM base AS deps
COPY package*.json ./
RUN npm install --omit=dev && cp -R node_modules /tmp/prod_modules
RUN npm install

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /tmp/prod_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 5000
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "dist/server.js"]
