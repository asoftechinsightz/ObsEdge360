#!/bin/bash
set -euo pipefail
API="${API_BASE:-https://api.observability360.asoftechinsightz.com/api/v1}"
ROOT="${ROOT_DIR:-/opt/OpsEdge360}"
PASS=0
FAIL=0
check() {
  local name="$1" expect="$2" got="$3"
  if [ "$got" = "$expect" ]; then echo "PASS $name ($got)"; PASS=$((PASS+1));
  else echo "FAIL $name expected=$expect got=$got"; FAIL=$((FAIL+1)); fi
}

echo "=== Phase 5 Wave 6 validation @ $API ==="
echo "git: $(cd "$ROOT" && git log -1 --oneline)"

check health 200 "$(curl -sk -o /dev/null -w '%{http_code}' "$API/health")"

TAB=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='secret_rotation_jobs';" | tr -d '[:space:]')
check migration_038_rotation 1 "${TAB:-0}"

CERTS_TAB=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='enterprise_certificates';" | tr -d '[:space:]')
check migration_038_certs 1 "${CERTS_TAB:-0}"

AIRGAP_TAB=$(docker exec opsedge360-postgres-1 psql -U trinetra -d trinetra360 -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='airgap_packages';" | tr -d '[:space:]')
check migration_038_airgap 1 "${AIRGAP_TAB:-0}"

if [ -d "$ROOT/docs/Wave6" ] && [ -f "$ROOT/docs/Wave6/Architecture.md" ] && [ -f "$ROOT/docs/Wave6/Validation.md" ]; then
  echo "PASS documentation_wave6"; PASS=$((PASS+1));
else
  echo "FAIL documentation_wave6"; FAIL=$((FAIL+1));
fi

if [ -f "$ROOT/infra/helm/opsedge360/values-production.yaml" ] && grep -q '1.0.0-wave6' "$ROOT/infra/helm/opsedge360/Chart.yaml"; then
  echo "PASS kubernetes_helm_wave6"; PASS=$((PASS+1));
else
  echo "FAIL kubernetes_helm_wave6"; FAIL=$((FAIL+1));
fi

if [ -x "$ROOT/scripts/airgap-package.sh" ] || [ -f "$ROOT/scripts/airgap-package.sh" ]; then
  echo "PASS airgap_scripts"; PASS=$((PASS+1));
else
  echo "FAIL airgap_scripts"; FAIL=$((FAIL+1));
fi
if [ -f "$ROOT/scripts/backup-certify.sh" ] && [ -f "$ROOT/scripts/airgap-verify.sh" ]; then
  echo "PASS backup_certify_script"; PASS=$((PASS+1));
else
  echo "FAIL backup_certify_script"; FAIL=$((FAIL+1));
fi

SUFFIX=$(date +%s)
SIGN=$(curl -sk -o /tmp/p5w6_signup.json -w '%{http_code}' -X POST "$API/auth/signup" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"p5w6.admin.${SUFFIX}@opsedge360.internal\",\"password\":\"P5W6Val!${SUFFIX}Aa\",\"name\":\"P5W6 Admin\",\"organizationName\":\"P5W6 Org ${SUFFIX}\"}")
if [ "$SIGN" = "201" ] || [ "$SIGN" = "200" ]; then echo "PASS signup ($SIGN)"; PASS=$((PASS+1)); else echo "FAIL signup"; FAIL=$((FAIL+1)); fi
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/p5w6_signup.json')).get('accessToken') or '')")

OH=$(curl -sk -o /tmp/p5w6_oh.json -w '%{http_code}' "$API/admin/ops-health" -H "Authorization: Bearer $TOKEN")
check ops_health 200 "$OH"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w6_oh.json'))
assert d.get('gaClaim') is False
assert d.get('wave')=='v1.0.0-wave6'
assert 'deployment' in d and 'certificates' in d and 'backups' in d
print('PASS ops_health_shape')
PY
PASS=$((PASS+1))

SEC=$(curl -sk -o /tmp/p5w6_sec.json -w '%{http_code}' "$API/admin/system/security" -H "Authorization: Bearer $TOKEN")
check system_security 200 "$SEC"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w6_sec.json'))
assert d.get('gaClaim') is False
tabs=d.get('tabs') or []
for t in ['general','secrets','password','session','rotation','audit','certificates']:
  assert t in tabs
print('PASS security_tabs')
PY
PASS=$((PASS+1))

PWD=$(curl -sk -o /tmp/p5w6_pwd.json -w '%{http_code}' -X PUT "$API/admin/system/security/password" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"minLength":12,"requireComplexity":true,"maxFailedAttempts":5,"lockoutMinutes":15,"expiryDays":90,"historyCount":5,"reusePrevention":true,"adminOverride":true}')
check password_policy 200 "$PWD"

SESS=$(curl -sk -o /tmp/p5w6_sess.json -w '%{http_code}' -X PUT "$API/admin/system/security/session" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"idleTimeoutMinutes":30,"absoluteTimeoutHours":12,"maxConcurrentSessions":5,"deviceTracking":true,"forcedLogoutEnabled":true,"sessionAudit":true}')
check session_policy 200 "$SESS"

CSUM=$(python3 -c "import hashlib;print(hashlib.sha256(b'opsedge360-wave6-airgap').hexdigest())")
AG=$(curl -sk -o /tmp/p5w6_ag.json -w '%{http_code}' -X POST "$API/admin/deployment/airgap" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"packageName\":\"opsedge360-airgap\",\"version\":\"v1.0.0-wave6\",\"checksumSha256\":\"$CSUM\",\"manifest\":{\"requiresInternet\":false,\"offlineDocs\":true},\"offlineDocs\":true}")
if [ "$AG" = "200" ] || [ "$AG" = "201" ]; then echo "PASS airgap_register ($AG)"; PASS=$((PASS+1)); else echo "FAIL airgap_register"; cat /tmp/p5w6_ag.json; FAIL=$((FAIL+1)); fi
AG_ID=$(python3 -c "import json;print(json.load(open('/tmp/p5w6_ag.json')).get('id') or '')")
AGV=$(curl -sk -o /tmp/p5w6_agv.json -w '%{http_code}' -X POST "$API/admin/deployment/airgap/${AG_ID}/verify" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"computedChecksumSha256\":\"$CSUM\"}")
check airgap_verify 200 "$AGV"

PROF=$(curl -sk -o /tmp/p5w6_prof.json -w '%{http_code}' -X POST "$API/admin/deployment/profiles" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"profileName":"production","mode":"onprem","namespace":"opsedge360","helmRelease":"opsedge360","airgap":false,"valuesSnapshot":{"chart":"values-production.yaml"}}')
if [ "$PROF" = "200" ] || [ "$PROF" = "201" ]; then echo "PASS deployment_profile ($PROF)"; PASS=$((PASS+1)); else echo "FAIL deployment_profile"; FAIL=$((FAIL+1)); fi
PL=$(curl -sk -o /tmp/p5w6_pl.json -w '%{http_code}' "$API/admin/deployment/profiles" -H "Authorization: Bearer $TOKEN")
check deployment_profiles_list 200 "$PL"
python3 - <<'PY'
import json
d=json.load(open('/tmp/p5w6_pl.json'))
feats=d.get('helm',{}).get('features') or []
for f in ['HPA','Ingress','PVC','probes']:
  assert f in feats, f
print('PASS kubernetes_features')
PY
PASS=$((PASS+1))

BS=$(curl -sk -o /tmp/p5w6_bs.json -w '%{http_code}' -X POST "$API/admin/deployment/backup/schedules" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Nightly PostgreSQL W6","target":"postgresql","cronExpr":"0 2 * * *","retentionDays":14,"encrypt":true}')
if [ "$BS" = "200" ] || [ "$BS" = "201" ]; then echo "PASS backup_schedule ($BS)"; PASS=$((PASS+1)); else echo "FAIL backup_schedule"; FAIL=$((FAIL+1)); fi

BCSUM=$(python3 -c "import hashlib;print(hashlib.sha256(b'backup-cert-w6').hexdigest())")
BC=$(curl -sk -o /tmp/p5w6_bc.json -w '%{http_code}' -X POST "$API/admin/deployment/backup/certify" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"artifactPath\":\"/var/backups/opsedge360-w6-demo.sql.gz\",\"checksumSha256\":\"$BCSUM\",\"sizeBytes\":2048,\"report\":{\"integrity\":\"checksum_validated\"}}")
if [ "$BC" = "200" ] || [ "$BC" = "201" ]; then echo "PASS backup_certify ($BC)"; PASS=$((PASS+1)); else echo "FAIL backup_certify"; cat /tmp/p5w6_bc.json; FAIL=$((FAIL+1)); fi

RC=$(curl -sk -o /tmp/p5w6_rc.json -w '%{http_code}' -X POST "$API/admin/deployment/restore/certify" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"restoreType":"full","sourceArtifact":"/var/backups/opsedge360-w6-demo.sql.gz","status":"validated","validationReport":{"checks":["schema","app_health"],"passed":true}}')
if [ "$RC" = "200" ] || [ "$RC" = "201" ]; then echo "PASS restore_certify ($RC)"; PASS=$((PASS+1)); else echo "FAIL restore_certify"; FAIL=$((FAIL+1)); fi

# Secret + rotation job
EXP_AT=$(python3 -c "from datetime import datetime,timedelta,timezone;print((datetime.now(timezone.utc)+timedelta(days=20)).strftime('%Y-%m-%dT%H:%M:%SZ'))")
SEC_CREATE=$(curl -sk -o /tmp/p5w6_secret.json -w '%{http_code}' -X POST "$API/secrets" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"name\":\"w6-rot-${SUFFIX}\",\"value\":\"W6SecretValue!${SUFFIX}\",\"rotateAfterDays\":90,\"expiresAt\":\"${EXP_AT}\"}")
if [ "$SEC_CREATE" = "200" ] || [ "$SEC_CREATE" = "201" ]; then echo "PASS secret_create ($SEC_CREATE)"; PASS=$((PASS+1)); else echo "FAIL secret_create"; cat /tmp/p5w6_secret.json; FAIL=$((FAIL+1)); fi
SECRET_ID=$(python3 -c "import json;print(json.load(open('/tmp/p5w6_secret.json')).get('id') or '')")

ROT=$(curl -sk -o /tmp/p5w6_rot.json -w '%{http_code}' -X POST "$API/admin/system/security/rotation" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"secretId\":\"$SECRET_ID\",\"scheduleCron\":\"0 3 * * 0\",\"notifyBeforeDays\":30,\"autoRotate\":false}")
if [ "$ROT" = "200" ] || [ "$ROT" = "201" ]; then echo "PASS rotation_job ($ROT)"; PASS=$((PASS+1)); else echo "FAIL rotation_job"; cat /tmp/p5w6_rot.json; FAIL=$((FAIL+1)); fi
ROT_ID=$(python3 -c "import json;print(json.load(open('/tmp/p5w6_rot.json')).get('id') or '')")
ROTRUN=$(curl -sk -o /tmp/p5w6_rotrun.json -w '%{http_code}' -X POST "$API/admin/system/security/rotation/${ROT_ID}/run" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"newValue\":\"W6Rotated!${SUFFIX}\"}")
if [ "$ROTRUN" = "200" ] || [ "$ROTRUN" = "201" ]; then echo "PASS rotation_run ($ROTRUN)"; PASS=$((PASS+1)); else echo "FAIL rotation_run"; cat /tmp/p5w6_rotrun.json; FAIL=$((FAIL+1)); fi

# Certificate PEM via JSON file (avoid shell escaping)
openssl req -x509 -newkey rsa:2048 -keyout /tmp/p5w6_key.pem -out /tmp/p5w6_cert.pem -days 365 -nodes -subj '/CN=opsedge360-w6-test' >/dev/null 2>&1
python3 - <<'PY'
import json
pem=open('/tmp/p5w6_cert.pem').read()
json.dump({"name":"w6-edge-tls","purpose":"tls","pemPublic":pem}, open('/tmp/p5w6_cert_body.json','w'))
PY
CERT_UP=$(curl -sk -o /tmp/p5w6_certup.json -w '%{http_code}' -X POST "$API/admin/system/security/certificates" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  --data-binary @/tmp/p5w6_cert_body.json)
if [ "$CERT_UP" = "200" ] || [ "$CERT_UP" = "201" ]; then echo "PASS certificate_upload ($CERT_UP)"; PASS=$((PASS+1)); else echo "FAIL certificate_upload"; cat /tmp/p5w6_certup.json; FAIL=$((FAIL+1)); fi
CERT_ID=$(python3 -c "import json;print(json.load(open('/tmp/p5w6_certup.json')).get('id') or '')")
if [ -n "$CERT_ID" ]; then
  CV=$(curl -sk -o /tmp/p5w6_cv.json -w '%{http_code}' -X POST "$API/admin/system/security/certificates/${CERT_ID}/validate" \
    -H "Authorization: Bearer $TOKEN")
  check certificate_validate 200 "$CV"
else
  echo "FAIL certificate_validate"; FAIL=$((FAIL+1));
fi

AUD=$(curl -sk -o /dev/null -w '%{http_code}' "$API/admin/system/security/audit" -H "Authorization: Bearer $TOKEN")
check security_audit 200 "$AUD"

UA=$(curl -sk -o /dev/null -w '%{http_code}' "$API/admin/ops-health")
if [ "$UA" = "401" ] || [ "$UA" = "403" ]; then echo "PASS ops_health_unauth ($UA)"; PASS=$((PASS+1)); else echo "FAIL ops_health_unauth got=$UA"; FAIL=$((FAIL+1)); fi

# Prior wave smoke — integrations still present
W5=$(curl -sk -o /dev/null -w '%{http_code}' "$API/integrations" -H "Authorization: Bearer $TOKEN")
check wave5_integrations_compat 200 "$W5"

echo "=== RESULT pass=$PASS fail=$FAIL ==="
[ "$FAIL" -eq 0 ] || exit 1
echo P5_WAVE6_VALIDATION_OK
