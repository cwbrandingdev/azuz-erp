-- IF NOT EXISTS: an out-of-repo migration may have already added this value to dev.
ALTER TYPE "dev"."NotificationType" ADD VALUE IF NOT EXISTS 'TIME_CLOCK_REMINDER';
