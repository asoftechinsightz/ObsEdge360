# CMDB Architecture

CI classes extended (cluster/storage/middleware/business_service/k8s_object).  
Relationships table + `ci_relationships` view.  
Topology snapshots materialize into `topology_nodes` / `topology_edges`.  
Drift: `drift_events` + legacy `ci_config_drift`.  
History: `configuration_history`.
