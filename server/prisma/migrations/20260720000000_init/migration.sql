-- CardMaxxing initial schema

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CardNetwork" AS ENUM ('VISA', 'MASTERCARD', 'RUPAY', 'AMEX', 'DINERS');

-- CreateEnum
CREATE TYPE "CardCategory" AS ENUM ('CASHBACK', 'REWARDS', 'TRAVEL', 'FUEL', 'SHOPPING', 'LIFESTYLE', 'BUSINESS', 'SECURED', 'STUDENT');

-- CreateEnum
CREATE TYPE "CardTier" AS ENUM ('ENTRY', 'MID', 'PREMIUM', 'SUPER_PREMIUM');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('CASHBACK', 'POINTS', 'MILES', 'VOUCHERS');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "monthlyIncome" INTEGER,
    "creditScore" INTEGER,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "network" "CardNetwork" NOT NULL,
    "category" "CardCategory" NOT NULL,
    "tier" "CardTier" NOT NULL,
    "summary" TEXT NOT NULL,
    "joiningFee" INTEGER NOT NULL,
    "annualFee" INTEGER NOT NULL,
    "feeWaiverSpend" INTEGER,
    "forexMarkup" DOUBLE PRECISION NOT NULL,
    "minIncomeSalaried" INTEGER NOT NULL,
    "minIncomeSelfEmployed" INTEGER NOT NULL,
    "minAge" INTEGER NOT NULL DEFAULT 21,
    "maxAge" INTEGER NOT NULL DEFAULT 60,
    "minCreditScore" INTEGER NOT NULL DEFAULT 700,
    "rewardType" "RewardType" NOT NULL,
    "baseRewardRate" DOUBLE PRECISION NOT NULL,
    "rewardMultipliers" JSONB NOT NULL,
    "cappedMonthlyReward" INTEGER,
    "welcomeBenefit" TEXT,
    "milestoneBenefit" TEXT,
    "domesticLoungeVisits" INTEGER NOT NULL DEFAULT 0,
    "internationalLoungeVisits" INTEGER NOT NULL DEFAULT 0,
    "fuelSurchargeWaiver" BOOLEAN NOT NULL DEFAULT false,
    "fuelWaiverMonthlyCap" INTEGER,
    "golfBenefit" BOOLEAN NOT NULL DEFAULT false,
    "insuranceCoverInr" INTEGER,
    "conciergeService" BOOLEAN NOT NULL DEFAULT false,
    "highlights" TEXT[],
    "tags" TEXT[],
    "imageUrl" TEXT,
    "officialUrl" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferences" JSONB NOT NULL,
    "engineVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "explanation" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_items" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "breakdown" JSONB NOT NULL,
    "reasons" TEXT[],

    CONSTRAINT "recommendation_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");
CREATE UNIQUE INDEX "sessions_refreshTokenHash_key" ON "sessions"("refreshTokenHash");
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");
CREATE UNIQUE INDEX "cards_slug_key" ON "cards"("slug");
CREATE INDEX "cards_issuer_idx" ON "cards"("issuer");
CREATE INDEX "cards_category_idx" ON "cards"("category");
CREATE INDEX "cards_tier_idx" ON "cards"("tier");
CREATE INDEX "cards_annualFee_idx" ON "cards"("annualFee");
CREATE INDEX "cards_popularity_idx" ON "cards"("popularity");
CREATE INDEX "cards_isActive_popularity_idx" ON "cards"("isActive", "popularity");
CREATE INDEX "favorites_userId_createdAt_idx" ON "favorites"("userId", "createdAt");
CREATE UNIQUE INDEX "favorites_userId_cardId_key" ON "favorites"("userId", "cardId");
CREATE INDEX "recommendation_history_userId_createdAt_idx" ON "recommendation_history"("userId", "createdAt");
CREATE INDEX "recommendation_items_recommendationId_rank_idx" ON "recommendation_items"("recommendationId", "rank");
CREATE UNIQUE INDEX "recommendation_items_recommendationId_cardId_key" ON "recommendation_items"("recommendationId", "cardId");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recommendation_history" ADD CONSTRAINT "recommendation_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recommendation_items" ADD CONSTRAINT "recommendation_items_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "recommendation_history"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recommendation_items" ADD CONSTRAINT "recommendation_items_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
