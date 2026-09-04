-- Keep stored department values aligned with the application's controlled
-- vocabulary so filtering and bilingual display remain deterministic.
alter table public.bribe_reports
  add constraint bribe_reports_department_is_canonical
  check (
    department = any (array[
      'Land Office',
      'Accounts Office',
      'Tax Office',
      'Customs Office',
      'Traffic Police',
      'BRTA',
      'Passport Office',
      'City Corporation',
      'Sub-Registry Office',
      'Education Office',
      'Public Hospital',
      'Other public service'
    ])
  );
