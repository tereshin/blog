-- Legacy /about is replaced by administrator-managed pages.
update settings set seo = seo #- '{pages,about}';
alter table settings alter column seo set default '{"title":"","description":"","title_template":"{title} — {site_name}","indexing_enabled":true,"pages":{"home":{"title":"","description":""},"popular":{"title":"","description":""},"rating":{"title":"","description":""}},"publisher":{"name":"","logo_url":null,"same_as":[]}}'::jsonb;
alter table settings drop column about;
