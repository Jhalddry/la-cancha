-- Add city to profiles
alter table profiles
  add column if not exists city text check (city is null or char_length(city) <= 80);
