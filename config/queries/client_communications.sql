-- @param advisor_id STRING
-- @param signal_id  STRING
-- Returns one row per affected client for the given signal.
SELECT
  now(), 
  cc.client_id,
  cc.client_name,
  ROUND(c.total_aum / 1e6, 1) AS aum_millions,
  cc.signal_type,
  cc.symbol,
  cc.signal_id,
  cc.email_draft
FROM       ahtsa.awm.app_client_communications cc
JOIN       ahtsa.awm.clients                   c  ON  c.client_id  = cc.client_id
WHERE  cc.advisor_id = :advisor_id
  AND  cc.signal_id  = :signal_id
  AND  cc.status     = 'success'
  AND  cc.run_date   = (
         SELECT MAX(run_date)
         FROM   ahtsa.awm.app_client_communications
         WHERE  advisor_id = :advisor_id
           AND  signal_id  = :signal_id
       )
ORDER BY c.total_aum DESC
