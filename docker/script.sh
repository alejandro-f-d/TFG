docker compose down -v --remove-orphans
docker rmi medal-gestion-sistema-medal-api-core:latest
docker rmi medal-gestion-sistema-medal-worker:latest
docker compose up -d medal-bdd-postgres
docker compose up -d redis
docker compose up -d medal-worker
docker compose up -d medal-storage
docker compose up -d medal-sign-validator
docker compose up -d medal-nginx
docker compose up --build medal-api-core
