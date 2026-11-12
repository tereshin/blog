CREATE TABLE sidebar_config (id integer PRIMARY KEY CHECK (id = 1), version integer NOT NULL, config jsonb NOT NULL);
INSERT INTO sidebar_config VALUES (1, 1, '{"version":1,"sections":[{"id":"1c6f716b-077a-4dad-a16f-66cc074b3d86","title":"Popular comments","has_card":true,"widgets":[{"id":"e42f1358-894a-4bd7-970b-23f382b3aa18","type":"adminComments","data":{"limit":2,"sort":"reactions","direction":"desc","period":"all","article_id":null}}]}]}');
CREATE TABLE widget_mutations (actor_id uuid NOT NULL, key text NOT NULL, fingerprint text NOT NULL, response jsonb NOT NULL, PRIMARY KEY(actor_id, key));
CREATE TABLE feedback_submissions (id uuid PRIMARY KEY, key text NOT NULL UNIQUE, fingerprint text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE feedback_delivery (id uuid PRIMARY KEY, token_hash text NOT NULL, payload jsonb NOT NULL, expires_at timestamptz NOT NULL);
