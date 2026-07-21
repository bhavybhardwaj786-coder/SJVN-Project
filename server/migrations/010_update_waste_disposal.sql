UPDATE public.forms
SET schema = '{
  "icon": "Trash2",
  "fields": [
    {"key": "wd_plastic_qty", "type": "number", "unit": "Tons", "label": "Plastic Waste (Tons)", "required": false},
    {"key": "wd_plastic_method", "type": "text", "label": "Plastic Disposal Method", "required": false},
    {"key": "wd_ewaste_qty", "type": "number", "unit": "Tons", "label": "E-Waste (Tons)", "required": false},
    {"key": "wd_ewaste_method", "type": "text", "label": "E-Waste Disposal Method", "required": false},
    {"key": "wd_biomed_qty", "type": "number", "unit": "Tons", "label": "Bio-medical Waste (Tons)", "required": false},
    {"key": "wd_biomed_method", "type": "text", "label": "Bio-medical Disposal Method", "required": false},
    {"key": "wd_cd_qty", "type": "number", "unit": "Tons", "label": "C&D Waste (Tons)", "required": false},
    {"key": "wd_cd_method", "type": "text", "label": "C&D Disposal Method", "required": false},
    {"key": "wd_battery_qty", "type": "number", "unit": "Tons", "label": "Battery Waste (Tons)", "required": false},
    {"key": "wd_battery_method", "type": "text", "label": "Battery Disposal Method", "required": false},

    {"key": "wd_otherhaz_specify", "type": "text", "label": "Specify Other Hazardous", "required": false},
    {"key": "wd_otherhaz_qty", "type": "number", "unit": "Tons", "label": "Other Haz Waste (Tons)", "required": false},
    {"key": "wd_otherhaz_method", "type": "text", "label": "Other Haz Disposal Method", "required": false},

    {"key": "wd_othernonhaz_specify", "type": "text", "label": "Specify Other Non-Hazardous", "required": false},
    {"key": "wd_othernonhaz_qty", "type": "number", "unit": "Tons", "label": "Other Non-Haz Waste (Tons)", "required": false},
    {"key": "wd_othernonhaz_method", "type": "text", "label": "Other Non-Haz Disposal Method", "required": false},

    {"key": "wd_total_produced", "type": "number", "unit": "Tons", "label": "Total Quantity Produced", "required": false},

    {"key": "wd_recov_recycled", "type": "number", "unit": "Tons", "label": "Recycled", "required": false},
    {"key": "wd_recov_reused", "type": "number", "unit": "Tons", "label": "Re-used", "required": false},
    {"key": "wd_recov_other", "type": "number", "unit": "Tons", "label": "Other Recovery", "required": false},
    {"key": "wd_recov_total", "type": "number", "unit": "Tons", "label": "Total Recovered", "required": false},

    {"key": "wd_disp_incin", "type": "number", "unit": "Tons", "label": "Incineration", "required": false},
    {"key": "wd_disp_landfill", "type": "number", "unit": "Tons", "label": "Landfilling", "required": false},
    {"key": "wd_disp_other", "type": "number", "unit": "Tons", "label": "Other Disposal", "required": false},
    {"key": "wd_disp_total", "type": "number", "unit": "Tons", "label": "Total Disposed", "required": false}
  ],
  "repeatable_groups": [
    {
      "key": "additional_wastes",
      "label": "Additional Waste Category",
      "minRows": 0,
      "rowFields": [
        {"key": "type", "type": "text", "label": "Type of Waste", "required": true},
        {"key": "classification", "type": "select", "label": "Classification", "options": [{"label":"Hazardous", "value":"hazardous"}, {"label":"Non-hazardous", "value":"non-hazardous"}], "required": true},
        {"key": "quantity", "type": "number", "unit": "Tons", "label": "Quantity (Tons)", "required": true},
        {"key": "method", "type": "text", "label": "Disposal Method", "required": false}
      ]
    }
  ],
  "layout": [
    { "type": "metadata", "display": ["reporting_month", "site_name", "user_name", "date_filled"] },
    { "type": "instruction", "content": "Report the total weight of hazardous and non-hazardous waste under each category. Specify classification (hazardous/non-hazardous) and method of disposal. Attach monitoring reports as needed." },
    {
      "type": "section",
      "title": "Waste Produced & Disposal Methods",
      "children": [
        {
          "type": "table",
          "columns": ["S. No.", "Type of Waste", "Unit", "Classification", "Quantity (Tons)", "Method of Disposal"],
          "rows": [
            [{ "type": "label", "value": "1" }, { "type": "label", "value": "Plastic waste" }, { "type": "label", "value": "Metric Tons" }, { "type": "label", "value": "Hazardous" }, { "type": "field", "fieldKey": "wd_plastic_qty" }, { "type": "field", "fieldKey": "wd_plastic_method" }],
            [{ "type": "label", "value": "2" }, { "type": "label", "value": "E-waste" }, { "type": "label", "value": "Metric Tons" }, { "type": "label", "value": "Hazardous" }, { "type": "field", "fieldKey": "wd_ewaste_qty" }, { "type": "field", "fieldKey": "wd_ewaste_method" }],
            [{ "type": "label", "value": "3" }, { "type": "label", "value": "Bio-medical waste" }, { "type": "label", "value": "Metric Tons" }, { "type": "label", "value": "Hazardous" }, { "type": "field", "fieldKey": "wd_biomed_qty" }, { "type": "field", "fieldKey": "wd_biomed_method" }],
            [{ "type": "label", "value": "4" }, { "type": "label", "value": "Construction & Demolition" }, { "type": "label", "value": "Metric Tons" }, { "type": "label", "value": "Non-hazardous" }, { "type": "field", "fieldKey": "wd_cd_qty" }, { "type": "field", "fieldKey": "wd_cd_method" }],
            [{ "type": "label", "value": "5" }, { "type": "label", "value": "Battery waste" }, { "type": "label", "value": "Metric Tons" }, { "type": "label", "value": "Hazardous" }, { "type": "field", "fieldKey": "wd_battery_qty" }, { "type": "field", "fieldKey": "wd_battery_method" }],
            [{ "type": "label", "value": "6" }, { "type": "field", "fieldKey": "wd_otherhaz_specify", "placeholder": "Specify other hazardous waste..." }, { "type": "label", "value": "Metric Tons" }, { "type": "label", "value": "Hazardous" }, { "type": "field", "fieldKey": "wd_otherhaz_qty" }, { "type": "field", "fieldKey": "wd_otherhaz_method" }],
            [{ "type": "label", "value": "7" }, { "type": "field", "fieldKey": "wd_othernonhaz_specify", "placeholder": "Specify other non-hazardous..." }, { "type": "label", "value": "Metric Tons" }, { "type": "label", "value": "Non-hazardous" }, { "type": "field", "fieldKey": "wd_othernonhaz_qty" }, { "type": "field", "fieldKey": "wd_othernonhaz_method" }]
          ],
          "summaryRow": [
            { "type": "label", "value": "TOTAL WASTE GENERATED", "colSpan": 4 },
            { "type": "field", "fieldKey": "wd_total_produced", "colSpan": 2 }
          ]
        }
      ]
    },
    {
      "type": "section",
      "title": "Additional Dynamic Waste Types",
      "description": "If you have waste categories that do not fit into the table above, add them here.",
      "children": [
        { "type": "repeatable_table", "groupKey": "additional_wastes", "title": "Custom Waste Entries" }
      ]
    },
    {
      "type": "section",
      "title": "Waste Recovery & Recycling Summary",
      "description": "For each category of waste generated, total waste recovered through recycling, re-using or other recovery operations.",
      "children": [
        {
          "type": "table",
          "columns": ["S. No.", "Category of Waste", "Unit", "Quantity (Tons)"],
          "rows": [
            [{ "type": "label", "value": "i" }, { "type": "label", "value": "Recycled" }, { "type": "label", "value": "Metric Tons" }, { "type": "field", "fieldKey": "wd_recov_recycled" }],
            [{ "type": "label", "value": "ii" }, { "type": "label", "value": "Re-used" }, { "type": "label", "value": "Metric Tons" }, { "type": "field", "fieldKey": "wd_recov_reused" }],
            [{ "type": "label", "value": "iii" }, { "type": "label", "value": "Other recovery operations" }, { "type": "label", "value": "Metric Tons" }, { "type": "field", "fieldKey": "wd_recov_other" }]
          ],
          "summaryRow": [
            { "type": "label", "value": "TOTAL RECOVERED", "colSpan": 3 },
            { "type": "field", "fieldKey": "wd_recov_total" }
          ]
        }
      ]
    },
    {
      "type": "section",
      "title": "Waste Disposal Summary",
      "description": "For each category of waste generated, total waste disposed by nature of disposal method.",
      "children": [
        {
          "type": "table",
          "columns": ["S. No.", "Category of Waste", "Unit", "Quantity (Tons)"],
          "rows": [
            [{ "type": "label", "value": "i" }, { "type": "label", "value": "Incineration" }, { "type": "label", "value": "Metric Tons" }, { "type": "field", "fieldKey": "wd_disp_incin" }],
            [{ "type": "label", "value": "ii" }, { "type": "label", "value": "Landfilling" }, { "type": "label", "value": "Metric Tons" }, { "type": "field", "fieldKey": "wd_disp_landfill" }],
            [{ "type": "label", "value": "iii" }, { "type": "label", "value": "Other disposal operations" }, { "type": "label", "value": "Metric Tons" }, { "type": "field", "fieldKey": "wd_disp_other" }]
          ],
          "summaryRow": [
            { "type": "label", "value": "TOTAL DISPOSED", "colSpan": 3 },
            { "type": "field", "fieldKey": "wd_disp_total" }
          ]
        }
      ]
    }
  ]
}'::jsonb,
updated_at = now()
WHERE title ILIKE '%Waste Disposal%';