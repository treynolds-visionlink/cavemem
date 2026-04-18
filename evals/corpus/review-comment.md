# Review comment

Basically, I think the authentication middleware is really not handling the case where the session token has expired. It should be noted that we probably want to add a refresh path that calls the identity provider again. Please also note that the database configuration should be updated to support the new environment variables.
