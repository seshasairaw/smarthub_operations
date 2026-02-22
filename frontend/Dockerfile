FROM node:20-alpine as build
WORKDIR /app

# Accept build argument for API URL
ARG VITE_API_URL=http://localhost:8000

# Install dependencies first
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application with VITE_API_URL available during build
RUN VITE_API_URL=$VITE_API_URL npm run build

FROM node:20-alpine as runtime
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]