# 💸 Cuadre Mensual

App de escritorio (Windows `.exe`) para hacer el cuadre de gastos mes a mes apenas llega el pago.

## Qué hace
- **Lo ganado en el mes**: ingreso libre.
- **Planilla**: se calcula sola al **12,5 %** del ingreso (único valor fijo).
- **Descuentos editables**: NU, Bancolombia, Rappi, Mamá, Servicios Floralia, Servicios Limonar y Ahorro.
  Puedes renombrarlos, cambiarles el ícono (clic en el emoji), borrarlos o **agregar campos nuevos**.
- **Resumen**: total de gastos, restante, restante por día según los días del mes (28/29/30/31)
  y, si es el mes en curso, cuánto queda por día desde hoy hasta fin de mes.
- **Ahorro total** (barra superior): acumulado + el ahorro del mes. Es editable en cualquier momento.
  - **Cerrar mes** consolida el ahorro del mes en el acumulado. **Reabrir mes** lo revierte.
- Navega entre meses con ◀ ▶. Un mes nuevo copia los nombres de los campos del anterior, con valores en cero.
- **Copiar resumen** deja el cuadre en el portapapeles (para WhatsApp, notas, etc.).
- Todo se guarda automáticamente en el equipo.

## Uso rápido
Descarga `CuadreMensual-1.0.0-portable.exe` y ábrelo (no requiere instalación).
Si Windows SmartScreen avisa, clic en **Más información → Ejecutar de todas formas** (el ejecutable no está firmado).

## Desarrollo
```bash
npm install
npm start          # abre la app
npm run dist       # genera dist/CuadreMensual-<version>-portable.exe
npm run dist:win   # portable + instalador NSIS (en Windows)
```
El workflow `.github/workflows/build-cuadre-mensual.yml` compila ambos `.exe` en GitHub Actions
y los deja como artefacto descargable.
