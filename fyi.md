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
- Updated Test Plan routes to follow RESTful conventions
- Added PATCH and DELETE endpoints for test plans
- Modified test plan schema to support flexible question counts
- Added plannedBy and plannedAt fields to test plan responses
- Enhanced validation for test plan updates
- Improved error handling and access control for test plan operations
- Updated types to reflect new API requirements