FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --omit=dev --workspace=@pondo/api --workspace=@pondo/shared
COPY packages/shared packages/shared
COPY apps/api/src apps/api/src
WORKDIR /app/apps/api
ENV NODE_ENV=production PORT=3001
EXPOSE 3001
USER node
CMD ["npm", "start"]
