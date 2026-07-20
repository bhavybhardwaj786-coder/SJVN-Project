UPDATE public.forms
SET title = 'Other Air Emissions',
    schema = '{
  "icon": "Wind",
  "fields": [
    {"key": "ambient_pm10", "type": "number", "unit": "kg", "label": "PM10 (Ambient)", "required": true},
    {"key": "ambient_nox", "type": "number", "unit": "kg", "label": "NOx (Ambient)", "required": true},
    {"key": "ambient_sox", "type": "number", "unit": "kg", "label": "SOx (Ambient)", "required": true},
    {"key": "ambient_co", "type": "number", "unit": "kg", "label": "CO (Ambient)", "required": true},
    {"key": "ambient_total", "type": "number", "unit": "kg", "label": "Total Ambient Emissions", "required": true},
    {"key": "field_1784011888284_63", "type": "number", "unit": "kg", "label": "PM10 (Stack)", "required": true},
    {"key": "field_1784011897052_65", "type": "number", "unit": "kg", "label": "NOx (Stack)", "required": true},
    {"key": "field_1784011907020_67", "type": "number", "unit": "kg", "label": "SOx (Stack)", "required": true},
    {"key": "field_1784011916956_69", "type": "number", "unit": "kg", "label": "CO (Stack)", "required": true},
    {"key": "field_1784011927794_71", "type": "number", "unit": "kg", "label": "Total Stack Emissions", "required": true}
  ],
  "layout": [
    { "type": "metadata", "display": ["reporting_month", "site_name", "user_name", "date_filled"] },
    { "type": "instruction", "content": "Report the amount of air emissions, in metric tons/kg, for each category relevant to the unit: Particulate matter (PM10), NOx, SOx, and other significant categories such as hazardous air pollutants (HAP), persistent organic pollutants (POP), and volatile organic compounds (VOC). Report the source of the data and any assumptions used as remarks where applicable." },
    {
      "type": "section",
      "title": "Ambient Air Emissions",
      "children": [
        {
          "type": "table",
          "columns": ["S. No.", "Substance", "Unit", "Reported Value"],
          "rows": [
            [{ "type": "label", "value": "1" }, { "type": "label", "value": "PM10" }, { "type": "label", "value": "kg" }, { "type": "field", "fieldKey": "ambient_pm10" }],
            [{ "type": "label", "value": "2" }, { "type": "label", "value": "NOx" }, { "type": "label", "value": "kg" }, { "type": "field", "fieldKey": "ambient_nox" }],
            [{ "type": "label", "value": "3" }, { "type": "label", "value": "SOx" }, { "type": "label", "value": "kg" }, { "type": "field", "fieldKey": "ambient_sox" }],
            [{ "type": "label", "value": "4" }, { "type": "label", "value": "CO" }, { "type": "label", "value": "kg" }, { "type": "field", "fieldKey": "ambient_co" }]
          ],
          "summaryRow": [
            { "type": "label", "value": "TOTAL EMISSIONS", "colSpan": 3 },
            { "type": "field", "fieldKey": "ambient_total" }
          ]
        }
      ]
    },
    {
      "type": "section",
      "title": "Stack Emission (average for multiple stacks)",
      "children": [
        {
          "type": "table",
          "columns": ["S. No.", "Substance", "Unit", "Reported Value"],
          "rows": [
            [{ "type": "label", "value": "1" }, { "type": "label", "value": "PM10" }, { "type": "label", "value": "kg" }, { "type": "field", "fieldKey": "field_1784011888284_63" }],
            [{ "type": "label", "value": "2" }, { "type": "label", "value": "NOx" }, { "type": "label", "value": "kg" }, { "type": "field", "fieldKey": "field_1784011897052_65" }],
            [{ "type": "label", "value": "3" }, { "type": "label", "value": "SOx" }, { "type": "label", "value": "kg" }, { "type": "field", "fieldKey": "field_1784011907020_67" }],
            [{ "type": "label", "value": "4" }, { "type": "label", "value": "CO" }, { "type": "label", "value": "kg" }, { "type": "field", "fieldKey": "field_1784011916956_69" }]
          ],
          "summaryRow": [
            { "type": "label", "value": "TOTAL EMISSIONS", "colSpan": 3 },
            { "type": "field", "fieldKey": "field_1784011927794_71" }
          ]
        }
      ]
    }
  ]
}'::jsonb,
    updated_at = now()
WHERE id = '67c3ac61-34b8-4aa5-ab80-87d72cc76435';