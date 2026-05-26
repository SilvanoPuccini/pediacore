.PHONY: help up down build logs shell migrate makemigrations createsuperuser test lint format

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Docker - Development
up: ## Start development containers
	docker compose up -d

down: ## Stop development containers
	docker compose down

build: ## Build development containers
	docker compose build

logs: ## Tail logs from all containers
	docker compose logs -f

logs-backend: ## Tail backend logs
	docker compose logs -f backend

# Docker - Production
prod-up: ## Start production containers
	docker compose -f docker-compose.prod.yml up -d

prod-down: ## Stop production containers
	docker compose -f docker-compose.prod.yml down

prod-build: ## Build production containers
	docker compose -f docker-compose.prod.yml build

# Django
shell: ## Open Django shell in backend container
	docker compose exec backend python manage.py shell

migrate: ## Run Django migrations
	docker compose exec backend python manage.py migrate

makemigrations: ## Create Django migrations
	docker compose exec backend python manage.py makemigrations

createsuperuser: ## Create Django superuser
	docker compose exec backend python manage.py createsuperuser

collectstatic: ## Collect static files
	docker compose exec backend python manage.py collectstatic --noinput

# Quality
test: ## Run pytest
	docker compose exec backend pytest

test-cov: ## Run pytest with coverage
	docker compose exec backend pytest --cov=apps --cov-report=term-missing

lint: ## Run ruff linter
	docker compose exec backend ruff check .

format: ## Format code with ruff and black
	docker compose exec backend ruff check --fix . && docker compose exec backend black .
