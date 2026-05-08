-- @param symbol STRING
SELECT doc_name
FROM ahtsa.awm.gold_app_documents
WHERE symbol = :symbol
ORDER BY
  CASE source_type
    WHEN 'sec_filing_10-K'    THEN 1
    WHEN 'earnings_transcript' THEN 2
    WHEN 'sec_filing_8-K'     THEN 3
    WHEN 'sec_filing_10-Q'    THEN 4
    WHEN 'bdc_early_warning'  THEN 5
    ELSE                           6
  END
