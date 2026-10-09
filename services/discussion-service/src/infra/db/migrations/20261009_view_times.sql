-- Повторный просмотр спустя 30 минут увеличивает счётчик статьи, не добавляя вторую строку зрителя.
alter table views add column times integer not null default 1;
