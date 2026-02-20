//% color="#E63022" weight=90 icon="\uf1b9" block="Robot NezhaV2"
namespace robotNezha {

    // ── Enums para los bloques ─────────────────────────────

    export enum TurnMode {
        //% block="ambas ruedas"
        Both,
        //% block="rueda izquierda"
        Left,
        //% block="rueda derecha"
        Right
    }

    export enum CrossChannel {
        //% block="todos activos (cruce)"
        State15 = 15,
        //% block="3 sensores izquierda"
        State11 = 11,
        //% block="3 sensores derecha"
        State14 = 14,
        //% block="centrado simple"
        State1 = 1
    }

    // ── Variables internas ─────────────────────────────────

    let _mi: nezhaV2.MotorPostion = nezhaV2.MotorPostion.M1
    let _md: nezhaV2.MotorPostion = nezhaV2.MotorPostion.M2
    let _wheelDiameter: number = 56
    let _wheelDistance: number = 120
    let _perimeter: number = 0
    let _initialized: boolean = false

    function init() {
        _perimeter = _wheelDiameter * Math.PI
        nezhaV2.set_wheel_perimeter(_perimeter, nezhaV2.Uint.CM)
        nezhaV2.set_combo_motor(_mi, _md)
        _initialized = true
    }

    // ── Bloque de configuración ────────────────────────────

    /**
     * Configura el robot con las medidas de sus ruedas y los motores asignados.
     * @param diameter diámetro de la rueda en mm, eg: 56
     * @param distance distancia entre ruedas en mm, eg: 120
     * @param motorIzq motor izquierdo
     * @param motorDer motor derecho
     */
    //% block="configurar robot | diámetro rueda %diameter mm | distancia entre ruedas %distance mm | motor izquierdo %motorIzq | motor derecho %motorDer"
    //% diameter.min=10 diameter.max=300 diameter.defl=56
    //% distance.min=10 distance.max=500 distance.defl=120
    //% motorIzq.defl=nezhaV2.MotorPostion.M1
    //% motorDer.defl=nezhaV2.MotorPostion.M2
    //% weight=100
    export function setup(
        diameter: number,
        distance: number,
        motorIzq: nezhaV2.MotorPostion,
        motorDer: nezhaV2.MotorPostion
    ): void {
        _wheelDiameter = diameter
        _wheelDistance = distance
        _mi = motorIzq
        _md = motorDer
        init()
    }

    // ── Avance recto con aceleración ───────────────────────

    /**
     * Mueve el robot en línea recta una distancia con aceleración y deceleración.
     * @param distance distancia en cm (negativo = atrás), eg: 50
     * @param maxSpeed velocidad máxima (0-100), eg: 60
     */
    //% block="avanzar %distance cm a velocidad máxima %maxSpeed"
    //% distance.defl=50
    //% maxSpeed.min=0 maxSpeed.max=100 maxSpeed.defl=60
    //% weight=95
    export function straight(distance: number, maxSpeed: number): void {
        if (!_initialized) init()

        const grados = (distance / _perimeter) * 360
        maxSpeed = Math.min(100, Math.max(-100, maxSpeed))

        const minSpeed = 15
        const rampRatio = 0.3
        const accelGrados = Math.abs(grados) * rampRatio
        const decelGrados = Math.abs(grados) * rampRatio
        const direction = distance > 0 ? 1 : -1

        if (distance === 0) {
            nezhaV2.combo_stop()
            return
        }

        nezhaV2.reset_rel_angle_value(_mi)
        nezhaV2.start(_mi, minSpeed * -direction)
        nezhaV2.start(_md, minSpeed * direction)

        while (true) {
            const current = Math.abs(nezhaV2.read_rel_angle(_mi))
            const remaining = Math.abs(grados) - current

            let speed: number
            if (current <= accelGrados) {
                const t = current / accelGrados
                speed = minSpeed + (maxSpeed - minSpeed) * t
            } else if (remaining <= decelGrados) {
                const t = remaining / decelGrados
                speed = minSpeed + (maxSpeed - minSpeed) * t
            } else {
                speed = maxSpeed
            }

            speed = Math.min(maxSpeed, Math.max(minSpeed, speed))
            nezhaV2.start(_mi, speed * -direction)
            nezhaV2.start(_md, speed * direction)

            if (current >= Math.abs(grados)) break
        }

        nezhaV2.stop(_mi)
        nezhaV2.stop(_md)
    }

    // ── Giro por encoder ───────────────────────────────────

    /**
     * Gira el robot un ángulo usando los encoders.
     * @param angle ángulo en grados (positivo = derecha, negativo = izquierda), eg: 90
     * @param speed velocidad (0-100), eg: 40
     * @param mode ruedas a usar para el giro
     */
    //% block="girar %angle grados a velocidad %speed modo %mode"
    //% angle.defl=90
    //% speed.min=0 speed.max=100 speed.defl=40
    //% weight=90
    export function turn(angle: number, speed: number, mode: TurnMode): void {
        if (!_initialized) init()

        speed = Math.min(100, Math.max(0, speed))
        const direction = angle > 0 ? 1 : -1

        let gradosMotor: number
        if (mode === TurnMode.Both) {
            const arco = (Math.abs(angle) / 360) * Math.PI * _wheelDistance
            gradosMotor = (arco / _perimeter) * 360
        } else {
            const arco = (Math.abs(angle) / 360) * Math.PI * (_wheelDistance * 2)
            gradosMotor = (arco / _perimeter) * 360
        }

        nezhaV2.reset_rel_angle_value(_mi)
        nezhaV2.reset_rel_angle_value(_md)

        if (mode === TurnMode.Both) {
            nezhaV2.start(_mi, speed * -direction)
            nezhaV2.start(_md, -speed * direction)
            while (Math.abs(nezhaV2.read_rel_angle(_mi)) < gradosMotor) { }

        } else if (mode === TurnMode.Right) {
            nezhaV2.start(_mi, 0)
            nezhaV2.start(_md, -speed * direction)
            while (Math.abs(nezhaV2.read_rel_angle(_md)) < gradosMotor) { }

        } else {
            nezhaV2.start(_mi, speed * -direction)
            nezhaV2.start(_md, 0)
            while (Math.abs(nezhaV2.read_rel_angle(_mi)) < gradosMotor) { }
        }

        nezhaV2.stop(_mi)
        nezhaV2.stop(_md)
    }

    // ── Seguir línea (un ciclo) ────────────────────────────

    /**
     * Ejecuta un ciclo de seguimiento de línea. Llámalo dentro de un bucle.
     * @param baseSpeed velocidad base (0-100), eg: 50
     * @param stopOnLost si es verdadero, para al perder la línea
     */
    //% block="seguir línea velocidad %baseSpeed parar si se pierde %stopOnLost"
    //% baseSpeed.min=0 baseSpeed.max=100 baseSpeed.defl=50
    //% stopOnLost.defl=false
    //% weight=85
    export function followLine(baseSpeed: number, stopOnLost: boolean): void {
        if (!_initialized) init()

        PlanetX_Basic.Trackbit_get_state_value()

        if (PlanetX_Basic.trackbit_state(PlanetX_Basic.TrackbitStateType.TRACKING_STATE_1)) {
            nezhaV2.start(_mi, -baseSpeed)
            nezhaV2.start(_md, baseSpeed)
        } else if (
            PlanetX_Basic.trackbit_state(PlanetX_Basic.TrackbitStateType.TRACKING_STATE_3) ||
            PlanetX_Basic.trackbit_state(PlanetX_Basic.TrackbitStateType.TRACKING_STATE_11)
        ) {
            nezhaV2.start(_mi, -Math.floor(baseSpeed * 0.1))
            nezhaV2.start(_md, baseSpeed)
        } else if (PlanetX_Basic.trackbit_state(PlanetX_Basic.TrackbitStateType.TRACKING_STATE_8)) {
            nezhaV2.start(_mi, 0)
            nezhaV2.start(_md, baseSpeed)
        } else if (
            PlanetX_Basic.trackbit_state(PlanetX_Basic.TrackbitStateType.TRACKING_STATE_2) ||
            PlanetX_Basic.trackbit_state(PlanetX_Basic.TrackbitStateType.TRACKING_STATE_14)
        ) {
            nezhaV2.start(_mi, -baseSpeed)
            nezhaV2.start(_md, Math.floor(baseSpeed * 0.1))
        } else if (PlanetX_Basic.trackbit_state(PlanetX_Basic.TrackbitStateType.TRACKING_STATE_12)) {
            nezhaV2.start(_mi, -baseSpeed)
            nezhaV2.start(_md, 0)
        } else {
            if (stopOnLost) {
                nezhaV2.stop(_mi)
                nezhaV2.stop(_md)
            }
        }
    }

    // ── Seguir línea durante una distancia ─────────────────

    /**
     * Sigue la línea hasta recorrer la distancia indicada.
     * @param distance distancia en cm, eg: 50
     * @param baseSpeed velocidad base (0-100), eg: 50
     */
    //% block="seguir línea durante %distance cm a velocidad %baseSpeed"
    //% distance.defl=50
    //% baseSpeed.min=0 baseSpeed.max=100 baseSpeed.defl=50
    //% weight=84
    export function followLineDistance(distance: number, baseSpeed: number): void {
        if (!_initialized) init()

        const grados = (distance / _perimeter) * 360
        nezhaV2.reset_rel_angle_value(_mi)

        while (Math.abs(nezhaV2.read_rel_angle(_mi)) < grados) {
            followLine(baseSpeed, false)
        }

        nezhaV2.stop(_mi)
        nezhaV2.stop(_md)
    }

    // ── Seguir línea hasta detectar un cruce ───────────────

    /**
     * Sigue la línea hasta que el sensor detecte el patrón de cruce indicado.
     * @param baseSpeed velocidad base (0-100), eg: 50
     * @param channel patrón del sensor que indica el cruce
     */
    //% block="seguir línea hasta cruce | velocidad %baseSpeed | patrón de cruce %channel"
    //% baseSpeed.min=0 baseSpeed.max=100 baseSpeed.defl=50
    //% weight=83
    export function followLineUntilCross(baseSpeed: number, channel: CrossChannel): void {
        if (!_initialized) init()

        // Mapeo del enum al TrackbitStateType correspondiente
        const stateMap: { [key: number]: PlanetX_Basic.TrackbitStateType } = {
            1: PlanetX_Basic.TrackbitStateType.TRACKING_STATE_1,
            11: PlanetX_Basic.TrackbitStateType.TRACKING_STATE_11,
            14: PlanetX_Basic.TrackbitStateType.TRACKING_STATE_14,
            15: PlanetX_Basic.TrackbitStateType.TRACKING_STATE_15
        }

        const targetState = stateMap[channel]

        PlanetX_Basic.Trackbit_get_state_value()
        while (!PlanetX_Basic.trackbit_state(targetState)) {
            followLine(baseSpeed, false)
            PlanetX_Basic.Trackbit_get_state_value()
        }

        nezhaV2.stop(_mi)
        nezhaV2.stop(_md)
    }

    // ── Parar ──────────────────────────────────────────────

    /**
     * Para los dos motores.
     */
    //% block="parar motores"
    //% weight=70
    export function stop(): void {
        nezhaV2.stop(_mi)
        nezhaV2.stop(_md)
    }
}
