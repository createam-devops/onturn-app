# 🔐 Secretos Faltantes para OnTurn

Ya tienes configurados a nivel de **Organización** (✅):
- `DOCKERHUB_TOKEN`
- `DOCKERHUB_USERNAME`
- `VPS_HOST` (72.62.138.112)
- `VPS_SSH_KEY`
- `VPS_USER`

---

## ⚠️ Secretos que DEBES Agregar

Ve a: **GitHub Organization → Settings → Secrets and variables → Actions → New organization secret**

O si prefieres solo para este repo: **Repo → Settings → Secrets and variables → Actions → New repository secret**

### 1. NEXT_PUBLIC_SUPABASE_URL
```
https://atxldtjknfbcwnnqxkov.supabase.co
```
- **Visibilidad**: Public repositories (o específico para onturn-app)

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0eGxkdGprGZiY3dubm5xeGtvdiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM2ODYzNDY4LCJleHAiOjIwNTI0Mzk0Njh9.8ZrxvYWN6bQPaE3RLmS5dJ-kxGPCEJRUqY8c4QvnDm8
```
- **Visibilidad**: Public repositories
- ⚠️ **Reemplaza con tu key real del archivo .env.local**

### 3. NEXT_PUBLIC_VAPID_PUBLIC_KEY
```
BIxlhQZEvRSKHNZXqber4yt80BgrXKleuP9LTgeGYAUGy4q5xJFy_gnCtLu5sR9NSuTghFm40OG5oVG2Y0TAWVU
```
- **Visibilidad**: Public repositories

### 4. VAPID_PRIVATE_KEY
```
fwln1X8k7JpLSz66cZtNFYHEb-C1AcsmN5NrAKpgffQ
```
- **Visibilidad**: Public repositories
- ⚠️ **IMPORTANTE**: Esta es PRIVADA, solo para servidor

---

## 📸 Cómo Agregarlos

### Opción A: A nivel de Organización (Recomendado)

1. Ve a tu **Organización en GitHub**
2. Settings → Secrets and variables → Actions
3. Click **"New organization secret"**
4. Para cada secreto:
   - **Name**: Nombre del secreto (ej: `NEXT_PUBLIC_SUPABASE_URL`)
   - **Secret**: Valor del secreto
   - **Repository access**: 
     - "Public repositories" (si todos tus repos públicos pueden usarlo)
     - O selecciona solo "onturn-app"
5. Click **"Add secret"**

### Opción B: Solo para onturn-app

1. Ve al **repositorio onturn-app**
2. Settings → Secrets and variables → Actions
3. Click **"New repository secret"**
4. Agregar cada uno de los 4 secretos

---

## ✅ Verificar Configuración

Una vez agregados todos, deberías ver:

### Secretos de Organización:
- ✅ DOCKERHUB_TOKEN
- ✅ DOCKERHUB_USERNAME
- ✅ VPS_HOST
- ✅ VPS_SSH_KEY
- ✅ VPS_USER
- ✅ NEXT_PUBLIC_SUPABASE_URL ← **NUEVO**
- ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY ← **NUEVO**
- ✅ NEXT_PUBLIC_VAPID_PUBLIC_KEY ← **NUEVO**
- ✅ VAPID_PRIVATE_KEY ← **NUEVO**

---

## 🚀 Primer Deployment

Una vez configurados los 4 secretos nuevos:

```bash
git add .
git commit -m "feat: configurar GitHub Actions para OnTurn"
git push origin main
```

Esto disparará automáticamente:
1. Build de imagen Docker
2. Push a Docker Hub
3. Deploy a VPS 72.62.138.112
4. Restart de la app

---

## 🔍 Dónde Encontrar tus Valores Reales

### NEXT_PUBLIC_SUPABASE_ANON_KEY

En tu proyecto local:
```bash
# Windows PowerShell
Get-Content .env.local | Select-String "SUPABASE_ANON_KEY"
```

O ve a: **Supabase Dashboard → Project Settings → API → anon public**

### Verificar VAPID Keys

En tu proyecto local:
```bash
Get-Content .env.local | Select-String "VAPID"
```

Deberías ver:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY=BIxlhQZEvRS...`
- `VAPID_PRIVATE_KEY=fwln1X8k7Jp...`

---

## ⚠️ Importante

- ✅ Las keys `NEXT_PUBLIC_*` son públicas (van al cliente)
- ❌ `VAPID_PRIVATE_KEY` es PRIVADA (nunca va al cliente)
- ✅ Todos los secretos deben estar sin comillas
- ✅ Copia los valores exactos de tu `.env.local`

---

¿Listo para agregar los secretos? Una vez hecho, haz push y el deployment será automático! 🎉
