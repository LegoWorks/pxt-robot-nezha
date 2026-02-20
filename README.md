# pxt-robot-nezha

Extensión para MakeCode micro:bit que proporciona una clase Robot de alto nivel
para el kit NezhaV2 con sensor de línea Trackbit.

## Bloques disponibles

- **Configurar robot** – diámetro de rueda, distancia entre ruedas, motores
- **Avanzar** – distancia en cm con aceleración y deceleración automáticas
- **Girar** – ángulo por encoder, con 3 modos (ambas ruedas, izq, der)
- **Seguir línea** – un ciclo, para usar en bucle propio
- **Seguir línea durante X cm** – para automáticamente al recorrer la distancia
- **Seguir línea hasta cruce** – para al detectar el patrón de intersección
- **Parar**

## Uso
```typescript
robotNezha.setup(56, 120, nezhaV2.MotorPostion.M1, nezhaV2.MotorPostion.M2)
robotNezha.straight(50, 60)
robotNezha.turn(90, 40, robotNezha.TurnMode.Both)

basic.forever(function () {
    robotNezha.followLine(50, false)
})
```

## Dependencias

- [pxt-nezhaV2](https://github.com/elecfreaks/pxt-nezhaV2)
- [pxt-PlanetX_Basic](https://github.com/elecfreaks/pxt-PlanetX_Basic)

