// BMP180 温度气压传感器模块
namespace BMP180 {
    let BMP180_ADDRESS = 0x77
    let CAL_AC1 = 0
    let CAL_AC2 = 0
    let CAL_AC3 = 0
    let CAL_AC4 = 0
    let CAL_AC5 = 0
    let CAL_AC6 = 0
    let CAL_B1 = 0
    let CAL_B2 = 0
    let CAL_MB = 0
    let CAL_MC = 0
    let CAL_MD = 0

    //% block="初始化BMP180 地址 %address"
    //% address.defl=0x77
    //% group="BMP180 温度气压传感器"
    export function init(address: number): void {
        BMP180_ADDRESS = address
        CAL_AC1 = readInt(BMP180_ADDRESS, 0xAA)
        CAL_AC2 = readInt(BMP180_ADDRESS, 0xAC)
        CAL_AC3 = readInt(BMP180_ADDRESS, 0xAE)
        CAL_AC4 = readUInt(BMP180_ADDRESS, 0xB0)
        CAL_AC5 = readUInt(BMP180_ADDRESS, 0xB2)
        CAL_AC6 = readUInt(BMP180_ADDRESS, 0xB4)
        CAL_B1 = readInt(BMP180_ADDRESS, 0xB6)
        CAL_B2 = readInt(BMP180_ADDRESS, 0xB8)
        CAL_MB = readInt(BMP180_ADDRESS, 0xBA)
        CAL_MC = readInt(BMP180_ADDRESS, 0xBC)
        CAL_MD = readInt(BMP180_ADDRESS, 0xBE)
    }

    //% block="读取温度(℃)"
    //% group="BMP180 温度气压传感器"
    export function readTemperature(): number {
        // 读取未校准温度
        writeByte(BMP180_ADDRESS, 0xF4, 0x2E)
        basic.pause(5)
        const UT = readUInt(BMP180_ADDRESS, 0xF6)

        // 计算真实温度
        const X1 = (UT - CAL_AC6) * CAL_AC5 / 32768
        const X2 = CAL_MC * 2048 / (X1 + CAL_MD)
        const B5 = X1 + X2
        return (B5 + 8) / 160
    }

    //% block="读取气压(hPa)"
    //% group="BMP180 温度气压传感器"
    export function readPressure(): number {
        const temperature = readTemperature()
        writeByte(BMP180_ADDRESS, 0xF4, 0x34 + (3 << 6))
        basic.pause(26)
        const UP = read24(BMP180_ADDRESS, 0xF6) >> 8

        // 气压计算
        let B6 = temperature * 160 - 160
        let X1 = (CAL_B2 * (B6 * B6 / 4096)) / 2048
        let X2 = CAL_AC2 * B6 / 2048
        let X3 = X1 + X2
        let B3 = ((CAL_AC1 * 4 + X3) * 2 + 2) / 4
        X1 = CAL_AC3 * B6 / 8192
        X2 = (CAL_B1 * (B6 * B6 / 4096)) / 65536
        X3 = (X1 + X2 + 2) / 4
        let B4 = CAL_AC4 * (X3 + 32768) / 32768
        let B7 = (UP - B3) * 50000
        let p = B7 < 0x80000000 ? (B7 * 2) / B4 : (B7 / B4) * 2
        X1 = (p / 256) * (p / 256)
        X1 = (X1 * 3038) / 65536
        X2 = (-7357 * p) / 65536
        p = p + (X1 + X2 + 3791) / 16
        return Math.round(p / 100) / 10
    }

    // 辅助函数
    function writeByte(addr: number, reg: number, value: number): void {
        const buf = pins.createBuffer(2)
        buf[0] = reg
        buf[1] = value
        pins.i2cWriteBuffer(addr, buf)
    }

    function readByte(addr: number, reg: number): number {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE)
        return pins.i2cReadNumber(addr, NumberFormat.UInt8BE)
    }

    function readInt(addr: number, reg: number): number {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE)
        return pins.i2cReadNumber(addr, NumberFormat.Int16BE)
    }

    function readUInt(addr: number, reg: number): number {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE)
        return pins.i2cReadNumber(addr, NumberFormat.UInt16BE)
    }

    function read24(addr: number, reg: number): number {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE)
        const msb = pins.i2cReadNumber(addr, NumberFormat.UInt8BE)
        const csb = pins.i2cReadNumber(addr, NumberFormat.UInt8BE)
        const lsb = pins.i2cReadNumber(addr, NumberFormat.UInt8BE)
        return (msb << 16) | (csb << 8) | lsb
    }
}

// DHT11 温湿度传感器模块
namespace DHT11 {
    let lastTemperature = 0
    let lastHumidity = 0
    let calibration = 0

    //% block="设置DHT11校准值 %offset"
    //% offset.min=-5 offset.max=5 offset.defl=0
    //% group="DHT11 温湿度传感器"
    export function setCalibration(offset: number): void {
        calibration = offset
    }

    //% block="读取温度(℃) 引脚 %pin"
    //% group="DHT11 温湿度传感器"
    export function readTemperature(pin: DigitalPin): number {
        readData(pin)
        return lastTemperature + calibration
    }

    //% block="读取湿度(%) 引脚 %pin"
    //% group="DHT11 温湿度传感器"
    export function readHumidity(pin: DigitalPin): number {
        readData(pin)
        return lastHumidity
    }

    function readData(pin: DigitalPin): void {
        // 初始化通信
        pins.digitalWritePin(pin, 0)
        basic.pause(18)
        pins.setPull(pin, PinPullMode.PullUp)
        pins.digitalReadPin(pin)
        control.waitMicros(40)
        
        // 确认传感器响应
        if (pins.digitalReadPin(pin) != 0) return
        while (pins.digitalReadPin(pin) == 0);
        while (pins.digitalReadPin(pin) == 1);
        
        // 读取40位数据
        let data = 0
        for (let i = 0; i < 40; i++) {
            while (pins.digitalReadPin(pin) == 0);
            control.waitMicros(28)
            if (pins.digitalReadPin(pin) == 1) {
                data = (data << 1) | 1
            } else {
                data = data << 1
            }
            while (pins.digitalReadPin(pin) == 1);
        }
        
        // 解析数据
        const humidity = (data >> 32) & 0xff
        const temperature = (data >> 16) & 0xff
        const checksum = (data >> 8) & 0xff
        const calcChecksum = humidity + temperature
        
        if (calcChecksum === checksum) {
            lastHumidity = humidity
            lastTemperature = temperature
        }
    }
}

// OLED 显示屏模块
namespace OLED {
    const OLED_ADDRESS = 0x3C
    const SET_CONTRAST = 0x81
    const SET_ENTIRE_ON = 0xA4
    const SET_NORM_INV = 0xA6
    const SET_DISP = 0xAE
    const SET_MEM_ADDR = 0x20
    const SET_COL_ADDR = 0x21
    const SET_PAGE_ADDR = 0x22
    const SET_DISP_START_LINE = 0x40
    const SET_SEG_REMAP = 0xA0
    const SET_MUX_RATIO = 0xA8
    const SET_COM_OUT_DIR = 0xC0
    const SET_DISP_OFFSET = 0xD3
    const SET_COM_PIN_CFG = 0xDA
    const SET_DISP_CLK_DIV = 0xD5
    const SET_PRECHARGE = 0xD9
    const SET_VCOM_DESEL = 0xDB
    const SET_CHARGE_PUMP = 0x8D
    
    let width = 128
    let height = 64
    let buffer: number[] = []
    
    //% block="初始化OLED 宽度 %w 高度 %h 地址 %addr"
    //% w.defl=128 h.defl=64 addr.defl=0x3C
    //% group="OLED 显示屏"
    export function init(w: number, h: number, addr: number): void {
        width = w
        height = h
        OLED_ADDRESS = addr
        
        // 初始化命令序列
        cmd(SET_DISP | 0x00) // 关闭显示
        cmd(SET_DISP_CLK_DIV, 0x80)
        cmd(SET_MUX_RATIO, height - 1)
        cmd(SET_DISP_OFFSET, 0x00)
        cmd(SET_DISP_START_LINE | 0x00)
        cmd(SET_CHARGE_PUMP, 0x14)
        cmd(SET_MEM_ADDR, 0x00) // 水平寻址模式
        cmd(SET_SEG_REMAP | 0x01)
        cmd(SET_COM_OUT_DIR | 0x08)
        cmd(SET_COM_PIN_CFG, height == 32 ? 0x02 : 0x12)
        cmd(SET_CONTRAST, 0x8F)
        cmd(SET_PRECHARGE, 0xF1)
        cmd(SET_VCOM_DESEL, 0x40)
        cmd(SET_ENTIRE_ON)
        cmd(SET_NORM_INV)
        cmd(SET_DISP | 0x01) // 开启显示
        
        // 清空缓冲区
        clear()
    }
    
    //% block="显示文字 行 %row 列 %col 内容 %text"
    //% row.min=0 row.max=7 col.min=0 col.max=21
    //% group="OLED 显示屏"
    export function showString(row: number, col: number, text: string): void {
        const start = row * width * 2 + col * 6
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i)
            for (let j = 0; j < 5; j++) {
                buffer[start + i * 6 + j] = font[charCode - 32][j]
            }
        }
        update()
    }
    
    //% block="显示数字 行 %row 列 %col 值 %value"
    //% row.min=0 row.max=7 col.min=0 col.max=21
    //% group="OLED 显示屏"
    export function showNumber(row: number, col: number, value: number): void {
        showString(row, col, value.toString())
    }
    
    //% block="清屏"
    //% group="OLED 显示屏"
    export function clear(): void {
        buffer = []
        for (let i = 0; i < width * height / 8; i++) {
            buffer.push(0)
        }
        update()
    }
    
    function cmd(c: number, d?: number): void {
        let buf = [0x00, c]
        if (d != undefined) buf.push(d)
        pins.i2cWriteBuffer(OLED_ADDRESS, pins.createBufferFromArray(buf))
    }
    
    function update(): void {
        cmd(SET_COL_ADDR, 0, width - 1)
        cmd(SET_PAGE_ADDR, 0, height / 8 - 1)
        
        const data = [0x40]
        for (let i = 0; i < buffer.length; i++) {
            data.push(buffer[i])
        }
        pins.i2cWriteBuffer(OLED_ADDRESS, pins.createBufferFromArray(data))
    }
    
    // 5x7 字体
    const font = [
        [0x00, 0x00, 0x00, 0x00, 0x00], // 空格
        [0x00, 0x00, 0x5F, 0x00, 0x00], // !
        // ... (其他字符定义)
        [0x08, 0x14, 0x22, 0x41, 0x00], // <
        [0x14, 0x14, 0x14, 0x14, 0x14]  // =
    ]
}

// LoRa 无线模块
namespace LoRa {
    const REG_FIFO = 0x00
    const REG_OP_MODE = 0x01
    const REG_FRF_MSB = 0x06
    const REG_FRF_MID = 0x07
    const REG_FRF_LSB = 0x08
    const REG_PA_CONFIG = 0x09
    const REG_FIFO_ADDR_PTR = 0x0D
    const REG_FIFO_TX_BASE_ADDR = 0x0E
    const REG_FIFO_RX_BASE_ADDR = 0x0F
    const REG_IRQ_FLAGS = 0x12
    const REG_RX_NB_BYTES = 0x13
    const REG_MODEM_CONFIG_1 = 0x1D
    const REG_MODEM_CONFIG_2 = 0x1E
    const REG_PREAMBLE_MSB = 0x20
    const REG_PREAMBLE_LSB = 0x21
    const REG_PAYLOAD_LENGTH = 0x22
    const REG_MODEM_CONFIG_3 = 0x26
    const REG_SYNC_WORD = 0x39
    const REG_DIO_MAPPING_1 = 0x40
    
    let loraInitialized = false
    
    //% block="初始化LoRa 频率 %freq"
    //% freq.defl=433000000
    //% group="LoRa 无线模块"
    export function init(freq: number): void {
        // 设置操作模式为睡眠
        writeRegister(REG_OP_MODE, 0x80)
        basic.pause(10)
        
        // 设置频率
        freq = Math.floor(freq / 61.035)
        writeRegister(REG_FRF_MSB, (freq >> 16) & 0xFF)
        writeRegister(REG_FRF_MID, (freq >> 8) & 0xFF)
        writeRegister(REG_FRF_LSB, freq & 0xFF)
        
        // 设置调制参数
        writeRegister(REG_MODEM_CONFIG_1, 0x72) // BW=125kHz, CR=4/5, Implicit Header
        writeRegister(REG_MODEM_CONFIG_2, 0x74) // SF=7, CRC on
        writeRegister(REG_MODEM_CONFIG_3, 0x04) // LNA gain set by register
        
        // 设置功率
        writeRegister(REG_PA_CONFIG, 0x9F) // Max power, PA_BOOST
        
        // 设置前导码长度
        writeRegister(REG_PREAMBLE_MSB, 0x00)
        writeRegister(REG_PREAMBLE_LSB, 0x08)
        
        // 设置同步字
        writeRegister(REG_SYNC_WORD, 0x34)
        
        // 设置为待机模式
        writeRegister(REG_OP_MODE, 0x81)
        basic.pause(10)
        
        loraInitialized = true
    }
    
    //% block="发送数据 %data 至地址 %address"
    //% group="LoRa 无线模块"
    export function sendData(data: string, address: number): void {
        if (!loraInitialized) return
        
        // 设置为待机模式
        writeRegister(REG_OP_MODE, 0x81)
        
        // 设置发送地址
        writeRegister(REG_FIFO_TX_BASE_ADDR, address)
        writeRegister(REG_FIFO_ADDR_PTR, address)
        
        // 写入数据
        writeRegister(REG_PAYLOAD_LENGTH, data.length + 1)
        writeRegister(REG_FIFO, 0x00) // 地址
        for (let i = 0; i < data.length; i++) {
            writeRegister(REG_FIFO, data.charCodeAt(i))
        }
        
        // 设置为发送模式
        writeRegister(REG_OP_MODE, 0x83)
        
        // 等待发送完成
        while ((readRegister(REG_IRQ_FLAGS) & 0x08) === 0);
        
        // 清除中断标志
        writeRegister(REG_IRQ_FLAGS, 0xFF)
        
        // 返回待机模式
        writeRegister(REG_OP_MODE, 0x81)
    }
    
    //% block="当收到LoRa数据时"
    //% group="LoRa 无线模块"
    export function onReceived(handler: () => void): void {
        radio.onReceivedNumber(function (receivedNumber: number) {
            handler()
        })
    }
    
    // 辅助函数
    function writeRegister(reg: number, value: number): void {
        pins.spiWrite(reg | 0x80)
        pins.spiWrite(value)
    }
    
    function readRegister(reg: number): number {
        pins.spiWrite(reg & 0x7F)
        return pins.spiWrite(0x00)
    }
}

// GPS 模块
namespace GPS {
    let latitude = 0
    let longitude = 0
    let speed = 0
    let lastUpdate = 0
    
    //% block="初始化GPS 波特率 %baud 引脚 %pin"
    //% baud.defl=9600
    //% group="GPS 模块"
    export function init(baud: number, pin: SerialPin): void {
        serial.redirect(pin, SerialPin.P0, baud)
        serial.setRxBufferSize(128)
        
        serial.onDataReceived("\n", function () {
            const data = serial.readString()
            if (data.includes("$GPRMC")) {
                parseGPRMC(data)
            }
        })
    }
    
    //% block="获取纬度"
    //% group="GPS 模块"
    export function getLatitude(): number {
        return latitude
    }
    
    //% block="获取经度"
    //% group="GPS 模块"
    export function getLongitude(): number {
        return longitude
    }
    
    //% block="获取速度(km/h)"
    //% group="GPS 模块"
    export function getSpeed(): number {
        return speed
    }
    
    function parseGPRMC(data: string): void {
        const parts = data.split(",")
        if (parts.length < 10 || parts[2] !== "A") return // 无效数据
        
        // 解析纬度
        const latDeg = parseFloat(parts[3].substr(0, 2))
        const latMin = parseFloat(parts[3].substr(2)) / 60
        latitude = latDeg + latMin
        if (parts[4] === "S") latitude = -latitude
        
        // 解析经度
        const lonDeg = parseFloat(parts[5].substr(0, 3))
        const lonMin = parseFloat(parts[5].substr(3)) / 60
        longitude = lonDeg + lonMin
        if (parts[6] === "W") longitude = -longitude
        
        // 解析速度（节转换为km/h）
        speed = parseFloat(parts[7]) * 1.852
        lastUpdate = input.runningTime()
    }
}