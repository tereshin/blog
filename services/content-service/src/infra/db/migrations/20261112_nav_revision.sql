CREATE TABLE nav_revision (id integer PRIMARY KEY CHECK (id = 1), version integer NOT NULL DEFAULT 1);
INSERT INTO nav_revision (id) VALUES (1);
