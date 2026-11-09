DROP INDEX "employees_userId_key";

CREATE UNIQUE INDEX "employees_organizationId_userId_key"
ON "employees"("organizationId", "userId");
