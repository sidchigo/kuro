FROM node:20-slim
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321
ENV PROTOCOL_HEADER=x-forwarded-proto

COPY package*.json ./
RUN npm ci --omit=dev

COPY build ./build
RUN mkdir -p /app/data

EXPOSE 4321

CMD ["node", "build"]
