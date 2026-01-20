FROM node:20-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]

