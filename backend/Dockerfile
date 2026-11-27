FROM node:20-alpine
WORKDIR /app

# Prisma's query engine is dynamically linked against OpenSSL. node:*-alpine does not
# guarantee it, and without it the container builds fine but fails at the first query with
# "Unable to require libquery_engine-linux-musl-openssl-3.0.x.so.node".
RUN apk add --no-cache openssl

COPY package*.json ./

# `prisma` (the CLI) is a runtime dependency on purpose, not a devDependency:
#   1. `npm ci --omit=dev` would otherwise skip it and the `npx prisma generate` below
#      would try to download the CLI mid-build.
#   2. Applying migrations on the server is `npx prisma migrate deploy` inside this
#      container, which needs the CLI present at runtime.
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

EXPOSE 5000
CMD ["node", "src/index.js"]
