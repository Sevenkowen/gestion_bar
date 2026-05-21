-- CreateEnum
CREATE TYPE "IngredientKind" AS ENUM ('COCINA', 'BEBIDA');

-- AlterTable
ALTER TABLE "ingredients" ADD COLUMN     "kind" "IngredientKind" NOT NULL DEFAULT 'COCINA';
