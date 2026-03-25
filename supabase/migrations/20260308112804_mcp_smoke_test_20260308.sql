create schema if not exists _mcp_smoke_test;
create table if not exists _mcp_smoke_test.probe (id integer);
drop schema if exists _mcp_smoke_test cascade;
