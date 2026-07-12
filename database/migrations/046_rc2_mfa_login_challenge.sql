-- 046_rc2_mfa_login_challenge.sql
-- Allow MFA challenge events in login_history (RC2 login enforcement).

ALTER TABLE login_history DROP CONSTRAINT IF EXISTS login_history_event_chk;
ALTER TABLE login_history ADD CONSTRAINT login_history_event_chk CHECK (
  event IN (
    'login','login_failed','logout','mfa_challenge','mfa_success','mfa_failed',
    'session_revoke','password_change','token_create','token_revoke','backup_code_used'
  )
);
