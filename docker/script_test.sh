docker compose down -v --remove-orphans
docker compose up -d medal-bdd-postgres
docker compose up medal-api-core
