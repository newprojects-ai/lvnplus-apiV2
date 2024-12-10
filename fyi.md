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

### Routing Investigation for Test Execution Creation (2024-12-10)

### Routing Discrepancy
- Attempted Route: `/tests/plans/5/executions`
- Registered Routes:
  1. `/api/tests` (test.routes.ts)
  2. `/api/executions` (execution.routes.ts)
  3. `/api/tests/plans` (testPlan.routes.ts)

### Potential Issues
- The route being accessed does not exactly match any registered route
- Possible mismatch between frontend route expectations and backend route configuration

### Recommended Immediate Actions
- Verify the exact route being called from the frontend
- Check if the route prefix `/api` is being correctly handled
- Ensure route handlers are correctly mapped in `server.ts`

### Debugging Steps
1. Confirm frontend API call endpoint
2. Check server route registration
3. Verify middleware and route handler connections

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