FROM node:22 AS build

WORKDIR /usr/src/app

COPY package*.json tsconfig*.json ./
COPY prisma ./prisma/

RUN npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 \
  || npm ci --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000

RUN npx prisma generate

COPY . .

RUN npm run build

FROM node:22-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
RUN chown node:node /usr/src/app

ENV NODE_ENV=production
ENV PORT=8080

COPY --chown=node:node package*.json ./
COPY --chown=node:node prisma ./prisma/
COPY --chown=node:node docker-entrypoint.sh ./docker-entrypoint.sh

USER node

RUN (npm ci --omit=dev --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000 \
  || npm ci --omit=dev --fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000) \
  && npm cache clean --force

RUN npx prisma generate

COPY --chown=node:node --from=build /usr/src/app/dist ./dist

RUN mkdir -p uploads && chmod +x docker-entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]