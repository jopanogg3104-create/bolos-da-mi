#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
SQL_TEST_CONTAINER="mi-db-check-$$"
export SQL_TEST_CONTAINER
trap 'docker rm -f "$SQL_TEST_CONTAINER" >/dev/null 2>&1 || true' EXIT
# Disposable database, no mounted project files and no published network port.
docker run --detach --rm --name "$SQL_TEST_CONTAINER" --network none --memory=512m --tmpfs /var/lib/postgresql/data -e POSTGRES_PASSWORD=local-validation-only postgres:17 >/dev/null
ready=false
for i in {1..100}; do
  if docker exec "$SQL_TEST_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then ready=true; break; fi
  sleep 0.2
done
if [ "$ready" != true ]; then echo 'PostgreSQL não iniciou para os testes.' >&2; exit 1; fi
for file in tests/database/bootstrap.sql supabase/schema.sql supabase/migrations/001-order-system.sql; do
  docker exec -i "$SQL_TEST_CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 < "$file" >/dev/null
done
node tests/database/system.cjs
