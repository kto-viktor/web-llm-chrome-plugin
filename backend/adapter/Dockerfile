# Zero-dependency Node service — no install step needed.
FROM node:22-alpine

WORKDIR /app
COPY package.json ./
COPY config.js rate-limit.js server.js ./

ENV PORT=8080
EXPOSE 8080

# Lightweight healthcheck against the unauthenticated /healthz route.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||8080)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
