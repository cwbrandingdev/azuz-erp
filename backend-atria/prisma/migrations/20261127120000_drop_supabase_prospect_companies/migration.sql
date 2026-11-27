-- Company catalog lives on Neon. Drop the leftover Supabase copy.
-- The app connection uses schema=dev, while the table was created in public.
DROP TABLE IF EXISTS "prospect_companies";
DROP TABLE IF EXISTS public."prospect_companies";

DROP TYPE IF EXISTS "ProspectFitVerdict";
DROP TYPE IF EXISTS public."ProspectFitVerdict";
