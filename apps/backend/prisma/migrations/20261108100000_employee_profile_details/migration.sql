ALTER TYPE "EmployeeStatus" ADD VALUE 'INACTIVE';
ALTER TYPE "LifecycleEventType" ADD VALUE 'STATUS_CHANGE';

ALTER TABLE "employees"
ADD COLUMN "panNumber" TEXT,
ADD COLUMN "uan" TEXT,
ADD COLUMN "bankAccountHolderName" TEXT,
ADD COLUMN "bankAccountNumber" TEXT,
ADD COLUMN "bankIfsc" TEXT;
