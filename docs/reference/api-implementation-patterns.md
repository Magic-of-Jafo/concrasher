# API Implementation Patterns & Recommendations

This document outlines observed patterns and provides recommendations for implementing API routes within this project, particularly focusing on backend logic such as database interaction, validation, and authorization. This was compiled during the development of Story 2.9 (Venue/Hotel Tab).

## 1. Prisma Client Usage

- **Standard:** Always use the shared/singleton Prisma client instance.
- **Implementation:** Import it via `import prisma from '@/lib/prisma';`.
- **Rationale:** Ensures connection pooling, efficiency, and consistency. Avoid instantiating `new PrismaClient()` directly in route files.

## 2. Request Validation

- **Standard:** Use Zod for request body validation.
- **Implementation:** Define Zod schemas (e.g., in `src/lib/validators.ts`) and use `schema.safeParse(body)` in the API route to validate incoming data.
- **Rationale:** Provides robust type checking and clear error reporting for invalid payloads.

## 3. Authorization

### 3.1. Observed Pattern (in Pricing API Routes - `tiers`, `discounts`)

- During the review of `src/app/api/conventions/[id]/pricing/tiers/route.ts` (PUT) and `src/app/api/conventions/[id]/pricing/discounts/[discountId]/route.ts` (DELETE), explicit user-based authorization (e.g., checking user session, roles, or direct ownership like `organizerUserId`) was **not found** directly within these specific route handlers.
- **Implicit Check:** These routes primarily rely on ensuring the resource being acted upon (PriceTier, PriceDiscount) is correctly associated with the `conventionId` passed in the URL path. For example, a delete operation might only succeed if a discount with `discountId` also has the matching `conventionId`.
- **Potential Gap:** This pattern might assume authorization is handled at a higher level (e.g., global middleware not reviewed) or relies on UI controls to prevent unauthorized access. For critical operations, this might not be sufficiently secure without direct user session validation in the handler.

### 3.2. Recommended Authorization Pattern (for New Routes - e.g., Venue/Hotel APIs)

- **Standard:** For new API routes, especially those involving CUD (Create, Update, Delete) operations, implement robust, explicit user-based authorization within each route handler.
- **Implementation Steps (assuming NextAuth.js):**
    1.  **Fetch User Session:** Use a server-side session retrieval method. Example placeholder:
        ```typescript
        // import { getServerSession } from 'next-auth/next';
        // import { authOptions } from '@/app/api/auth/[...nextauth]/route'; // Or equivalent path
        // const session = await getServerSession(authOptions);
        ```
    2.  **Basic Authentication Check:** Ensure a session exists and a user is authenticated.
        ```typescript
        // if (!session || !session.user) {
        //   return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        // }
        ```
    3.  **Role Check:** Verify the user has the required role(s) (e.g., 'ORGANIZER').
        ```typescript
        // if (!session.user.roles || !session.user.roles.includes('ORGANIZER')) {
        //   return NextResponse.json({ message: 'Forbidden: Insufficient privileges' }, { status: 403 });
        // }
        ```
    4.  **Ownership/Resource-Specific Check:** Verify the authenticated user is authorized to perform the action on the specific resource. For convention-related resources, this typically involves checking if the user's ID matches the `organizerUserId` of the associated `ConventionSeries`.
        ```typescript
        // const conventionId = params.id; // From route parameters
        // const convention = await prisma.convention.findUnique({
        //   where: { id: conventionId },
        //   include: { series: true }, // To access series.organizerUserId
        // });
        // 
        // if (!convention) {
        //   return NextResponse.json({ message: 'Resource not found' }, { status: 404 });
        // }
        // 
        // // Assuming session.user.id holds the authenticated user's ID
        // if (convention.series.organizerUserId !== session.user.id) {
        //   return NextResponse.json({ message: 'Forbidden: You are not the organizer for this resource' }, { status: 403 });
        // }
        ```
- **Rationale:** Ensures that API endpoints are secure independently of UI controls and that users can only affect data they are permitted to access/modify. This aligns with general security best practices and specific story requirements for authorization testing.

### 3.3. Open Question for Authorization Implementation

- **Crucial Detail Needed:** To implement the recommended authorization, the precise method for fetching user session information (e.g., the correct `authOptions` for `getServerSession` if using NextAuth, or an alternative session utility if a different system is in place) must be identified from the project's existing authentication setup. This is typically found in a central authentication configuration file (e.g., `src/app/api/auth/[...nextauth]/route.ts` or similar).

## 4. Error Handling

- **Standard:** Implement try-catch blocks for database operations and other fallible actions.
- **Implementation:** Catch errors from Prisma (e.g., `Prisma.PrismaClientKnownRequestError`), Zod validation errors, and general errors. Return appropriate HTTP status codes and error messages (e.g., 400 for validation, 401 for unauthenticated, 403 for forbidden, 404 for not found, 500 for server errors).

## 5. Frontend Form Management for Complex Tabs (Observed)

- **Observation (from `PricingTab.tsx` - Story 2.8):** For complex editor tabs with dynamic fields, conditional logic, and direct API interactions for sub-entities (e.g., saving price tiers before configuring discounts), the `PricingTab.tsx` component does **not** use `react-hook-form`.
- **Pattern:**
    - State is managed locally within the tab component using React hooks (`useState`, `useEffect`).
    - Data changes are propagated upwards to a parent component via an `onChange` prop, typically passing the entire data structure for that tab (e.g., `(data: PricingTabData) => void`).
    - Validation may be handled by a dedicated function within the tab that parses the local state against a Zod schema (e.g., `PricingTabSchema.parse(localState)`).
    - API calls for CRUD operations on sub-entities related to the tab might be handled directly within the tab component itself, triggered by specific actions (e.g., "Save Tiers" button).
- **Rationale (Inferred):** This approach offers more direct control over complex state interactions and avoids potential TypeScript complexities that can arise with `react-hook-form` and `zodResolver` in deeply nested or highly dynamic forms. It can also simplify the integration of direct API calls for parts of the tab's data before the entire parent form is submitted.
- **Recommendation for `VenueHotelTab.tsx` (Story 2.9):** Adopt this pattern of local state management and an `onChange` prop, rather than `react-hook-form`, to align with existing complex tab implementations and mitigate TypeScript/resolver issues previously encountered.

By following these patterns and recommendations, future API development should be more consistent, maintainable, and secure. 