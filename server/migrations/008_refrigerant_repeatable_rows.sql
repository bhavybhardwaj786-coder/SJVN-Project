UPDATE public.forms
SET schema = '{
  "icon": "Droplet",
  "fields": [],
  "repeatable_groups": [
    {
      "key": "refrigerants",
      "label": "Refrigerant Entry",
      "minRows": 1,
      "rowFields": [
        {"key": "name", "type": "text", "label": "Refrigerant Name", "required": true},
        {"key": "quantity", "type": "number", "unit": "Tons", "label": "Quantity", "required": true},
        {"key": "location", "type": "text", "label": "Location (Plant or Plant Office)", "required": false},
        {"key": "source", "type": "select", "label": "Source of Emission", "required": true, "options": [
          {"label": "Air Conditioner", "value": "air_conditioner"},
          {"label": "Refrigerator", "value": "refrigerator"},
          {"label": "Fire Extinguisher", "value": "fire_extinguisher"}
        ]},
        {"key": "manufacturer", "type": "text", "label": "Manufacturer", "required": false},
        {"key": "year_installed", "type": "date", "label": "Year of Installation", "required": false}
      ]
    }
  ],
  "layout": [
    { "type": "metadata", "display": ["reporting_month", "site_name", "user_name", "date_filled"] },
    { "type": "instruction", "content": "List each refrigerant type used at this site for the reporting month. Report the quantity in Tons, along with its location, source of emission, manufacturer, and year of installation. Click \"Add Refrigerant Entry\" for each additional refrigerant type." },
    { "type": "repeatable_table", "groupKey": "refrigerants", "title": "Refrigerant Entries" }
  ]
}'::jsonb,
    updated_at = now()
WHERE id = '27af457e-d6ec-44ba-93bf-293b607064c4';