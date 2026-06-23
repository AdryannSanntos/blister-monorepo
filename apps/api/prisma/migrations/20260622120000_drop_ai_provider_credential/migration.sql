-- Provider credentials now live in the environment (loaded by the SDK
-- integration module), never in Postgres. Drop the table and its index.
DROP TABLE IF EXISTS "AiProviderCredential";
