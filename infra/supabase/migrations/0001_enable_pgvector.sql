-- Migration 0001 — habilita a extensao pgvector.
-- Pre-requisito do RAG da base de conhecimento (busca semantica).
-- Rode no SQL editor do Supabase ou via CLI.

create extension if not exists vector;

-- Verificacao:
--   select * from pg_extension where extname = 'vector';
