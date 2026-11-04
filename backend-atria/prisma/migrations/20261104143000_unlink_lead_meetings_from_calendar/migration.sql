UPDATE "KanbanTask"
SET "calendarEventId" = NULL
WHERE "calendarEventId" IN (
  SELECT "calendar_event_id"
  FROM "lead_meetings"
  WHERE "calendar_event_id" IS NOT NULL
);

DELETE FROM "CalendarEvent"
WHERE "id" IN (
  SELECT "calendar_event_id"
  FROM "lead_meetings"
  WHERE "calendar_event_id" IS NOT NULL
);
