export default class Painting {
    /**
     * 绘制椭圆函数
        使用三次贝塞尔曲线模拟椭圆2
     * @param 
     * @returns void
     */
    static drawEllipseFunc(canvas, x, y, a, b, rectFillColorString, rectWidthNumber, rectStrokeColorString) {
        let ctx = canvas
        let k = .5522848,
        ox = a * k, // 水平控制点偏移量
        oy = b * k; // 垂直控制点偏移量

        ctx.beginPath();
        ctx.lineWidth = rectWidthNumber;
        ctx.strokeStyle = rectStrokeColorString;
        //从椭圆的左端点开始顺时针绘制四条三次贝塞尔曲线
        ctx.moveTo(x - a, y);
        ctx.bezierCurveTo(x - a, y - oy, x - ox, y - b, x, y - b);
        ctx.bezierCurveTo(x + ox, y - b, x + a, y - oy, x + a, y);
        ctx.bezierCurveTo(x + a, y + oy, x + ox, y + b, x, y + b);
        ctx.bezierCurveTo(x - ox, y + b, x - a, y + oy, x - a, y);
        ctx.closePath();
        ctx.stroke();
    }
    /**
     * 绘制矩形函数
     * @param 
     * @returns void
     */
    static drawRectFunc(canvas, x0, y0, x1, y1, rectFillColorString, rectWidthNumber, rectStrokeColorString){
        let ctx = canvas
        let point_0_size = Math.sqrt(x0*x0 + y0*y0)
        let point_1_size = Math.sqrt(x1*x1 + y1*y1)
        let width = Math.round(Math.abs(x1 - x0))
        let height = Math.round(Math.abs(y1 - y0))
          // ctx.strokeStyle = _this.lineColorString
          // 正向画与逆向画
        let x, y
        if (point_1_size > point_0_size) {
            x = x0, y = y0
        } else {
            x = x1, y = y1
        }
        x = x + 0.5
        y = y + 0.5
        ctx.beginPath();
          // ctx.fillStyle = rectFillColorString;
        ctx.lineWidth = rectWidthNumber;
        ctx.strokeStyle = rectStrokeColorString;
        ctx.rect(x, y, width, height)
        ctx.closePath();
        ctx.stroke()
    }
    /**
     * 绘制标记圆函数
     * @param 
     * @returns void
     */
    static drawArcFunc(canvas, x, y, r, arcColorString, arcWidthNumber, arcStrokeColorString){
        let ctx = canvas  
        ctx.beginPath();
        ctx.fillStyle = arcColorString;
        ctx.lineWidth = arcWidthNumber;
        ctx.strokeStyle = arcStrokeColorString;
        ctx.arc(x, y, r, 0, 2*Math.PI);  
        ctx.closePath();
        ctx.stroke()
        ctx.fill()
    }
    /**
     * 绘制线函数
     * @param 
     * @returns void
     */
    static drawPointLineFunc (canvas, pointDataArray, lineColorString, lineWidthNumber) {
        let ctx = canvas 
        ctx.beginPath();
        pointDataArray.forEach((item, index)=>{
            if (index === 0) {
              ctx.moveTo(item.x, item.y)
            } else {
              ctx.lineTo(item.x, item.y)
            }
        })
        ctx.strokeStyle = lineColorString;
        ctx.lineWidth = lineWidthNumber;
        ctx.closePath();
        ctx.stroke()
    }
    /**
     * 计算多边形中心点坐标
     * @param 
        pointDataArray {array}
        compareVal {function}         
     * @returns {object:
        center_x{number},
        center_y{number}
        }
     */
    static calcCenterInPolygon(pointDataArray, func){
        let x_value_arr = [], y_value_arr = []
        pointDataArray.forEach((item, index) => {
            x_value_arr.push(item.x)
            y_value_arr.push(item.y)
        })
        let x_obj = func(x_value_arr)
        let y_obj = func(y_value_arr)
        let center_x = Math.abs(parseInt((x_obj.max + x_obj.min) / 2))
        let center_y = Math.abs(parseInt((y_obj.max + y_obj.min) / 2))
        return {center_x, center_y}
    }
    /**
     * 检查两点是否过近
     * @param
     * @returns {Boolean}
     */
    static checkPointAndPointIsNearFunc (x, y, p_x, p_y, standand) {
        if (!p_x || !p_y) {
            return false
        }
        let across = Math.abs(x - p_x)
        let release = Math.abs(y - p_y)
        let distance = Math.sqrt(across*across + release*release)
        if (distance < standand) {
            return true
        } else {
            return false
        }
    }
    /**
     * 计算两点距离公共方法
     * @param x0 y0 鼠标此时的坐标 x1 y1 参照点的坐标
     * @returns {Boolean}
     */
    static calcPointDistanceFunc(x0, y0, x1, y1){
        if (x1 === -999999 || y1 === -999999) {
            return 999999
        }
        let hori = x1 - x0    // 横向距离
        let vert = y1 - y0    // 纵向距离
        return Math.sqrt(hori*hori + vert*vert)
    }
}

