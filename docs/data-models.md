# ConventionCrasher Data Models

This document outlines the core data entities and their schemas for the ConventionCrasher platform. The primary definitions here are Prisma models, which dictate the database schema and provide TypeScript types for application use.

*(Current Date: 2025-05-09)*

## 1. Core Application Entities / Database Schemas (Prisma Models)

The following represents the consolidated Prisma schema for the ConventionCrasher MVP.

```prisma
// In prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// --- System-Level Enums ---
enum Role { // System-level roles for users
  USER      // Basic user/hobbyist
  ORGANIZER // Can create and manage conventions/series (Requires Admin approval)
  TALENT    // Can have a talent profile (Self-activated)
  ADMIN     // Platform administrator
}

enum RequestedRole { // For role applications
  ORGANIZER // Talent is self-activated, so only Organizer is listed here
}

enum ApplicationStatus { // Status of a role application
  PENDING
  APPROVED
  REJECTED
}

// --- Context-Specific User Role Enums ---
enum BrandUserRole {
  PRIMARY_OWNER // Can delete brand, manage other BrandUsers for this brand
  MANAGER       // Can edit brand profile, link to conventions, common tasks
}

enum ConventionSeriesUserRole {
  PRIMARY_OWNER // Can delete series, manage other ConventionSeriesUsers for this series
  MANAGER       // Can edit series details, create/manage conventions within this series
}

enum ProposedConventionStatus {
  PROPOSED          // Newly submitted idea
  GATHERING_INTEREST // Actively seeking community feedback
  ARCHIVED          // No longer active
}


// --- User & Authentication Models (Primarily from Epic 1) ---
model User {
  id                   String    @id @default(cuid())
  name                 String?
  email                String?   @unique
  emailVerified        DateTime?
  image                String?   // Profile picture URL
  hashedPassword       String?   // For credentials-based login
  roles                Role[]    @default([USER]) // Array of system-level roles

  // Auth.js relations
  accounts             Account[]
  sessions             Session[]

  // User's applications for specific system roles
  roleApplications     RoleApplication[]

  // Direct management/ownership links
  brandMemberships         BrandUser[]             // Brands this user owns/manages
  conventionSeriesMemberships ConventionSeriesUser[]  // Convention Series this user owns/manages

  // Content created/participated in by the user
  organizedConventions Convention[]                @relation("OrganizedBy")         // Conventions this user is the direct organizer for
  proposedConventions  ProposedConvention[]        @relation("ProposedBy")          // Event ideas proposed by this user
  talentProfile        TalentProfile?                                              // Talent profile if this user is Talent
  interests            UserInterest[]                                              // Interest expressed by this user in proposed conventions
  forumThreads         ForumThread[]                                               // Forum threads started by this user
  forumPosts           ForumPost[]                                                 // Forum posts made by this user
  proposedConventionComments ProposedConventionComment[]                           // Comments on proposed conventions by this user

  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}

model Account { // Auth.js model
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session { // Auth.js model
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken { // Auth.js model
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model RoleApplication { // For ORGANIZER role applications
  id            String            @id @default(cuid())
  userId        String
  requestedRole RequestedRole     // Will primarily be ORGANIZER
  status        ApplicationStatus @default(PENDING)
  // message     String?

  user          User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  @@unique([userId, requestedRole])
}


// --- Brand Profile & Management (Related to Epic 4) ---
model BrandProfile {
  id            String    @id @default(cuid())
  brandName     String    @unique
  description   String?   @db.Text
  logoUrl       String?
  websiteUrl    String?
  category      String?   // E.g., Magic Shop, Manufacturer

  members       BrandUser[]
  associatedConventions ConventionBrand[] // M2M with Convention
  conventionSeries      ConventionSeries[] @relation("RunByBrand")

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model BrandUser {
  id             String        @id @default(cuid())
  userId         String
  brandProfileId String
  role           BrandUserRole

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  brandProfile BrandProfile @relation(fields: [brandProfileId], references: [id], onDelete: Cascade)

  assignedAt   DateTime     @default(now())

  @@unique([userId, brandProfileId])
}


// --- Convention Series & Management ---
model ConventionSeries {
  id            String    @id @default(cuid())
  name          String
  slug          String    @unique
  description   String?   @db.Text

  brandProfileId String?
  brandProfile   BrandProfile? @relation("RunByBrand", fields: [brandProfileId], references: [id], onDelete:SetNull)

  members       ConventionSeriesUser[]
  conventions   Convention[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model ConventionSeriesUser {
  id                 String                   @id @default(cuid())
  userId             String
  conventionSeriesId String
  role               ConventionSeriesUserRole

  user             User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  conventionSeries ConventionSeries @relation(fields: [conventionSeriesId], references: [id], onDelete: Cascade)

  assignedAt       DateTime         @default(now())

  @@unique([userId, conventionSeriesId])
}


// --- Convention & Related Models (Epics 2, 3, 4) ---
model Convention {
  id            String    @id @default(cuid())
  name          String
  startDate     DateTime
  endDate       DateTime
  city          String
  state         String
  country       String
  venueName     String?
  description   String?   @db.Text
  websiteUrl    String?
  // status String? // Consider an enum

  organizerUserId String
  organizer     User      @relation("OrganizedBy", fields: [organizerUserId], references: [id])

  conventionSeriesId String?
  conventionSeries   ConventionSeries? @relation(fields: [conventionSeriesId], references: [id], onDelete:SetNull)

  scheduleItems ConventionScheduleItem[]
  talent        ConventionTalent[]
  brands        ConventionBrand[]
  // comments (Removed for MVP)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ConventionScheduleItem {
  id            String    @id @default(cuid())
  conventionId  String
  title         String
  startTime     DateTime
  endTime       DateTime?
  locationName  String?
  description   String?   @db.Text
  order         Int

  convention    Convention @relation(fields: [conventionId], references: [id], onDelete: Cascade)
  // talentProfileId String?
  // talentProfile   TalentProfile? @relation(fields: [talentProfileId], references: [id], onDelete:SetNull)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([conventionId, order])
}

model TalentProfile {
  id                String    @id @default(cuid())
  userId            String    @unique
  user              User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  displayName       String
  tagline           String?
  bio               String?   @db.Text
  profilePictureUrl String?
  websiteUrl        String?
  contactEmail      String?
  skills            String[]

  conventionAppearances ConventionTalent[]

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

model ConventionTalent { // M2M Convention <-> TalentProfile
  id              String    @id @default(cuid())
  conventionId    String
  talentProfileId String
  // roleAtConvention String?

  convention    Convention    @relation(fields: [conventionId], references: [id], onDelete: Cascade)
  talentProfile TalentProfile @relation(fields: [talentProfileId], references: [id], onDelete: Cascade)

  createdAt     DateTime      @default(now())

  @@unique([conventionId, talentProfileId])
}

model ConventionBrand { // M2M Convention <-> BrandProfile
  id              String    @id @default(cuid())
  conventionId    String
  brandProfileId  String
  // roleAtConvention String?

  convention   Convention   @relation(fields: [conventionId], references: [id], onDelete: Cascade)
  brandProfile BrandProfile @relation(fields: [brandProfileId], references: [id], onDelete: Cascade)

  createdAt    DateTime     @default(now())

  @@unique([conventionId, brandProfileId])
}


// --- Proposed Convention & User Interaction Models (Epic 3) ---
model ProposedConvention {
  id                  String    @id @default(cuid())
  title               String
  slug                String    @unique
  conceptDescription  String    @db.Text
  estimatedDates      String?
  estimatedLocation   String?
  status              ProposedConventionStatus @default(PROPOSED)

  organizerUserId     String
  organizer           User      @relation("ProposedBy", fields: [organizerUserId], references: [id])

  interestedUsers     UserInterest[]
  comments            ProposedConventionComment[]

  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
}

model UserInterest {
  id                   String   @id @default(cuid())
  userId               String
  proposedConventionId String

  user                 User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  proposedConvention   ProposedConvention  @relation(fields: [proposedConventionId], references: [id], onDelete: Cascade)

  expressedAt          DateTime            @default(now())

  @@unique([userId, proposedConventionId])
}

model ProposedConventionComment {
  id                   String   @id @default(cuid())
  userId               String
  proposedConventionId String
  commentText          String   @db.Text

  user                 User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  proposedConvention   ProposedConvention  @relation(fields: [proposedConventionId], references: [id], onDelete: Cascade)

  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @updatedAt
}


// --- Community Features: Basic Forum (Epic 5) ---
model ForumCategory {
  id          String    @id @default(cuid())
  title       String    @unique
  description String?
  slug        String    @unique

  threads     ForumThread[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model ForumThread {
  id          String    @id @default(cuid())
  title       String
  slug        String    @unique

  categoryId  String
  category    ForumCategory @relation(fields: [categoryId], references: [id], onDelete:Cascade)

  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete:Cascade)

  isPinned    Boolean   @default(false)
  isLocked    Boolean   @default(false)
  viewCount   Int       @default(0)

  posts       ForumPost[]
  lastActivityAt DateTime @updatedAt // Using @updatedAt for simplicity; will update on new post or thread edit

  createdAt   DateTime  @default(now())
  // updatedAt is handled by lastActivityAt for thread activity
}

model ForumPost {
  id          String    @id @default(cuid())
  threadId    String
  userId      String
  contentText String    @db.Text

  thread      ForumThread @relation(fields: [threadId], references: [id], onDelete:Cascade)
  user        User        @relation(fields: [userId], references: [id], onDelete:Cascade)

  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}
```

## Explanations of Models

* **Enums (`Role`, `RequestedRole`, `ApplicationStatus`, `BrandUserRole`, `ConventionSeriesUserRole`, `ProposedConventionStatus`):**
    Define fixed sets of values for specific fields, ensuring data consistency. `Role` defines system-level user capabilities. `RequestedRole` is for formal applications (now primarily `ORGANIZER`). `BrandUserRole` and `ConventionSeriesUserRole` define management permissions within Brands and Convention Series, respectively. `ProposedConventionStatus` tracks the lifecycle of an event idea.

* **User & Authentication Models:**
    * **`User`:** Central model for individuals. Stores profile info, system roles, Auth.js links, and relations to all content they create, manage, or interact with.
    * **`Account`, `Session`, `VerificationToken`:** Standard Auth.js Prisma adapter models.
    * **`RoleApplication`:** Tracks `ORGANIZER` role applications requiring Admin approval. Talent role is now self-activated.

* **Brand Profile & Management:**
    * **`BrandProfile`:** Represents a brand entity.
    * **`BrandUser`:** Join table linking `User` to `BrandProfile` with a `BrandUserRole` (PRIMARY_OWNER, MANAGER).

* **Convention Series & Management:**
    * **`ConventionSeries`:** Groups individual convention events (e.g., "Magi-Fest"). Can be linked to a `BrandProfile`.
    * **`ConventionSeriesUser`:** Join table linking `User` to `ConventionSeries` with a `ConventionSeriesUserRole`.

* **Convention & Related Models:**
    * **`Convention`:** A specific event instance. Links to an `organizer` (User), an optional `ConventionSeries`, and related entities like schedule, talent, and brands.
    * **`ConventionScheduleItem`:** An item in a convention's schedule.
    * **`TalentProfile`:** Detailed profile for users with the `TALENT` role. Linked 1:1 to a `User`.
    * **`ConventionTalent`:** Join table for the many-to-many relationship between `Convention` and `TalentProfile`.
    * **`ConventionBrand`:** Join table for the many-to-many relationship between `Convention` and `BrandProfile` (e.g., sponsors, vendors).

* **Proposed Convention & User Interaction Models:**
    * **`ProposedConvention`:** For Organizers to pitch event ideas and gather feedback.
    * **`UserInterest`:** Tracks users who express non-binding interest in a `ProposedConvention`.
    * **`ProposedConventionComment`:** Allows users to comment on `ProposedConvention` ideas.

* **Community Features: Basic Forum:**
    * **`ForumCategory`:** Organizes forum discussions (e.g., "Ride Sharing," "Roommate Search").
    * **`ForumThread`:** A single discussion topic within a category, started by a user.
    * **`ForumPost`:** An individual message within a `ForumThread`, posted by a user.

* **Deferred Features (Not in MVP Schema):**
    * **Convention Comments/Reviews:** Direct commenting on `Convention` listings (originally part of Epic 5) has been deferred from MVP. If implemented later, it would likely involve a `ConventionComment` model and relations to `User` and `Convention`.

## Change Log

| Change        | Date       | Version | Description                                                                                                                                                    | Author          |
|---------------|------------|---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------|
| Initial draft | 2025-05-09 | 0.1     | First draft of User, Auth, Brand, Convention Series, Convention, ScheduleItem models.                                                                          | Architect Agent |
| Revision      | 2025-05-09 | 0.2     | Added ProposedConvention, UserInterest, ProposedConventionComment, TalentProfile, ConventionTalent, ConventionBrand, ForumCategory, ForumThread, ForumPost models. Adjusted Talent role activation (self-serve) and removed ConventionComment model from MVP. | Architect Agent |

---