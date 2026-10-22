-- After creating a user in Authentication → Users, promote them to admin:
-- Replace the email below with the real account email.

UPDATE public.profiles
SET role = 'admin',
    full_name = 'Dr. Admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'admin@globalcare.ph' LIMIT 1
);

-- Staff example (optional):
-- UPDATE public.profiles SET role = 'staff', full_name = 'Staff User'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'staff@globalcare.ph' LIMIT 1);
