FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat




WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml*  ./
COPY env/ ./env/


RUN npm i

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app


COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Replace environemnt variable
ARG CONFIG_ENV
# RUN if [ $e $CONFIG_ENV  == "dev" ]; then \
#     mv /app/env/config_dev.json ./config.json; \
#   fi
# RUN cat ./config.json

RUN apk update && apk add jq

ARG DD_RUM_KEY
# Set working directory
WORKDIR /app
# install node modules
COPY package.json /app/package.json
RUN npm install
# Copy all files from current directory to working dir in image
COPY . .
RUN echo "$CONFIG_ENV"
# Move env specific config file
RUN jq --arg DD_RUM_KEY $DD_RUM_KEY '.DD_RUM_KEY=$DD_RUM_KEY' </app/env/config-${CONFIG_ENV}.json >/app/config.json
RUN cat /app/config.json
# Build the assets
RUN yarn build

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]
