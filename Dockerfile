# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies required for node-gyp if needed
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Drop devDependencies so they are not shipped in the runtime image
RUN npm prune --omit=dev

# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
# Chromium's own sandbox needs kernel features most container runtimes don't grant.
# Untrusted HTML is still rendered with JavaScript disabled and all network requests
# blocked (see lib/converters/puppeteer-helper.ts). Set to "false" if your runtime
# supports the sandbox (e.g. with a seccomp profile that allows user namespaces).
ENV CHROME_NO_SANDBOX=true

# Install Chromium & fonts for headless PDF rendering
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
# Tesseract English language data (tesseract.js reads/caches it from the working directory)
COPY --from=builder /app/eng.traineddata ./eng.traineddata

# tesseract.js writes downloaded language data to the working directory
RUN chown nextjs:nodejs /app /app/eng.traineddata

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
