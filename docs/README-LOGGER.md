# Pino Logger for Splito Backend

This project uses Pino for logging. Pino is a very low overhead Node.js logger that's focused on performance.

## Basic Usage

```typescript
// Import the logger directly
import { logger } from "../utils/logger";

// For general logging
logger.info("This is an informational message");
logger.error({ err }, "An error occurred");
logger.debug("Debug information");
logger.warn("Warning message");

// With context data
logger.info({ userId: "123", action: "login" }, "User logged in");
```

## Component-Specific Loggers

For better log organization, create component-specific loggers:

```typescript
import { createLogger } from "../utils/logger";

// Create a logger for your specific component
const logger = createLogger("your-component-name");

// Now all logs will have the component field
logger.info("This log will include the component name");
```

## Log Levels

The logger uses different log levels depending on the environment:

- Development: `debug` and above
- Production: `info` and above

Available log levels (in order of severity):

- `trace`
- `debug`
- `info`
- `warn`
- `error`
- `fatal`

## HTTP Request Logging

HTTP requests are automatically logged using `pino-http`. This middleware:

- Logs incoming requests
- Logs outgoing responses
- Includes request IDs for correlation
- Formats request/response data

## Best Practices

1. **Include Context**: Always include relevant context data as the first argument

   ```typescript
   logger.info({ userId, groupId }, "User added to group");
   ```

2. **Error Logging**: When logging errors, include the error object

   ```typescript
   try {
     // code that might throw
   } catch (error) {
     logger.error({ error, userId }, "Failed to process transaction");
   }
   ```

3. **Don't Log Sensitive Information**: Avoid logging sensitive data like passwords, tokens, or private keys

4. **Use Appropriate Levels**:

   - `debug`: Detailed information for debugging
   - `info`: Normal application behavior
   - `warn`: Potentially problematic situations
   - `error`: Error conditions
   - `fatal`: Critical errors that require immediate attention

5. **Structured Logging**: Use object notation for better searchability

   ```typescript
   // Good
   logger.info(
     { userId: "123", action: "deposit", amount: 100 },
     "User made a deposit"
   );

   // Avoid
   logger.info(`User 123 made a deposit of $100`);
   ```
