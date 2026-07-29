/*
  Warnings:

  - The primary key for the `Competition` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `CompetitionMember` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Edition` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `EditionMember` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `EditionTeam` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `EditionTeamPlayer` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `EditionTeamStaff` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Invitation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Match` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `MatchEvent` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `MatchReferee` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `OfficialCertification` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Person` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Round` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Sport` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Team` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `TeamAchievement` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `TeamConvocation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `TeamConvocationMember` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `TeamMember` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "Competition" DROP CONSTRAINT "Competition_sportId_fkey";

-- DropForeignKey
ALTER TABLE "CompetitionMember" DROP CONSTRAINT "CompetitionMember_competitionId_fkey";

-- DropForeignKey
ALTER TABLE "CompetitionMember" DROP CONSTRAINT "CompetitionMember_personId_fkey";

-- DropForeignKey
ALTER TABLE "Edition" DROP CONSTRAINT "Edition_competitionId_fkey";

-- DropForeignKey
ALTER TABLE "EditionMember" DROP CONSTRAINT "EditionMember_editionId_fkey";

-- DropForeignKey
ALTER TABLE "EditionMember" DROP CONSTRAINT "EditionMember_personId_fkey";

-- DropForeignKey
ALTER TABLE "EditionTeam" DROP CONSTRAINT "EditionTeam_editionId_fkey";

-- DropForeignKey
ALTER TABLE "EditionTeam" DROP CONSTRAINT "EditionTeam_enrolledBy_fkey";

-- DropForeignKey
ALTER TABLE "EditionTeam" DROP CONSTRAINT "EditionTeam_teamId_fkey";

-- DropForeignKey
ALTER TABLE "EditionTeamPlayer" DROP CONSTRAINT "EditionTeamPlayer_editionTeamId_fkey";

-- DropForeignKey
ALTER TABLE "EditionTeamPlayer" DROP CONSTRAINT "EditionTeamPlayer_personId_fkey";

-- DropForeignKey
ALTER TABLE "EditionTeamStaff" DROP CONSTRAINT "EditionTeamStaff_editionTeamId_fkey";

-- DropForeignKey
ALTER TABLE "EditionTeamStaff" DROP CONSTRAINT "EditionTeamStaff_personId_fkey";

-- DropForeignKey
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_competitionId_fkey";

-- DropForeignKey
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_editionId_fkey";

-- DropForeignKey
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_personId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_awayEditionTeamId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_editionId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_homeEditionTeamId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_parentAwayMatchId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_parentHomeMatchId_fkey";

-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_roundId_fkey";

-- DropForeignKey
ALTER TABLE "MatchEvent" DROP CONSTRAINT "MatchEvent_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "MatchEvent" DROP CONSTRAINT "MatchEvent_editionTeamId_fkey";

-- DropForeignKey
ALTER TABLE "MatchEvent" DROP CONSTRAINT "MatchEvent_matchId_fkey";

-- DropForeignKey
ALTER TABLE "MatchEvent" DROP CONSTRAINT "MatchEvent_personId_fkey";

-- DropForeignKey
ALTER TABLE "MatchReferee" DROP CONSTRAINT "MatchReferee_matchId_fkey";

-- DropForeignKey
ALTER TABLE "MatchReferee" DROP CONSTRAINT "MatchReferee_personId_fkey";

-- DropForeignKey
ALTER TABLE "OfficialCertification" DROP CONSTRAINT "OfficialCertification_editionId_fkey";

-- DropForeignKey
ALTER TABLE "OfficialCertification" DROP CONSTRAINT "OfficialCertification_personId_fkey";

-- DropForeignKey
ALTER TABLE "Person" DROP CONSTRAINT "Person_userId_fkey";

-- DropForeignKey
ALTER TABLE "Round" DROP CONSTRAINT "Round_editionId_fkey";

-- DropForeignKey
ALTER TABLE "TeamAchievement" DROP CONSTRAINT "TeamAchievement_editionId_fkey";

-- DropForeignKey
ALTER TABLE "TeamAchievement" DROP CONSTRAINT "TeamAchievement_teamId_fkey";

-- DropForeignKey
ALTER TABLE "TeamConvocation" DROP CONSTRAINT "TeamConvocation_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "TeamConvocation" DROP CONSTRAINT "TeamConvocation_teamId_fkey";

-- DropForeignKey
ALTER TABLE "TeamConvocationMember" DROP CONSTRAINT "TeamConvocationMember_convocationId_fkey";

-- DropForeignKey
ALTER TABLE "TeamConvocationMember" DROP CONSTRAINT "TeamConvocationMember_personId_fkey";

-- DropForeignKey
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_personId_fkey";

-- DropForeignKey
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_teamId_fkey";

-- AlterTable
ALTER TABLE "Competition" DROP CONSTRAINT "Competition_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "sportId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Competition_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Competition_id_seq";

-- AlterTable
ALTER TABLE "CompetitionMember" DROP CONSTRAINT "CompetitionMember_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "competitionId" SET DATA TYPE TEXT,
ALTER COLUMN "personId" SET DATA TYPE TEXT,
ADD CONSTRAINT "CompetitionMember_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "CompetitionMember_id_seq";

-- AlterTable
ALTER TABLE "Edition" DROP CONSTRAINT "Edition_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "competitionId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Edition_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Edition_id_seq";

-- AlterTable
ALTER TABLE "EditionMember" DROP CONSTRAINT "EditionMember_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "editionId" SET DATA TYPE TEXT,
ALTER COLUMN "personId" SET DATA TYPE TEXT,
ADD CONSTRAINT "EditionMember_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "EditionMember_id_seq";

-- AlterTable
ALTER TABLE "EditionTeam" DROP CONSTRAINT "EditionTeam_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "editionId" SET DATA TYPE TEXT,
ALTER COLUMN "teamId" SET DATA TYPE TEXT,
ALTER COLUMN "enrolledBy" SET DATA TYPE TEXT,
ADD CONSTRAINT "EditionTeam_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "EditionTeam_id_seq";

-- AlterTable
ALTER TABLE "EditionTeamPlayer" DROP CONSTRAINT "EditionTeamPlayer_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "editionTeamId" SET DATA TYPE TEXT,
ALTER COLUMN "personId" SET DATA TYPE TEXT,
ADD CONSTRAINT "EditionTeamPlayer_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "EditionTeamPlayer_id_seq";

-- AlterTable
ALTER TABLE "EditionTeamStaff" DROP CONSTRAINT "EditionTeamStaff_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "editionTeamId" SET DATA TYPE TEXT,
ALTER COLUMN "personId" SET DATA TYPE TEXT,
ADD CONSTRAINT "EditionTeamStaff_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "EditionTeamStaff_id_seq";

-- AlterTable
ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "personId" SET DATA TYPE TEXT,
ALTER COLUMN "competitionId" SET DATA TYPE TEXT,
ALTER COLUMN "editionId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Invitation_id_seq";

-- AlterTable
ALTER TABLE "Match" DROP CONSTRAINT "Match_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "editionId" SET DATA TYPE TEXT,
ALTER COLUMN "roundId" SET DATA TYPE TEXT,
ALTER COLUMN "homeEditionTeamId" SET DATA TYPE TEXT,
ALTER COLUMN "awayEditionTeamId" SET DATA TYPE TEXT,
ALTER COLUMN "parentHomeMatchId" SET DATA TYPE TEXT,
ALTER COLUMN "parentAwayMatchId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Match_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Match_id_seq";

-- AlterTable
ALTER TABLE "MatchEvent" DROP CONSTRAINT "MatchEvent_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "matchId" SET DATA TYPE TEXT,
ALTER COLUMN "personId" SET DATA TYPE TEXT,
ALTER COLUMN "editionTeamId" SET DATA TYPE TEXT,
ALTER COLUMN "createdBy" SET DATA TYPE TEXT,
ADD CONSTRAINT "MatchEvent_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "MatchEvent_id_seq";

-- AlterTable
ALTER TABLE "MatchReferee" DROP CONSTRAINT "MatchReferee_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "matchId" SET DATA TYPE TEXT,
ALTER COLUMN "personId" SET DATA TYPE TEXT,
ADD CONSTRAINT "MatchReferee_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "MatchReferee_id_seq";

-- AlterTable
ALTER TABLE "OfficialCertification" DROP CONSTRAINT "OfficialCertification_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "editionId" SET DATA TYPE TEXT,
ALTER COLUMN "personId" SET DATA TYPE TEXT,
ADD CONSTRAINT "OfficialCertification_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "OfficialCertification_id_seq";

-- AlterTable
ALTER TABLE "Person" DROP CONSTRAINT "Person_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Person_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Person_id_seq";

-- AlterTable
ALTER TABLE "Round" DROP CONSTRAINT "Round_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "editionId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Round_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Round_id_seq";

-- AlterTable
ALTER TABLE "Sport" DROP CONSTRAINT "Sport_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Sport_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Sport_id_seq";

-- AlterTable
ALTER TABLE "Team" DROP CONSTRAINT "Team_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "enrollConvocationId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Team_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Team_id_seq";

-- AlterTable
ALTER TABLE "TeamAchievement" DROP CONSTRAINT "TeamAchievement_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "teamId" SET DATA TYPE TEXT,
ALTER COLUMN "editionId" SET DATA TYPE TEXT,
ADD CONSTRAINT "TeamAchievement_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "TeamAchievement_id_seq";

-- AlterTable
ALTER TABLE "TeamConvocation" DROP CONSTRAINT "TeamConvocation_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "teamId" SET DATA TYPE TEXT,
ALTER COLUMN "createdBy" SET DATA TYPE TEXT,
ADD CONSTRAINT "TeamConvocation_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "TeamConvocation_id_seq";

-- AlterTable
ALTER TABLE "TeamConvocationMember" DROP CONSTRAINT "TeamConvocationMember_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "convocationId" SET DATA TYPE TEXT,
ALTER COLUMN "personId" SET DATA TYPE TEXT,
ADD CONSTRAINT "TeamConvocationMember_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "TeamConvocationMember_id_seq";

-- AlterTable
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "teamId" SET DATA TYPE TEXT,
ALTER COLUMN "personId" SET DATA TYPE TEXT,
ADD CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "TeamMember_id_seq";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hashRefresh" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Session_userId_hashRefresh_idx" ON "Session"("userId", "hashRefresh");

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionMember" ADD CONSTRAINT "CompetitionMember_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionMember" ADD CONSTRAINT "CompetitionMember_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Edition" ADD CONSTRAINT "Edition_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditionMember" ADD CONSTRAINT "EditionMember_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditionMember" ADD CONSTRAINT "EditionMember_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamAchievement" ADD CONSTRAINT "TeamAchievement_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamAchievement" ADD CONSTRAINT "TeamAchievement_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamConvocation" ADD CONSTRAINT "TeamConvocation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamConvocation" ADD CONSTRAINT "TeamConvocation_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamConvocationMember" ADD CONSTRAINT "TeamConvocationMember_convocationId_fkey" FOREIGN KEY ("convocationId") REFERENCES "TeamConvocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamConvocationMember" ADD CONSTRAINT "TeamConvocationMember_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditionTeam" ADD CONSTRAINT "EditionTeam_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditionTeam" ADD CONSTRAINT "EditionTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditionTeam" ADD CONSTRAINT "EditionTeam_enrolledBy_fkey" FOREIGN KEY ("enrolledBy") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditionTeamPlayer" ADD CONSTRAINT "EditionTeamPlayer_editionTeamId_fkey" FOREIGN KEY ("editionTeamId") REFERENCES "EditionTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditionTeamPlayer" ADD CONSTRAINT "EditionTeamPlayer_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditionTeamStaff" ADD CONSTRAINT "EditionTeamStaff_editionTeamId_fkey" FOREIGN KEY ("editionTeamId") REFERENCES "EditionTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditionTeamStaff" ADD CONSTRAINT "EditionTeamStaff_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeEditionTeamId_fkey" FOREIGN KEY ("homeEditionTeamId") REFERENCES "EditionTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayEditionTeamId_fkey" FOREIGN KEY ("awayEditionTeamId") REFERENCES "EditionTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_parentHomeMatchId_fkey" FOREIGN KEY ("parentHomeMatchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_parentAwayMatchId_fkey" FOREIGN KEY ("parentAwayMatchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchReferee" ADD CONSTRAINT "MatchReferee_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchReferee" ADD CONSTRAINT "MatchReferee_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_editionTeamId_fkey" FOREIGN KEY ("editionTeamId") REFERENCES "EditionTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficialCertification" ADD CONSTRAINT "OfficialCertification_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficialCertification" ADD CONSTRAINT "OfficialCertification_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
