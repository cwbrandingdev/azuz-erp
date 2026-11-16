-- Rewrite stored Supabase Storage URLs to the R2 public host.
--
-- DO NOT RUN while the office is using the app.
-- Run this only after:
--   1. The maintenance page is deployed and every page redirects to /manutencao.
--   2. node scripts/copy-supabase-storage-to-r2.mjs has finished a second pass
--      (failed=0) so files uploaded during the afternoon are on R2.
--   3. The R2 backend is about to be deployed, or is already deployed, with
--      STORAGE_PROVIDER=r2.
--
-- This replaces the public object prefix only. Paths stay the same because
-- R2 keys are "<supabase-bucket>/<path>".
-- Supabase objects are left in place.

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.swap_storage_url(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT replace(
    value,
    'https://sktjeijgyvulpzuzbmff.supabase.co/storage/v1/object/public/',
    'https://pub-1b35d92415fc4e6fbfe0af7fbd5a7ea4.r2.dev/'
  );
$$;

DO $$
DECLARE
  target_schema text;
  pair text[];
  target_table text;
  target_column text;
  changed bigint;
  pairs text[][] := ARRAY[
    ARRAY['deliverable_items', 'mediaUrl'],
    ARRAY['deliverable_items', 'previewUrl'],
    ARRAY['KanbanTaskAsset', 'fileUrl'],
    ARRAY['KanbanTaskAsset', 'previewUrl'],
    ARRAY['ContentAttachment', 'url'],
    ARRAY['ContentAttachment', 'previewUrl'],
    ARRAY['User', 'avatarUrl'],
    ARRAY['Client', 'avatarUrl'],
    ARRAY['AgencySettings', 'logoUrl'],
    ARRAY['AgencySettings', 'faviconUrl'],
    ARRAY['Asset', 'fileUrl'],
    ARRAY['Proposal', 'coverImageUrl'],
    ARRAY['Proposal', 'coverVideoUrl'],
    ARRAY['Contract', 'pdfUrl'],
    ARRAY['ProposalProject', 'imageUrl'],
    ARRAY['client_financial_attachments', 'file_url'],
    ARRAY['client_reports', 'file_url'],
    ARRAY['tasks', 'art_file_url'],
    ARRAY['whatsapp_messages', 'media_url'],
    ARRAY['whatsapp_canned_responses', 'media_url']
  ];
BEGIN
  FOREACH target_schema IN ARRAY ARRAY['public', 'dev']
  LOOP
    FOREACH pair SLICE 1 IN ARRAY pairs
    LOOP
      target_table := pair[1];
      target_column := pair[2];
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = target_schema
          AND table_name = target_table
          AND column_name = target_column
      ) THEN
        EXECUTE format(
          'UPDATE %I.%I SET %I = pg_temp.swap_storage_url(%I) WHERE %I LIKE %L',
          target_schema,
          target_table,
          target_column,
          target_column,
          target_column,
          '%/storage/v1/object/public/%'
        );
        GET DIAGNOSTICS changed = ROW_COUNT;
        RAISE NOTICE '% %.% rows=%', target_schema, target_table, target_column, changed;
      END IF;
    END LOOP;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = target_schema
        AND table_name = 'tasks'
        AND column_name = 'art_file_urls'
    ) THEN
      EXECUTE format(
        'UPDATE %I.tasks SET art_file_urls = pg_temp.swap_storage_url(art_file_urls::text)::jsonb WHERE art_file_urls::text LIKE %L',
        target_schema,
        '%/storage/v1/object/public/%'
      );
      GET DIAGNOSTICS changed = ROW_COUNT;
      RAISE NOTICE '% tasks.art_file_urls rows=%', target_schema, changed;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = target_schema
        AND table_name = 'PostVersion'
        AND column_name = 'mediaUrls'
    ) THEN
      EXECUTE format(
        $sql$
          UPDATE %I."PostVersion"
          SET "mediaUrls" = (
            SELECT COALESCE(array_agg(pg_temp.swap_storage_url(item)), '{}')
            FROM unnest("mediaUrls") AS item
          )
          WHERE "mediaUrls"::text LIKE %L
        $sql$,
        target_schema,
        '%/storage/v1/object/public/%'
      );
      GET DIAGNOSTICS changed = ROW_COUNT;
      RAISE NOTICE '% PostVersion.mediaUrls rows=%', target_schema, changed;
    END IF;
  END LOOP;
END $$;

-- After commit, this count must be 0 in both schemas.
-- SELECT 'dev' AS schema, count(*) FROM dev.deliverable_items WHERE "mediaUrl" LIKE '%/storage/v1/object/public/%'
-- UNION ALL
-- SELECT 'public', count(*) FROM public.deliverable_items WHERE "mediaUrl" LIKE '%/storage/v1/object/public/%';

COMMIT;
