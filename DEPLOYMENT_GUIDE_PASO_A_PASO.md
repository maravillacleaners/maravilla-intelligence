# 🚀 GUÍA DE DEPLOYMENT - PASO A PASO DESDE CERO

**Objetivo:** Actualizar VPS con el código nuevo y que /api/avatars funcione con 100+ records

**Tiempo total:** 4-5 minutos

---

## PASO 1: VERIFICAR ACCESO SSH A VPS

### En tu terminal (PowerShell, CMD, o WSL):

```powershell
# Prueba conexión básica (sin ejecutar nada)
ssh -T root@72.61.92.220

# Si responde sin errores, ✅ SSH funciona
# Si pide contraseña, usa: iRx3dLYes0Sn0GWD26Tfubq4xlLUt8GanW0PCqUaff37978f
```

**Si no funciona SSH:**
- En PowerShell: `Get-Command ssh` (verificar que SSH está instalado)
- En Windows 10+: debería estar instalado por defecto
- Si falta: https://docs.microsoft.com/windows-server/administration/openssh/openssh_install_firstuse

---

## PASO 2: CONFIGURAR SSH (OPCIONAL - para no pedir contraseña cada vez)

Si quieres evitar ingresar contraseña cada vez:

### Windows (PowerShell):
```powershell
# Agregar contraseña a tu perfil de PowerShell
# (Este comando abre un editor)
notepad $PROFILE

# Pega esto al final del archivo:
function ssh-vps {
    $password = ConvertTo-SecureString "iRx3dLYes0Sn0GWD26Tfubq4xlLUt8GanW0PCqUaff37978f" -AsPlainText -Force
    $credential = New-Object System.Management.Automation.PSCredential("root", $password)
    ssh root@72.61.92.220 @args
}

# Guarda el archivo (Ctrl+S)
# Luego reinicia PowerShell
```

Después puedes usar: `ssh-vps "comando aquí"`

---

## PASO 3: EJECUTAR EL DEPLOYMENT

### Opción A: Comando único (Recomendado - Garantizado)

Copia y pega **EXACTAMENTE** esto en tu terminal:

```bash
ssh root@72.61.92.220 "cd /root/maravilla-intelligence && echo '📦 Pulling code...' && git pull origin master && echo '📥 Installing dependencies...' && npm install && echo '🔨 Building...' && npm run build && echo '🔄 Restarting service...' && systemctl restart intelligence && sleep 2 && echo '✅ DEPLOYMENT COMPLETE!' && systemctl status intelligence | head -10"
```

Cuando pida **contraseña**, pega:
```
iRx3dLYes0Sn0GWD26Tfubq4xlLUt8GanW0PCqUaff37978f
```

**Espera 3-4 minutos** mientras se ejecutan:
1. `git pull origin master` (descargar código nuevo)
2. `npm install` (instalar dependencias)
3. `npm run build` (compilar)
4. `systemctl restart intelligence` (reiniciar servicio)

---

## PASO 4: VERIFICAR QUE EL DEPLOYMENT FUNCIONÓ

Una vez que termina el comando anterior, ejecuta esto para **verificar**:

### Test 1: Login
```bash
curl -X POST http://72.61.92.220:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"maravilla-contractedge-admin-2026"}'
```

**Respuesta esperada:**
```json
{"ok":true,"token":"mi_eyJ0cy..."}
```

### Test 2: Avatares
```bash
# Primero, copia el token de la respuesta anterior, luego:
curl -H "Authorization: Bearer mi_eyJ0cy..." http://72.61.92.220:3002/api/avatars
```

**Respuesta esperada:**
```json
{"avatars":[100+ records]}
```

### Test 3: Avatar Map
```bash
# Abre en tu navegador:
http://72.61.92.220:3002/login
# Login: admin / maravilla-contractedge-admin-2026
# Luego ve a: /avatars
# Debe mostrar un mapa con 100+ puntos
```

---

## PASO 5: TROUBLESHOOTING (Si algo falla)

### Error: "git pull" falla
```bash
# Verificar que el repositorio está bien:
ssh root@72.61.92.220 "cd /root/maravilla-intelligence && git status"
```

### Error: "npm install" falla
```bash
# Limpiar node_modules y reinstalar:
ssh root@72.61.92.220 "cd /root/maravilla-intelligence && rm -rf node_modules package-lock.json && npm install"
```

### Error: "npm run build" falla
```bash
# Ver el error completo:
ssh root@72.61.92.220 "cd /root/maravilla-intelligence && npm run build 2>&1 | tail -50"
```

### Error: "systemctl restart" falla
```bash
# Ver status del servicio:
ssh root@72.61.92.220 "systemctl status intelligence"

# Ver logs:
ssh root@72.61.92.220 "journalctl -u intelligence -n 50"
```

---

## REFERENCIA RÁPIDA: COMANDOS ÚTILES

```bash
# Ver status del servicio
ssh root@72.61.92.220 "systemctl status intelligence"

# Ver logs en tiempo real
ssh root@72.61.92.220 "journalctl -u intelligence -f"

# Ver proceso Node
ssh root@72.61.92.220 "ps aux | grep node"

# Ver uso de memoria/CPU
ssh root@72.61.92.220 "free -h && df -h"

# Ver última versión deployada
ssh root@72.61.92.220 "cd /root/maravilla-intelligence && git log --oneline -1"
```

---

## CREDENCIALES DE REFERENCIA

| Item | Valor |
|------|-------|
| **VPS Host** | 72.61.92.220 |
| **VPS User** | root |
| **VPS Password** | iRx3dLYes0Sn0GWD26Tfubq4xlLUt8GanW0PCqUaff37978f |
| **Admin Username** | admin |
| **Admin Password** | maravilla-contractedge-admin-2026 |
| **Airtable Base** | appZhXnyFiKbnOZLr |
| **Avatars Table** | tblrIv6lKjsMeUcyU (100+ records) |

---

## ✅ CHECKLIST POST-DEPLOYMENT

Una vez completado, verifica:

```
□ Conectaste por SSH sin errores
□ El comando "git pull" completó sin errores
□ "npm install" completó sin errores
□ "npm run build" completó sin errores (toma 30-40 seg)
□ "systemctl restart intelligence" completó sin errores
□ Login devuelve token válido
□ GET /api/avatars devuelve 100+ records (no 0)
□ http://72.61.92.220:3002/avatars carga mapa Leaflet
```

---

## 🎯 RESUMEN RÁPIDO

**Lo que hace el deployment:**

1. ✅ Descarga código nuevo de GitHub
2. ✅ Instala dependencias npm
3. ✅ Compila Next.js (5,989 archivos)
4. ✅ Reinicia el servicio systemd
5. ✅ Verifica que está running

**Resultado esperado:**
- /api/avatars retorna **100+ records** (antes: 0)
- /avatars page carga **Leaflet map** (antes: 404)
- Login funciona con admin/maravilla-contractedge-admin-2026

---

**¿Necesitas que haga algo durante el deployment?**

No — todo es automático una vez que presiones Enter. Solo espera 3-4 minutos a que termine.

---

**¿Listo para empezar?**

Ejecuta el **PASO 3 (Opción A)** y reporta si:
- ✅ Termina sin errores
- ❌ Algún error (cópialo aquí)

