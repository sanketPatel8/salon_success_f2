# Salon Success Manager - Makefile for Docker Operations

.PHONY: help setup-dev setup-prod stop logs shell migrate reset-db status clean build

# Default target
help:
	@echo "Salon Success Manager - Docker Operations"
	@echo ""
	@echo "Available commands:"
	@echo "  setup-dev     Setup development environment"
	@echo "  setup-prod    Setup production environment"
	@echo "  stop          Stop all containers"
	@echo "  logs          View application logs"
	@echo "  shell         Access application container shell"
	@echo "  migrate       Run database migrations"
	@echo "  reset-db      Reset database (WARNING: deletes all data)"
	@echo "  status        Show container status"
	@echo "  clean         Clean up containers and volumes"
	@echo "  build         Build application images"
	@echo "  help          Show this help message"

# Development environment
setup-dev:
	@./docker-scripts.sh setup-dev

# Production environment
setup-prod:
	@./docker-scripts.sh setup-prod

# Stop all containers
stop:
	@./docker-scripts.sh stop

# View logs
logs:
	@./docker-scripts.sh logs app

# Access shell
shell:
	@./docker-scripts.sh shell app

# Run migrations
migrate:
	@./docker-scripts.sh migrate

# Reset database
reset-db:
	@./docker-scripts.sh reset-db

# Show status
status:
	@./docker-scripts.sh status

# Clean up
clean:
	@echo "Cleaning up containers and volumes..."
	@docker-compose down -v
	@docker-compose -f docker-compose.dev.yml down -v
	@docker system prune -f
	@echo "Cleanup completed"

# Build images
build:
	@echo "Building application images..."
	@docker-compose build
	@docker-compose -f docker-compose.dev.yml build
	@echo "Build completed"
