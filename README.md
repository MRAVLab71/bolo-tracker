# Bolo Tracker (PWA + Supabase)

PWA estática con sincronización por usuario usando Supabase.

## Pasos
1) Supabase: crea proyecto.
2) Supabase: en SQL Editor ejecuta `supabase.sql`.
3) Supabase Auth: activa Email + Google.
4) Pega `Project URL` y `anon public key` en `supabase-config.js`.
5) Sube a GitHub y despliega con Cloudflare Pages.

## Instalar
- Android: Chrome -> Instalar app
- Windows/macOS: Chrome/Edge -> Instalar
- iPhone: Safari -> Compartir -> Añadir a pantalla de inicio

Nota: esta v1 es online-first. Luego podemos añadir offline-first con IndexedDB + cola de sync.
