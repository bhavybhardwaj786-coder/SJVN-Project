UPDATE public.submissions
SET data = data || jsonb_build_object(
  'refrigerants', jsonb_build_array(
    jsonb_build_object(
      'name', '',
      'quantity', '',
      'location', '',
      'source', COALESCE(data->>'field_1784011129240_21', ''),
      'manufacturer', COALESCE(data->>'field_1784011185160_23', ''),
      'year_installed', COALESCE(data->>'field_1784011209254_25', '')
    )
  )
)
WHERE form_id = '27af457e-d6ec-44ba-93bf-293b607064c4';