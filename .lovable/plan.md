

## Diagnosis

Three missing RLS policies are causing the issues:

### 1. Tasks not saving (CREATE and EDIT)
The `tasks` table only has INSERT/DELETE policies for `admin`. Coordinators are blocked from:
- **INSERT** — tasks aren't created after OS creation
- **DELETE** — edit flow fails because it deletes existing tasks before re-inserting

### 2. Supervisor not showing in edit mode
The `user_roles` table only allows users to view **their own** roles. When the coordinator queries `user_roles` to build the supervisors dropdown (fetching users with roles `coordinator`, `technician`, `director`, `super_admin`), the query returns only the coordinator's own record. Result: **empty supervisors list**.

The supervisor_id IS correctly saved in the database (`fe50fc9b` = LEONARDO CARVALHO MORGADO), but the Select component can't display it because the options list is empty.

### 3. Visit technicians not saving
This was fixed in the last migration, but the OS was created before the policy existed. New creations should work, but the tasks INSERT will still fail due to issue #1.

## Fix — Database Migration

```sql
-- 1. Coordinators can insert tasks for their company's service orders
CREATE POLICY "Coordinators can insert tasks"
ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'director'::app_role))
  AND service_order_in_user_company(auth.uid(), service_order_id)
);

-- 2. Coordinators can delete tasks for their company's service orders
CREATE POLICY "Coordinators can delete tasks"
ON public.tasks
FOR DELETE TO authenticated
USING (
  (has_role(auth.uid(), 'coordinator'::app_role) OR has_role(auth.uid(), 'director'::app_role))
  AND task_in_user_company(auth.uid(), id)
);

-- 3. Coordinators can view roles in their company (needed for supervisor dropdown)
CREATE POLICY "Coordinators can view roles in their company"
ON public.user_roles
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'coordinator'::app_role)
  AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = user_roles.user_id
      AND p.company_id = user_company_id(auth.uid())
  )
);
```

### Files to change
- **1 new database migration** with the 3 policies above
- No frontend code changes needed

### Expected result
- Coordinators can create OS with technicians AND tasks
- Edit mode shows supervisor correctly in the dropdown
- Full OS creation and edit flow works for coordinators

