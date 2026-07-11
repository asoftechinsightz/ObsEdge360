# Security Policies

## Password

Configured per tenant in `security_policies` (`policy_type=password`):

- minLength, requireComplexity, maxFailedAttempts, lockoutMinutes, historyCount

Enforced on signup and password reset. Failed logins increment `auth_lockouts`.

## Session

`policy_type=session`: timeout, idle timeout, max concurrent, device tracking, forced logout.

Sessions recorded in `user_sessions`; admins can revoke via Admin → Session Management.
