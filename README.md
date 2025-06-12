# Micro:bit 环境监测套件扩展包

本扩展包为Micro:bit提供以下传感器支持：
- BMP180 温度气压传感器
- DHT11 温湿度传感器
- 0.96寸OLED显示屏
- LoRa SX1268 无线模块
- GPS模块

## 安装方法

1. 下载整个扩展包（包含pxt.json、main.ts、README.md）
2. 打开 [MakeCode编辑器](https://makecode.microbit.org/)
3. 点击"扩展" → "导入文件" → 选择下载的扩展包文件夹
4. 扩展加载完成后，即可在积木菜单中看到新的分类

## 使用示例

### 气象站示例
```blocks
// 初始化传感器
BMP180.初始化BMP180 地址 0x77
OLED.初始化OLED 宽度 128 高度 64 地址 0x3C
LoRa.初始化LoRa 频率 433000000

basic.forever(function () {
    // 读取传感器数据
    const temp = BMP180.读取温度(℃)
    const pressure = BMP180.读取气压(hPa)
    const humidity = DHT11.读取湿度(%) 引脚 DigitalPin.P0
    
    // OLED显示
    OLED.显示文字(0, 0, "温度: " + temp + "C")
    OLED.显示文字(1, 0, "气压: " + pressure + "hPa")
    OLED.显示文字(2, 0, "湿度: " + humidity + "%")
    
    // LoRa发送数据
    LoRa.发送数据("T:" + temp + "P:" + pressure + "H:" + humidity, 0x01)
    
    basic.pause(5000)
})
```

### GPS定位示例
```blocks
// 初始化GPS
GPS.初始化GPS 波特率 9600 引脚 SerialPin.P1

basic.forever(function () {
    const lat = GPS.获取纬度()
    const lon = GPS.获取经度()
    const spd = GPS.获取速度(km/h)
    
    OLED.显示文字(0, 0, "纬度: " + lat)
    OLED.显示文字(1, 0, "经度: " + lon)
    OLED.显示文字(2, 0, "速度: " + spd + "km/h")
    
    basic.pause(1000)
})
```

## 引脚连接参考

| 传感器        | Micro:bit引脚 |
|--------------|---------------|
| BMP180       | I2C (SDA, SCL)|
| DHT11        | P0            |
| OLED         | I2C (SDA, SCL)|
| LoRa SX1268  | SPI (MOSI, MISO, SCK) |
| GPS          | P1 (串口RX)   |

## 技术支持
如有问题请联系：techsupport@school.edu