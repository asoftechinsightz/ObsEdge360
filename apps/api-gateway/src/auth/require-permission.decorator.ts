import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSION_KEY = 'require_permission';

/** Declare required permission (resource:action). Omit to use centralized path inference. */
export const RequirePermission = (permission: string) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permission);

export const SKIP_AUTHZ_KEY = 'skip_authz';

/** Skip AuthZ after AuthN (rare — prefer @Public for fully open routes). */
export const SkipAuthz = () => SetMetadata(SKIP_AUTHZ_KEY, true);
