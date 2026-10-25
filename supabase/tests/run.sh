#!/usr/bin/env sh
# Prueba la base en un PostgreSQL vacío, local o de la CI (nunca en Supabase):
# entorno mínimo de Supabase, schema.sql dos veces (debe poder repetirse),
# T-12 (RLS entre dos usuarios) y el seed con sus números. La conexión sale
# de las variables de psql (PGHOST, PGUSER, PGDATABASE...).
set -eu
cd "$(dirname "$0")/../.."

# Solo errores y los mensajes de las pruebas, sin los avisos de "ya existe".
export PGOPTIONS="${PGOPTIONS:-} -c client_min_messages=warning"

run() {
  psql -X -q -v ON_ERROR_STOP=1 "$@"
}

run -f supabase/tests/supabase-local.sql
run -f supabase/schema.sql
run -f supabase/schema.sql
run -f supabase/tests/rls.sql -o /dev/null
run -c "insert into auth.users (email) values ('tu-correo@ejemplo.com') on conflict (email) do nothing"
run -f supabase/seed.sql
run -f supabase/seed.sql
PGOPTIONS="${PGOPTIONS} -c client_min_messages=notice" run -f supabase/tests/seed-expected.sql

echo "Base de datos OK: esquema repetible, T-12 y seed."
