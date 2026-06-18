alter table public.meeting_agenda_items
  add column if not exists pdf_file_path text,
  add column if not exists pdf_file_name text,
  add column if not exists pdf_file_size bigint,
  add column if not exists pdf_uploaded_at timestamptz;
