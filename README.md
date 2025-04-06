# Splito Backend

A Node.js backend service for the Splito application using Express, TypeScript, Prisma, and Stellar SDK.

## Requirements

- Node.js 18+
- Docker & Docker Compose

## Local Development Setup

### Option 1: Quick Setup (Recommended)

1. **Clone the repository**

   ```bash
   git clone [repository-url]
   cd backend
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Setup environment variables**

   ```bash
   cp .env.example .env
   # Edit the .env file with your configuration
   ```

4. **Start the local PostgreSQL database**

   ```bash
   npm run localdb:up
   # This runs docker-compose up -d
   ```

5. **Run Prisma migrations**

   ```bash
   npm run prisma:migrate
   ```

6. **Start the development server**

   ```bash
   npm run dev
   # This runs nodemon for hot-reload
   ```

7. **Access the API**
   - The server runs at http://localhost:4000 by default
   - API documentation is available at http://localhost:4000/api-docs

## Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with hot-reload
- `npm run build` - Build the TypeScript project
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio for DB management
- `npm run prisma:types` - Generate TypeScript types from Prisma schema
- `npm run localdb:up` - Start the local PostgreSQL database
- `npm run localdb:down` - Stop the local PostgreSQL database

## Database Management

- **Prisma Studio**: Run `npm run prisma:studio` to access the database UI at http://localhost:5555
- **Local PostgreSQL**: Accessible at `postgresql://postgres:postgres@localhost:5432/splito`

## Deployment

### Docker Build and Push

```bash
npm run docker:build  # Build Docker image
npm run docker:run    # Run Docker container locally
npm run docker:push   # Push image to Google Container Registry
```

## Stellar Integration

This project uses the Stellar SDK for blockchain transactions. Make sure to configure your Stellar settings in the .env file.

## API Documentation

The API is documented using Swagger. Once the server is running, you can access the interactive API documentation at:

```
http://localhost:4000/api-docs
```

This provides a user-friendly interface to:

- Explore available endpoints
- Read detailed documentation about request/response formats
- Test API endpoints directly from the browser
- Understand authentication requirements
