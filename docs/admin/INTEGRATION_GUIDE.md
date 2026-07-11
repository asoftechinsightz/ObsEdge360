# Integration Guide (Admin)

Admin Center pages under `/admin/` for Wave 5 integrations.

1. Register connector (URL/host only)
2. Attach `secretRef` from Secrets store
3. Test connection → health becomes healthy/connected
4. Configure notification channels and deliver
5. Configure identity providers; sync LDAP/AD directories
6. Review audit timeline via `/integrations/audit`

Never paste passwords into connector config fields.
