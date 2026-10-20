ALTER TABLE "whatsapp_conversations"
ADD COLUMN "last_message_direction" "WhatsAppMessageDirection",
ADD COLUMN "last_message_status" "WhatsAppMessageStatus";

UPDATE "whatsapp_conversations" AS c
SET
  "last_message_direction" = m.direction,
  "last_message_status" = m.status
FROM (
  SELECT DISTINCT ON (conversation_id)
    conversation_id,
    direction,
    status
  FROM "whatsapp_messages"
  WHERE is_private = false
    AND conversation_id IS NOT NULL
  ORDER BY conversation_id, created_at DESC
) AS m
WHERE c.id = m.conversation_id;
