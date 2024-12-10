# Project Development Log

This file tracks significant changes, decisions, and rationale for the project.

## Initial Setup
- Created this FYI.md file to track project changes and decisions
- Purpose: Maintain clear documentation of project evolution and architectural decisions

## Project Structure
The project follows a modular architecture with:
- Controllers: Handle HTTP requests and responses
- Services: Contain business logic
- Routes: Define API endpoints
- Middleware: Handle cross-cutting concerns
- Types: Define TypeScript interfaces and types
- Utils: Contain shared utilities

## File Organization
- Each module is separated into its own file for better maintainability
- Related functionality is grouped together
- Clear separation of concerns between layers
- Consistent naming conventions throughout the project

## Changes
### Question Routes Integration
- Added question routes to the main Express application
- Connected `/api/questions` endpoints to handle question-related operations

### Question Filter and Random Routes Fix
- Fixed routing for `/questions/filter` and `/questions/random` endpoints
- Added proper route handlers with authentication middleware
- Ensured routes are defined before specific ID routes to prevent conflicts
- Added Swagger documentation for both endpoints

### Question Routes Cleanup
- Removed duplicate route definitions
- Fixed route ordering to prevent conflicts
- Updated difficulty level validation to use correct range (0-5)
- Modified Swagger documentation to reflect new difficulty range
- Updated validation schema for question creation and updates

### Test Plan API Updates
- Updated Test Plan routes to follow RESTful conventions:
  - Added PATCH and DELETE endpoints for test plans
  - Modified test plan schema to support flexible question counts
  - Added plannedBy and plannedAt fields to test plan responses
  - Enhanced validation for test plan updates
  - Improved error handling and access control for test plan operations
  - Updated types to reflect new API requirements
#### Test Plan Validation Schema Update (2024-12-09)
- Enhanced test plan validation schema to handle more flexible input types
- Added support for `null` and optional `templateId`
- Allowed `studentId` and `plannedBy` to accept both string and number inputs
- Automatically transforms numeric inputs to strings for consistency
- Improves API robustness by handling different input formats
#### Test Plan BigInt Conversion Update (2024-12-09)
- Enhanced BigInt conversion in test plan service to handle multiple input types
- Added type checking and conversion for `studentId` and `plannedBy`
- Supports inputs as strings, numbers, and existing BigInt
- Prevents serialization errors by safely converting inputs
- Improves robustness of data type handling in test plan creation and update

### Test Execution API Updates
- Redesigned test execution endpoints to align with new requirements:
  - Added new execution creation endpoint under test plans
  - Updated execution response format with structured question and timing data
  - Added pause/resume functionality for test executions
  - Enhanced test completion with detailed performance metrics
  - Simplified answer submission process
  - Added proper validation for all execution operations
  - Improved error handling and access control

### Prisma Query Correction for Test Execution Creation (2024-12-10)

### Problem Identified
- Incorrect query parameter in `execution.service.ts`
- Used `plan_id` instead of `test_plan_id` in Prisma findUnique query
- Caused `PrismaClientValidationError` during test execution creation

### Solution
- Updated Prisma query to use `test_plan_id`
- Corrected the query to match the Prisma schema exactly
- Ensures proper database lookup for test plans

### Impact
- Resolves validation error in test execution creation
- Improves query accuracy and reliability
- Prevents potential data retrieval issues

### Verification Steps
1. Test test execution creation endpoint
2. Confirm no validation errors
3. Verify correct test plan retrieval

### Routing Investigation for Test Execution Creation (2024-12-10)

### Routing Configuration
- Attempted Route: `/tests/plans/11/executions`
- Updated Route Registration: `/api/tests` now handles execution routes
- Matches frontend API call: `http://localhost:3000/api/tests/plans/11/executions`

### Changes Made
- Modified server route registration in `server.ts`
- Replaced `/api/tests/executions` with `/api/tests`
- Ensures correct routing for test execution creation endpoint

### Verification Steps
1. Confirm route matches frontend expectations
2. Test test execution creation with new route configuration
3. Verify no side effects on other routes

### Routing Discrepancy
- Attempted Route: `/tests/plans/5/executions`
- Registered Routes:
  1. `/api/tests` (test.routes.ts)
  2. `/api/tests/executions` (execution.routes.ts) - Updated route
  3. `/api/tests/plans` (testPlan.routes.ts)

### Potential Issues
- Initial route mismatch between frontend expectations and backend configuration
- Route registration updated to align with expected endpoint

### Recommended Immediate Actions
- Verify the exact route being called from the frontend
- Confirm that `/api/tests/executions` matches the expected route
- Ensure route handlers are correctly mapped in `server.ts`

### Debugging Steps
1. Confirm frontend API call endpoint
2. Verify server route registration
3. Test test execution creation with new route configuration

### Authentication and Role Checking Investigation (2024-12-09)

#### Problem Description
- Encountered 403 Forbidden errors when attempting to access `/api/tests/plans` endpoint
- Inconsistent behavior with role-based access control

#### Initial Observations
- Token decoding reveals user roles are present in the token
- Prisma query in authentication middleware was causing validation errors
- Mismatch between token payload and database query structure

#### Specific Issues
1. Token uses `userId`, but middleware was looking for `user_id`
2. Prisma `findUnique()` method was failing due to undefined user identifier
3. Role checking middleware was not correctly processing user roles

#### Recommended Next Steps
- Verify token generation process
- Review user role assignment in database
- Add more granular logging to diagnose authentication flow
- Ensure consistent naming conventions between token and database schemas

#### Potential Improvements
- Implement more robust error handling in authentication middleware
- Add comprehensive logging without breaking existing functionality
- Create a standardized approach to user authentication and role checking

#### Role Checking Case Sensitivity Fix (2024-12-09)
- Identified case sensitivity issue in role comparison
- Modified role checking middleware to perform case-insensitive role matching
- Updated role comparison to convert both user roles and allowed roles to uppercase
- Ensures consistent role checking regardless of role string casing
- Maintains existing role checking logic while improving flexibility

#### Global BigInt Serialization Support (2024-12-09)
- Added global prototype method to handle BigInt serialization
- Enhanced error handler to specifically catch and handle BigInt serialization errors
- Provides more informative error messages for serialization issues
- Improves overall error handling and debugging capabilities
- Ensures consistent JSON serialization across the application

### Prisma Column Name Correction (2024-12-10)

### Problem Identified
- Mismatch between Prisma schema column names and code
- Using incorrect column names in select and mapping operations
- Caused `PrismaClientValidationError`

### Corrections Made
- Updated column names to match Prisma schema
- Changed `id` to `user_id`
- Updated `firstName` and `lastName` to `first_name` and `last_name`
- Adjusted mapping logic to use correct column names

### Impacted Areas
- Test plan user relations
- User selection in queries
- Logging and debugging statements

### Key Changes
- Prisma select statements now use schema-correct column names
- User ID retrieval uses `user_id` instead of `id`
- Name formatting uses `first_name` and `last_name`

### Benefits
- Resolves Prisma validation errors
- Ensures consistent data retrieval
- Improves type safety and code reliability

### Recommendations
- Regularly validate Prisma schema against code
- Use Prisma schema as the source of truth for column names
- Implement type-safe mapping in database queries

### Prisma Relation Handling in Test Execution (2024-12-10)

### Problem Identified
- Unexpected data structure in Prisma relations
- `users_test_plans_student_idTousers` not consistently an array
- Caused `TypeError` during test execution creation and access checks

### Solution
- Added array type checking before mapping
- Implemented fallback to empty array if relation is not an array
- Enhanced robustness of user access verification
- Prevents runtime errors with undefined or non-array relations

### Code Changes
- Added `Array.isArray()` checks for student and planned-by user relations
- Created safe mapping with default empty array
- Updated both `createExecution` and `findExecutionWithAccess` methods

### Impact
- Improves error handling in test execution workflow
- Prevents unexpected runtime errors
- Provides more flexible handling of Prisma relations

### Verification Steps
1. Test test execution creation
2. Verify user access checks work correctly
3. Check error handling with different relation scenarios

### Debugging Test Execution Authorization (2024-12-10)

### Debugging Strategy
- Added console logging for test plan details
- Captured full test plan structure
- Logged user ID and associated student/planned-by IDs
- Helps diagnose authorization check failures

### Potential Investigation Points
- Verify correct user ID is being passed
- Check test plan relations in database
- Confirm expected user associations exist
- Investigate potential data inconsistencies

### Recommended Troubleshooting
1. Check server logs for detailed test plan and user ID information
2. Verify database relations for the specific test plan
3. Validate user roles and associations
4. Ensure correct user ID is being used in the request

### Next Steps
- Review logged information
- Identify why user is not authorized
- Adjust authorization logic if needed

### Test Execution Authorization Investigation (2024-12-10)

### Authorization Mechanism
- Test execution creation requires user to be:
  1. A student assigned to the test plan, OR
  2. The user who planned the test

### Key Findings
- No explicit role-based check in execution routes
- Authorization logic embedded in `createExecution` method
- Checks user against `users_test_plans_student_idTousers` and `users_test_plans_planned_byTousers`

### Potential Issues
- Strict user-to-test-plan association check
- Possible data inconsistency in test plan relations
- Need to verify user's relationship to the specific test plan

### Debugging Recommendations
1. Log full test plan and user details
2. Verify user ID matches expected associations
3. Check database relations for test plans
4. Validate user roles and test plan configurations

### Next Investigation Steps
- Confirm user roles
- Validate user-test plan associations
- Review test plan creation and assignment process

### Enhanced Test Execution Authorization Debugging (2024-12-10)

### Debugging Strategy Enhanced
- Added comprehensive logging for test plan details
- Captured:
  - Full student and planner information
  - Test plan template details
  - User ID and role verification
  - Detailed access check results

### Logging Details
- Retrieve full user details for students and planners
- Log user IDs, emails, and names
- Capture template information
- Explicitly log access check results

### Potential Debugging Scenarios
1. User ID type mismatch (string vs bigint)
2. Incorrect user-test plan association
3. Data inconsistency in test plan relations
4. Unexpected type conversion issues

### Recommended Investigation
1. Review server logs for detailed test plan information
2. Verify user ID type and value
3. Check database relations and user assignments
4. Validate test plan creation process

### Next Steps
- Analyze logged information
- Confirm user-test plan relationship
- Adjust authorization logic if needed

### User ID Type Conversion Hotfix (2024-12-10)

### Problem Identified
- User ID passed as string from authentication middleware
- Execution service expects `bigint` type
- Caused potential type conversion errors

### Solution Implemented
- Added `BigInt()` conversion for user ID
- Fallback to '0' if no user ID provided
- Ensures consistent type handling across execution methods

### Code Changes
- Updated all execution controller methods
- Converted `req.user?.id` to `BigInt(req.user?.id || '0')`
- Prevents potential runtime type errors

### Impact
- Resolves type inconsistency in user ID handling
- Improves robustness of user authentication
- Ensures smooth type conversion for database operations

### Recommendations
- Review authentication middleware
- Consider standardizing user ID type across application
- Add type validation for user ID conversion

### Prisma Relation Correction for Test Plans (2024-12-10)

### Problem Identified
- Incorrect relation name in Prisma query
- Using `template` instead of `test_templates`
- Caused `PrismaClientValidationError`

### Solution Implemented
- Updated include relations to match Prisma schema
- Replaced `template` with `test_templates`
- Added `exam_boards` relation
- Ensured consistent naming with database schema

### Key Changes
- Corrected include statement in test plan query
- Updated logging to use correct relation names
- Maintained type safety and schema consistency

### Impact
- Resolves Prisma validation errors
- Improves data retrieval accuracy
- Ensures alignment with database schema

### Recommendations
- Always cross-reference Prisma schema when defining relations
- Use schema-generated types for type safety
- Regularly validate database queries against schema

### Debugging Insights
- Detailed logging of test plan relations
- Captures template and exam board details
- Provides comprehensive context for test plan creation