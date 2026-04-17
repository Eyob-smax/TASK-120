# ForgeOps Offline Console - Frontend Build & Serve
# Multi-stage: build the Svelte SPA, then serve static files

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --ignore-scripts
COPY . .
ARG VITE_PBKDF2_ITERATIONS=600000
ENV VITE_PBKDF2_ITERATIONS=${VITE_PBKDF2_ITERATIONS}
RUN npm run build

FROM node:20-alpine AS serve
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 4173
CMD ["serve", "-s", "dist", "-l", "4173"]
