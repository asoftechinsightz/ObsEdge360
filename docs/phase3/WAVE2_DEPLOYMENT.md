# Phase 3 Wave 2 — Deployment

1. Apply migration 023 via `vps-deploy-latest.sh` (auto).
2. Rebuild `api-gateway` + `web` (+ `agent-framework` in image build).
3. Run `scripts/vps-p3-wave2-validate.sh`.
4. Enroll agents:
   - Console: Fleet → Create bootstrap token
   - Host: `API_URL=https://api... BOOTSTRAP_TOKEN=... node agents/universal-agent/bin/opsedge360-universal-agent.js`
