DROP TABLE IF EXISTS "whatsapp_messages";
DROP TABLE IF EXISTS "whatsapp_conversations";

DROP INDEX IF EXISTS "Company_whatsapp_phone_number_id_key";

ALTER TABLE "Company" DROP COLUMN IF EXISTS "whatsappApiToken";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "whatsapp_api_token";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "whatsapp_phone_number_id";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "whatsapp_business_account_id";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "whatsapp_verify_token";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "whatsapp_embedded_signup_config_id";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "whatsapp_app_id";
ALTER TABLE "Company" DROP COLUMN IF EXISTS "whatsapp_app_secret";
