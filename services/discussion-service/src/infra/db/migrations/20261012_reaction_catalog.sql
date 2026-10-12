-- Вид реакции больше не enum: идентификатор — исходный slug или UUID из каталога настроек.

alter table reactions alter column kind type text using kind::text;
drop type reaction_kind;

create table reaction_catalog (
  kind text primary key
);

insert into reaction_catalog (kind) values ('laugh'), ('heart'), ('thumb'), ('fire');
