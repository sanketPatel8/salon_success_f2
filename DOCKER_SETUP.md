# Salon Success Manager - Docker Setup Guide

This guide will help you run the Salon Success Manager application using Docker and Docker Compose.

## Prerequisites

- Docker Desktop (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)
- Git

## Quick Start

### 1. Clone and Setup Environment

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd SalonSuccessManager

# Copy environment template
cp env.example .env

# Edit the .env file with your configuration
nano .env
```

### 2. Start Development Environment

```bash
# Using the helper script (recommended - includes database setup)
./docker-scripts.sh setup-dev

# Or using Make
make setup-dev

# Or using Docker Compose directly
docker-compose -f docker-compose.dev.yml up --build -d

# IMPORTANT: Run database migrations after starting
docker-compose -f docker-compose.dev.yml exec app npm run db:push
```

### 3. Access the Application

- **Application**: http://localhost:8080
- **Database**: localhost:5433 (PostgreSQL)
- **Admin Panel**: http://localhost:8080/admin (password: admin123)

## Configuration

### Environment Variables

The application requires several environment variables. Copy `env.example` to `.env` and update the values:

#### Required Variables

```bash
# Database (automatically configured for Docker)
DATABASE_URL=postgresql://salon_user:salon_password@postgres:5432/salon_success_manager

# Session Security
SESSION_SECRET=your-super-secret-session-key-change-in-production

# Stripe (for payment processing)
# Get these from: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key_here

# Email Service (choose one)
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
# OR
GMAIL_USER=your_gmail@gmail.com
GMAIL_PASS=your_app_password_here
```

#### Optional Variables

```bash
# Admin Panel
ADMIN_PASSWORD=admin123

# Marketing Automation
ACTIVECAMPAIGN_API_KEY=your_activecampaign_api_key_here
ACTIVECAMPAIGN_API_URL=https://your_account.api-us1.com
ACTIVECAMPAIGN_LIST_ID=your_list_id_here
```

## Docker Commands

### Using Helper Scripts

```bash
# Development environment
./docker-scripts.sh setup-dev

# Production environment
./docker-scripts.sh setup-prod

# View logs
./docker-scripts.sh logs app

# Access container shell
./docker-scripts.sh shell app

# Run database migrations
./docker-scripts.sh migrate

# Stop all containers
./docker-scripts.sh stop

# Reset database (WARNING: deletes all data)
./docker-scripts.sh reset-db
```

### Using Make

```bash
# Development environment
make setup-dev

# Production environment
make setup-prod

# View logs
make logs

# Access shell
make shell

# Run migrations
make migrate

# Stop containers
make stop

# Clean up everything
make clean
```

### Using Docker Compose Directly

```bash
# Development
docker-compose -f docker-compose.dev.yml up --build -d

# Production
docker-compose up --build -d

# View logs
docker-compose logs -f app

# Access shell
docker-compose exec app /bin/sh

# Stop containers
docker-compose down
```

## Services

### Application Service (`app`)

- **Port**: 8080
- **Environment**: Development/Production
- **Features**: Full-stack application with React frontend and Express backend

### Database Service (`postgres`)

- **Port**: 5432 (production) / 5433 (development)
- **Database**: `salon_success_manager`
- **User**: `salon_user`
- **Password**: `salon_password`

### Redis Service (Optional)

- **Port**: 6379
- **Profile**: production
- **Purpose**: Session storage for production environments

## Development vs Production

### Development Environment

- Uses `docker-compose.dev.yml`
- Hot reloading enabled
- Source code mounted as volume
- Separate database instance
- Debug logging enabled

### Production Environment

- Uses `docker-compose.yml`
- Optimized build
- Persistent volumes
- Health checks
- Redis for session storage

## Database Management

### Running Migrations

```bash
# Using helper script
./docker-scripts.sh migrate

# Using Make
make migrate

# Using Docker Compose
docker-compose exec app npm run db:push
```

### Accessing Database

```bash
# Using psql
docker-compose exec postgres psql -U salon_user -d salon_success_manager

# Using helper script
./docker-scripts.sh shell postgres
```

### Resetting Database

```bash
# WARNING: This deletes all data
./docker-scripts.sh reset-db
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   lsof -i :8080
   
   # Stop conflicting services
   docker-compose down
   ```

2. **Database Connection Issues**
   ```bash
   # Check database status
   docker-compose ps postgres
   
   # View database logs
   docker-compose logs postgres
   ```

3. **Build Failures**
   ```bash
   # Clean build cache
   docker system prune -a
   
   # Rebuild without cache
   docker-compose build --no-cache
   ```

4. **Permission Issues**
   ```bash
   # Make scripts executable
   chmod +x docker-scripts.sh
   ```

### Logs and Debugging

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f app
docker-compose logs -f postgres

# Follow logs in real-time
docker-compose logs -f --tail=100 app
```

### Health Checks

```bash
# Check service status
docker-compose ps

# Check health status
docker inspect salon-success-app | grep Health -A 10
```

## File Structure

```
SalonSuccessManager/
├── Dockerfile                 # Production Docker image
├── Dockerfile.dev            # Development Docker image
├── docker-compose.yml        # Production services
├── docker-compose.dev.yml    # Development services
├── docker-scripts.sh         # Helper scripts
├── Makefile                  # Make commands
├── env.example               # Environment template
├── .env                      # Your environment config
├── init-db/                  # Database initialization
│   └── 01-init.sql
└── DOCKER_SETUP.md          # This guide
```

## Security Notes

1. **Never commit `.env` files** to version control
2. **Use strong secrets** in production
3. **Enable SSL** for production deployments
4. **Regularly update** Docker images
5. **Use secrets management** for sensitive data

## Performance Optimization

1. **Use multi-stage builds** (already implemented)
2. **Enable build cache** for faster builds
3. **Use .dockerignore** to exclude unnecessary files
4. **Optimize image layers** for smaller images
5. **Use health checks** for better reliability

## Support

If you encounter issues:

1. Check the logs: `./docker-scripts.sh logs app`
2. Verify environment variables in `.env`
3. Ensure Docker Desktop is running
4. Check port availability
5. Review this documentation

For additional help, refer to the main project documentation or create an issue in the repository.
