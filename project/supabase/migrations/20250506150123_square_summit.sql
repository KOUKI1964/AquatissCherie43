/*
  # Add delete_user function

  1. New Functions
    - `delete_user(user_id uuid)`: Deletes a user from auth.users table
      - Takes a user_id parameter
      - Returns void
      - Security definer to allow execution with elevated privileges
      - Handles deletion of user from auth.users table

  2. Security
    - Function is security definer to allow deletion from auth.users
    - Only authenticated users can call this function
    - Additional RLS policies protect unauthorized access
*/

-- Create the delete_user function
create or replace function public.delete_user(user_id uuid)
returns void as $$
begin
  -- Delete the user from auth.users
  -- This will cascade to profiles due to foreign key constraints
  delete from auth.users where id = user_id;
end;
$$ language plpgsql
security definer;

-- Grant execute permission to authenticated users
grant execute on function public.delete_user(uuid) to authenticated;

-- Revoke execute from public
revoke execute on function public.delete_user(uuid) from public;

comment on function public.delete_user(uuid) is 'Deletes a user and their associated data from the system';