-- ============================================================
-- Crear usuario admin — pegar en Supabase Dashboard > SQL Editor
-- ============================================================
DO $$
DECLARE v_uid uuid;
BEGIN
  -- 1. Evitar duplicado
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@r3zon.dev') THEN
    RAISE NOTICE 'Usuario ya existe: admin@r3zon.dev';
    RETURN;
  END IF;

  -- 2. Crear usuario con contraseña cifrada (bcrypt via pgcrypto)
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at,
    raw_user_meta_data, raw_app_meta_data,
    aud, role, created_at, updated_at,
    confirmation_token, recovery_token
  )
  VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'admin@r3zon.dev',
    crypt('R3z0n!Admin-Dev-2026', gen_salt('bf', 10)),
    now(),
    '{"nombre_negocio": "R3ZON Dev", "role": "admin"}'::jsonb,
    '{"provider":"email","providers":["email"]}'::jsonb,
    'authenticated', 'authenticated',
    now(), now(), '', ''
  )
  RETURNING id INTO v_uid;

  RAISE NOTICE 'Admin creado: % (UUID: %)', 'admin@r3zon.dev', v_uid;
END $$;
