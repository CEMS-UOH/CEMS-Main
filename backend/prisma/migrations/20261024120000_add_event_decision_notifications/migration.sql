-- AlterEnum
-- FR-17: the organizer is notified when an admin approves or rejects their event.
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_REJECTED';
