UPDATE public.forms
SET schema = '{
  "icon": "Leaf",
  "fields": [
    {"key": "field_1784010543765_2", "type": "number", "unit": "KL", "label": "Diesel - DG onsite", "required": true},
    {"key": "field_1784010715087_3", "type": "number", "unit": "KL", "label": "Diesel (Vehicles)", "required": true},
    {"key": "field_1784010812990_5", "type": "number", "unit": "KL", "label": "Light Diesel Oil (LDO)", "required": true},
    {"key": "field_1784010833341_7", "type": "number", "unit": "KL", "label": "Petrol", "required": true},
    {"key": "field_1784010840024_9", "type": "number", "unit": "KL", "label": "LPG", "required": true},
    {"key": "field_1784010876696_11", "type": "number", "unit": "KL", "label": "CNG/PNG", "required": true},
    {"key": "field_1784010887803_13", "type": "number", "unit": "KL", "label": "Other fuel (Specify)", "required": true},
    {"key": "field_1784010907586_15", "type": "number", "unit": "kWh", "label": "Electricity Purchased from Grid (Non renewable)", "required": true},
    {"key": "field_1784010929847_17", "type": "number", "unit": "kWh", "label": "Renewable Electricity Purchased from Grid", "required": true},
    {"key": "field_1784010944207_19", "type": "number", "unit": "kWh", "label": "Solar/ Wind/ Hydropower", "required": true},
    {"key": "initiatives", "type": "textarea", "label": "Specific energy saving initiatives implemented by the company", "required": false}
  ],
  "layout": [
    {
      "type": "metadata",
      "display": ["reporting_month", "site_name", "user_name", "date_filled"]
    },
    {
      "type": "instruction",
      "content": "Instructions:\nA. Report total fuel consumption in gigajoules, for each fuel type used.\nB. Report electricity purchased in gigajoules\nC. Report steam purchased in gigajoules (if applicable)\nD. Report Electricity produced from captive power plants\nE. Report steam produced from boilers / co-generation power plants\nAlso report the source of the data, and conversion factors (calorific values) where applicable."
    },
    {
      "type": "section",
      "title": "A. Fuel consumption by fuel type",
      "children": [
        {
          "type": "table",
          "columns": ["S. No.", "Sources of Energy", "Unit", "Reported Value"],
          "rows": [
            [
              { "type": "label", "value": "1" },
              { "type": "label", "value": "Diesel - DG onsite" },
              { "type": "label", "value": "KL" },
              { "type": "field", "fieldKey": "field_1784010543765_2" }
            ],
            [
              { "type": "label", "value": "2" },
              { "type": "label", "value": "Diesel (Vehicles)" },
              { "type": "label", "value": "KL" },
              { "type": "field", "fieldKey": "field_1784010715087_3" }
            ],
            [
              { "type": "label", "value": "3" },
              { "type": "label", "value": "Light Diesel Oil (LDO)" },
              { "type": "label", "value": "KL" },
              { "type": "field", "fieldKey": "field_1784010812990_5" }
            ],
            [
              { "type": "label", "value": "4" },
              { "type": "label", "value": "Petrol" },
              { "type": "label", "value": "KL" },
              { "type": "field", "fieldKey": "field_1784010833341_7" }
            ],
            [
              { "type": "label", "value": "5" },
              { "type": "label", "value": "LPG" },
              { "type": "label", "value": "KL" },
              { "type": "field", "fieldKey": "field_1784010840024_9" }
            ],
            [
              { "type": "label", "value": "6" },
              { "type": "label", "value": "CNG/PNG" },
              { "type": "label", "value": "KL" },
              { "type": "field", "fieldKey": "field_1784010876696_11" }
            ],
            [
              { "type": "label", "value": "7" },
              { "type": "label", "value": "<Other fuel - type name here>" },
              { "type": "label", "value": "KL" },
              { "type": "field", "fieldKey": "field_1784010887803_13" }
            ]
          ]
        }
      ]
    },
    {
      "type": "section",
      "title": "B. Electricity purchased (Renewable and Non renewable Sources)",
      "children": [
        {
          "type": "table",
          "columns": ["S. No.", "Sources of Energy", "Unit", "Reported Value"],
          "rows": [
            [
              { "type": "label", "value": "1" },
              { "type": "label", "value": "Electricity Purchased from Grid (Non renewable)" },
              { "type": "label", "value": "kwh" },
              { "type": "field", "fieldKey": "field_1784010907586_15" }
            ],
            [
              { "type": "label", "value": "2" },
              { "type": "label", "value": "Renewable Electricity Purchased from Grid" },
              { "type": "label", "value": "kwh" },
              { "type": "field", "fieldKey": "field_1784010929847_17" }
            ],
            [
              { "type": "label", "value": "3" },
              { "type": "label", "value": "Solar/ Wind/ Hydropower" },
              { "type": "label", "value": "kwh" },
              { "type": "field", "fieldKey": "field_1784010944207_19" }
            ]
          ]
        }
      ]
    },
    {
      "type": "section",
      "title": "C. Additional Information",
      "children": [
        {
          "type": "field_group",
          "children": ["initiatives"]
        }
      ]
    }
  ]
}'::jsonb
WHERE id = '204acada-dd25-4851-8d3c-d657b374eda7';