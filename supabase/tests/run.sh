#!/usr/bin/env bash
# Runs the database rule tests on a fresh database. Usage: supabase/tests/run.sh "<psql connection args>"
# Example: supabase/tests/run.sh "-h localhost -p 5432 -U postgres"
set -euo pipefail
cd "$(dirname "$0")/../.."
P="psql $1"
$P -qc "drop database if exists ridego_test" -qc "create database ridego_test" >/dev/null
for f in supabase/tests/supabase_stub.sql supabase/schema.sql supabase/seed.sql supabase/tests/rules_test.sql; do
  $P -d ridego_test -q -v ON_ERROR_STOP=1 -f "$f" > /dev/null
done
echo "ALL RULE TESTS PASSED"
