SELECT holding_id, section, section_order, positive_pct, neutral_pct, negative_pct, sentiment, section_note
FROM ahtsa.awm.gold_app_management_tone
ORDER BY holding_id, section_order
