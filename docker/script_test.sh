docker compose down -v --remove-orphans
docker rmi medal-gestion-sistema-medal-api-core:latest
docker compose up -d medal-bdd-postgres
docker compose up -d redis 
docker compose up --build medal-api-core
