#!/bin/bash

# Salon Success Manager - Docker Helper Scripts
# This script provides convenient commands for Docker operations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if .env file exists
check_env_file() {
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating from template..."
        if [ -f "env.example" ]; then
            cp env.example .env
            print_success ".env file created from template"
            print_warning "Please update the .env file with your actual configuration values"
        else
            print_error "env.example file not found. Please create a .env file manually."
            exit 1
        fi
    fi
}

# Function to setup development environment
setup_dev() {
    print_status "Setting up development environment..."
    check_env_file
    
    print_status "Building and starting development containers..."
    docker-compose -f docker-compose.dev.yml up --build -d
    
    print_status "Waiting for database to be ready..."
    sleep 10
    
    print_status "Running database migrations..."
    docker-compose -f docker-compose.dev.yml exec app npm run db:push
    
    print_success "Development environment is ready!"
    print_status "Application is running at: http://localhost:8080"
    print_status "Database is running at: localhost:5433"
}

# Function to setup production environment
setup_prod() {
    print_status "Setting up production environment..."
    check_env_file
    
    print_status "Building and starting production containers..."
    docker-compose up --build -d
    
    print_status "Waiting for database to be ready..."
    sleep 10
    
    print_status "Running database migrations..."
    docker-compose exec app npm run db:push
    
    print_success "Production environment is ready!"
    print_status "Application is running at: http://localhost:8080"
    print_status "Database is running at: localhost:5432"
}

# Function to stop all containers
stop_all() {
    print_status "Stopping all containers..."
    docker-compose down
    docker-compose -f docker-compose.dev.yml down
    print_success "All containers stopped"
}

# Function to view logs
view_logs() {
    local service=${1:-app}
    print_status "Viewing logs for service: $service"
    docker-compose logs -f $service
}

# Function to access container shell
shell() {
    local service=${1:-app}
    print_status "Accessing shell for service: $service"
    docker-compose exec $service /bin/sh
}

# Function to run database migrations
migrate() {
    print_status "Running database migrations..."
    docker-compose exec app npm run db:push
    print_success "Database migrations completed"
}

# Function to reset database
reset_db() {
    print_warning "This will delete all data in the database. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Stopping containers..."
        docker-compose down
        
        print_status "Removing database volume..."
        docker volume rm salonsuccessmanager_postgres_data 2>/dev/null || true
        
        print_status "Starting fresh database..."
        docker-compose up -d postgres
        
        print_status "Waiting for database to be ready..."
        sleep 10
        
        print_status "Running migrations..."
        migrate
        
        print_success "Database has been reset"
    else
        print_status "Database reset cancelled"
    fi
}

# Function to show container status
status() {
    print_status "Container status:"
    docker-compose ps
}

# Function to show help
show_help() {
    echo "Salon Success Manager - Docker Helper Scripts"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  setup-dev     Setup development environment"
    echo "  setup-prod    Setup production environment"
    echo "  stop          Stop all containers"
    echo "  logs [service] View logs (default: app)"
    echo "  shell [service] Access container shell (default: app)"
    echo "  migrate       Run database migrations"
    echo "  reset-db      Reset database (WARNING: deletes all data)"
    echo "  status        Show container status"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup-dev          # Start development environment"
    echo "  $0 logs app           # View application logs"
    echo "  $0 shell postgres     # Access database shell"
    echo "  $0 migrate            # Run database migrations"
}

# Main script logic
case "${1:-help}" in
    "setup-dev")
        setup_dev
        ;;
    "setup-prod")
        setup_prod
        ;;
    "stop")
        stop_all
        ;;
    "logs")
        view_logs $2
        ;;
    "shell")
        shell $2
        ;;
    "migrate")
        migrate
        ;;
    "reset-db")
        reset_db
        ;;
    "status")
        status
        ;;
    "help"|*)
        show_help
        ;;
esac
