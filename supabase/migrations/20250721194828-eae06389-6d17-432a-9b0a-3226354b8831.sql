-- Enable RLS on profiles table if not already active
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy that allows admins to read ALL profiles
-- This is necessary for future "Producer Management" page
CREATE POLICY "Allow admins to read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Create policy that allows admins to read ALL sales
-- This is ESSENTIAL for the get-admin-dashboard-data function to work
CREATE POLICY "Allow admins to read all sales"
ON public.sales
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);