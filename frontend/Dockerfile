FROM node:20-alpine AS build
WORKDIR /app

# Accept build argument for API URL and Chatbot URL
ARG VITE_API_URL=http://localhost:8000
ARG VITE_CHATBOT_URL=http://localhost:8001

# Install dependencies first
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application with VITE_API_URL and VITE_CHATBOT_URL available during build
RUN VITE_API_URL=$VITE_API_URL VITE_CHATBOT_URL=$VITE_CHATBOT_URL npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]