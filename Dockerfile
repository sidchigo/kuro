FROM node:20-slim
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

COPY package*.json ./
RUN npm ci --omit=dev

COPY dist ./dist
RUN mkdir -p /app/data

EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]
