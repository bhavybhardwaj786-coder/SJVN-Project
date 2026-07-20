INSERT INTO public.forms (id, title, description, version, is_active, schema, site_ids, frequency, visible_to_site_users, visible_to_contractors, created_by, created_at, updated_at)
VALUES (
  '9823597c-0f20-49f9-afbd-b4f32a399233',
  'Water Withdrawal',
  '303-1 Total water withdrawal by source',
  1,
  true,
  '{
  "icon": "Droplet",
  "fields": [
    {"key": "wd_surface_extsite", "type": "select", "label": "Surface Water - External/On-site?", "options": [{"label": "External", "value": "external"}, {"label": "On-site", "value": "onsite"}], "required": false},
    {"key": "wd_surface_value", "type": "number", "unit": "KL", "label": "Surface Water Withdrawn", "required": true},
    {"key": "wd_ground_extsite", "type": "select", "label": "Groundwater - External/On-site?", "options": [{"label": "External", "value": "external"}, {"label": "On-site", "value": "onsite"}], "required": false},
    {"key": "wd_ground_value", "type": "number", "unit": "KL", "label": "Groundwater Withdrawn", "required": true},
    {"key": "wd_third_extsite", "type": "select", "label": "Third Party Water - External/On-site?", "options": [{"label": "External", "value": "external"}, {"label": "On-site", "value": "onsite"}], "required": false},
    {"key": "wd_third_value", "type": "number", "unit": "KL", "label": "Third Party Water Withdrawn", "required": true},
    {"key": "wd_other_extsite", "type": "select", "label": "Other Sources - External/On-site?", "options": [{"label": "External", "value": "external"}, {"label": "On-site", "value": "onsite"}], "required": false},
    {"key": "wd_other_specify", "type": "text", "label": "Other Source (Specify)", "required": false},
    {"key": "wd_other_value", "type": "number", "unit": "KL", "label": "Other Sources Withdrawn", "required": false},
    {"key": "wd_total_withdrawal", "type": "number", "unit": "KL", "label": "Total Water Withdrawal", "required": false},
    {"key": "wd_recycled_total", "type": "number", "unit": "KL", "label": "Total Water Recycled", "required": false},
    {"key": "wd_disch_notreat_value", "type": "number", "unit": "KL", "label": "Water Discharged - No Treatment", "required": false},
    {"key": "wd_disch_notreat_location", "type": "text", "label": "Discharge Location (No Treatment)", "required": false},
    {"key": "wd_disch_treat_value", "type": "number", "unit": "KL", "label": "Water Discharged - With Treatment", "required": false},
    {"key": "wd_disch_treat_location", "type": "text", "label": "Discharge Location (With Treatment)", "required": false},
    {"key": "wd_disch_treat_level", "type": "text", "label": "Level of Treatment (Specify)", "required": false},
    {"key": "wd_stp_details", "type": "textarea", "label": "Details of STP (capacity, monitoring reports, process flow)", "required": false}
  ],
  "layout": [
    { "type": "metadata", "display": ["reporting_month", "site_name", "user_name", "date_filled"] },
    { "type": "instruction", "content": "Report the total volume of water withdrawn from various sources. Please specify the source of the data (e.g. flow meter readings, invoices, etc.) and remarks, if any." },
    {
      "type": "section",
      "title": "Water Withdrawal by Source",
      "children": [
        {
          "type": "table",
          "columns": ["S. No.", "Source", "Unit", "External / On-site?", "Reported Value"],
          "rows": [
            [{ "type": "label", "value": "1" }, { "type": "label", "value": "Surface water" }, { "type": "label", "value": "KL" }, { "type": "field", "fieldKey": "wd_surface_extsite" }, { "type": "field", "fieldKey": "wd_surface_value" }],
            [{ "type": "label", "value": "2" }, { "type": "label", "value": "Groundwater" }, { "type": "label", "value": "KL" }, { "type": "field", "fieldKey": "wd_ground_extsite" }, { "type": "field", "fieldKey": "wd_ground_value" }],
            [{ "type": "label", "value": "3" }, { "type": "label", "value": "Third party water" }, { "type": "label", "value": "KL" }, { "type": "field", "fieldKey": "wd_third_extsite" }, { "type": "field", "fieldKey": "wd_third_value" }],
            [{ "type": "label", "value": "4" }, { "type": "label", "value": "Other sources - specify" }, { "type": "label", "value": "KL" }, { "type": "field", "fieldKey": "wd_other_extsite" }, { "type": "field", "fieldKey": "wd_other_value" }]
          ],
          "summaryRow": [
            { "type": "label", "value": "TOTAL WATER WITHDRAWAL", "colSpan": 4 },
            { "type": "field", "fieldKey": "wd_total_withdrawal" }
          ]
        },
        { "type": "field_group", "title": "Other Source Details", "children": ["wd_other_specify"] }
      ]
    },
    {
      "type": "section",
      "title": "Water Recycled",
      "children": [
        { "type": "field_group", "children": ["wd_recycled_total"] }
      ]
    },
    {
      "type": "section",
      "title": "Water Discharged",
      "children": [
        {
          "type": "table",
          "columns": ["Destination / Level of Treatment", "Unit", "Location", "Reported Value"],
          "rows": [
            [{ "type": "label", "value": "No treatment" }, { "type": "label", "value": "KL" }, { "type": "field", "fieldKey": "wd_disch_notreat_location" }, { "type": "field", "fieldKey": "wd_disch_notreat_value" }],
            [{ "type": "label", "value": "With treatment – specify level" }, { "type": "label", "value": "KL" }, { "type": "field", "fieldKey": "wd_disch_treat_location" }, { "type": "field", "fieldKey": "wd_disch_treat_value" }]
          ]
        },
        { "type": "field_group", "title": "Treatment Level Detail", "children": ["wd_disch_treat_level"] }
      ]
    },
    {
      "type": "section",
      "title": "Sewage Treatment Plant (STP) Details",
      "children": [
        { "type": "field_group", "children": ["wd_stp_details"] }
      ]
    }
  ]
}'::jsonb,
  NULL,
  'monthly',
  true,
  true,
  NULL,
  now(),
  now()
);