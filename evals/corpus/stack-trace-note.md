# Stack trace note

The application throws a 500 error when the user submits the form at /api/v1/register on https://api.example.com. The middleware is catching the exception but it should be noted that we should probably also log the request. The stack trace points to /src/auth/session.ts:42.
