// 测试代码 - 用于验证各模块功能
namespace tests {
    // 测试BMP180
    function testBMP180() {
        BMP180.init(0x77)
        const temp = BMP180.readTemperature()
        const pressure = BMP180.readPressure()
        serial.writeLine("BMP180测试: 温度=" + temp + "C, 气压=" + pressure + "hPa")
    }
    
    // 测试DHT11
    function testDHT11() {
        const temp = DHT11.readTemperature(DigitalPin.P0)
        const humidity = DHT11.readHumidity(DigitalPin.P0)
        serial.writeLine("DHT11测试: 温度=" + temp + "C, 湿度=" + humidity + "%")
    }
    
    // 测试OLED
    function testOLED() {
        OLED.init(128, 64, 0x3C)
        OLED.showString(0, 0, "OLED测试")
        OLED.showNumber(1, 0, 12345)
        serial.writeLine("OLED测试: 应显示文字和数字")
    }
    
    // 运行所有测试
    export function runAll() {
        testBMP180()
        testDHT11()
        testOLED()
        serial.writeLine("所有测试完成")
    }
}