begin;

revoke select on all tables in schema public from anon;

commit;
