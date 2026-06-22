UPDATE organizations
SET branding_settings =
  jsonb_set(
    jsonb_set(
      jsonb_set(branding_settings, '{themeMode}', '"DARK"'::jsonb, true),
      '{primaryColor}',
      CASE WHEN branding_settings->>'primaryColor' IS NULL OR branding_settings->>'primaryColor' = '#3448c5' THEN '"#16a394"'::jsonb ELSE branding_settings->'primaryColor' END,
      true
    ),
    '{accentColor}',
    CASE WHEN branding_settings->>'accentColor' IS NULL OR branding_settings->>'accentColor' = '#16a394' THEN '"#6ee7b7"'::jsonb ELSE branding_settings->'accentColor' END,
    true
  );
