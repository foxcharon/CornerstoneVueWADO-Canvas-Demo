export default class myUtils {
    /**
     * 判断字符串是否为空
     * @param str
     * @returns {boolean}
     */
    static isNull(str) {
        return str == null || str.length === 0 || str === '';
    }

    /**
     *
     * @desc  判断是否为身份证号
     * @param  {String|Number} str
     * @return {Boolean}
     */
    static isIdCard(str) {
        return /^(^[1-9]\d{7}((0\d)|(1[0-2]))(([0|1|2]\d)|3[0-1])\d{3}$)|(^[1-9]\d{5}[1-9]\d{3}((0\d)|(1[0-2]))(([0|1|2]\d)|3[0-1])((\d{4})|\d{3}[Xx])$)$/.test(str)
    }

    /**
     *
     * @desc   判断是否为手机号
     * @param  {String|Number} str
     * @return {Boolean}
     */
    static isPhoneNum(str) {
        return /^(0|86|17951)?(1[3-9][0-9])[0-9]{8}$/.test(str)
    }

    /**
     *
     * @desc   生成随机字符串
     * @param  {String|Number} len
     * @return {string}
     */
    static randomString(len) {
    　　len = len || 32;
    　　var $chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';    /****默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1****/
    　　var maxPos = $chars.length;
    　　var pwd = '';
    　　for (let i = 0; i < len; i++) {
    　　　　pwd += $chars.charAt(Math.floor(Math.random() * maxPos));
    　　}
　　    return pwd;
    }

    /**
     *
     * @desc   求数组最大值最小值
     * @param  {Array(Object)} arr
     * @return {Object:
        Object.max,
        Object.min}
     */
    static compareVal(arr){
        // console.log(arr)
        if(arr instanceof Array){
　　　　　　 var min = arr[0]; 
　　　　　　 var max = arr[0];
            var min_index = 0
            var max_index = 0
　　　　　　 for(var i = 0; i < arr.length; i++){
　　　　　　     var cur = arr[i];
　　　　　　     // cur > max ? max = cur : null;
　　　　　　     // cur < min ? min = cur : null;
                if (cur > max) {
                    max = cur
                    max_index = i
                }
                if (cur < min) {
                    min = cur
                    min_index = i
                }
　　　　　　 }
// 　　　　　console.log("min= " +min+ ",max = " +max);  // min=1 ,max = 33
            return {
                max:max,
                min:min,
                max_index:max_index,
                min_index:min_index
            }
　　    }
    }
    /**
     *
     * @desc   递归法 对象深拷贝
     * @param  {Object}
     * @return {new Object}
     */
    static objectCopy (obj) {
        var newobj = obj.constructor === Array ? [] : {};
        if(typeof obj !== 'object'){
            return;
        }
        for(var i in obj){
           newobj[i] = (typeof obj[i] === 'object' && !(obj[i] === null)) ?
           this.objectCopy(obj[i]) : obj[i];
        }
        return newobj
    }
    /**
     *
     * @desc   监听滚轮事件 公共方法
     * @param  {BOMObject} window document
     * @return null
     */
    static scrollCommonFunction(window,document) {

        var prefix = "", _addEventListener, onwheel, support;

        // detect event model
        if ( window.addEventListener ) {
            _addEventListener = "addEventListener";
        } else {
            _addEventListener = "attachEvent";
            prefix = "on";
        }

        // detect available wheel event
        support = "onwheel" in document.createElement("div") ? "wheel" : // 各个厂商的高版本浏览器都支持"wheel"
                  document.onmousewheel !== undefined ? "mousewheel" : // Webkit 和 IE一定支持"mousewheel"
                  "DOMMouseScroll"; // 低版本firefox

        window.addWheelListener = function( elem, callback, useCapture ) {
            _addWheelListener( elem, support, callback, useCapture );

            // handle MozMousePixelScroll in older Firefox
            if( support == "DOMMouseScroll" ) {
                _addWheelListener( elem, "MozMousePixelScroll", callback, useCapture );
            }
        };

        function _addWheelListener( elem, eventName, callback, useCapture ) {
            elem[ _addEventListener ]( prefix + eventName, support == "wheel" ? callback : function( originalEvent ) {
                !originalEvent && ( originalEvent = window.event );

                // create a normalized event object
                var event = {
                    // keep a ref to the original event object
                    originalEvent: originalEvent,
                    target: originalEvent.target || originalEvent.srcElement,
                    type: "wheel",
                    deltaMode: originalEvent.type == "MozMousePixelScroll" ? 0 : 1,
                    deltaX: 0,
                    deltaZ: 0,
                    preventDefault: function() {
                        originalEvent.preventDefault ?
                            originalEvent.preventDefault() :
                            originalEvent.returnValue = false;
                    }
                };
                
                // calculate deltaY (and deltaX) according to the event
                if ( support == "mousewheel" ) {
                    event.deltaY = - 1/40 * originalEvent.wheelDelta;
                    // Webkit also support wheelDeltaX
                    originalEvent.wheelDeltaX && ( event.deltaX = - 1/40 * originalEvent.wheelDeltaX );
                } else {
                    event.deltaY = originalEvent.detail;
                }

                // it's time to fire the callback
                return callback( event );

            }, useCapture || false );
        }

    }
    /**
     *
     * @desc   检查想删除的点是不是中心点
     * @param  item, index, x, y, judge_number, func
     * @return {Boolean}
     */
    static centerPointDeleteFunc (item, index, x, y, judge_number, func) {
        // 如果多边形没画完，就不存在中心点
        if (!item.completed || !item.centerPointObject) {
            return false
        }
        const center_x = item.centerPointObject.center_x, 
            center_y = item.centerPointObject.center_y;
        // 横向距离  纵向距离
        let distance = func(x, y, center_x, center_y)
        if (distance < judge_number) {
            return true
        } else {
            return false
        }
    }
    /**
     *
     * @desc   如果此时所有多边形都不处于移动和拉伸状态
     * @param  {Array} canvasMarkDataArray
     * @return {Boolean}
     */
    static allPolygonLateAndFormCheckFunc(mark_array){
        let result = true
        mark_array.forEach((item, index, this_arr) => {
            item.translateable ? result = false : ''
            item.transformable ? result = false : ''
        })
        return result
    }
    /**
     *
     * @desc   检查XY是否在合法范围内
     * @param  {Number} x, y, x_max_stand, y_max_stand
     * @return {Object} {x1: x, y1: y, x_max_stand:x_max_stand, y_max_stand:y_max_stand}
     */
    static checkXYCurrentFunc(x, y, x_max_stand, y_max_stand){
        if (x < 0) {
            x = 0
        }
        if (y < 0) {
            y = 0
        }
        if (x > x_max_stand) {
            x = x_max_stand
        }
        if (y > y_max_stand) {
            y = y_max_stand
        }
        return {x1: x, y1: y, x_max_stand:x_max_stand, y_max_stand:y_max_stand}
    }
    /**
     *
     * @desc   计算原型坐标和现坐标的偏差值
     * @param  {Object} prototypeXYCoordinateObject, scrollViewCoorObject, viewXYCoordinateObject
     * @return {Object} {x:scroll.x - prototype.x, y:scroll.y - prototype.y}
     */
    static calcSubAboutPrototypeAndNowCoorFunc(prototype, scroll, view){
        view.x = scroll.x - prototype.x
        view.y = scroll.y - prototype.y
        return {
            x:scroll.x - prototype.x,
            y:scroll.y - prototype.y
        }
    }
    /**
     *
     * @desc   计算原型坐标
     * @param  {Number} w, h, zoom {Object} prototypeXYCoordinateObject
     * @return void
     */
    static calcPrototypeXYCoordinateObjectFunc(w, h, zoom, prototype){
        let now_w = parseInt(w / zoom),
        now_h = parseInt(h / zoom);
        prototype.x = parseInt((w - now_w) / 2)
        prototype.y = parseInt((h - now_h) / 2)
    }
    /**
     *
     * @desc   滚轮用 计算dataModel
     * @param  {Object} coor, scrollViewCoorObject {Number} zoom
     * @return {Object} {x:scrollViewCoorObject.x + parseInt(coor.x / zoom), y:scrollViewCoorObject.y + parseInt(coor.y / zoom)}
     */
    static getDataModelValueInScroll(coor, scrollViewCoorObject, zoom){
        if (zoom === 1) {
            return coor
        } else {
            return {
              x:scrollViewCoorObject.x + parseInt(coor.x / zoom),
              y:scrollViewCoorObject.y + parseInt(coor.y / zoom)
            }
        }
    }
    /**
     *
     * @desc   directionMemoryObject 修正
     * @param  {Object} directionMemoryObject, range_obj
     * @return {Object} directionMemoryObject
     */
    static directionMemoryObjectRangeCheckFunc(directionMemoryObject, range_obj){
        directionMemoryObject.x < range_obj.x[0] ? directionMemoryObject.x = parseInt(range_obj.x[0]) : ''
        directionMemoryObject.y < range_obj.y[0] ? directionMemoryObject.y = parseInt(range_obj.y[0]) : ''
        directionMemoryObject.x > range_obj.x[1] ? directionMemoryObject.x = parseInt(range_obj.x[1]) : ''
        directionMemoryObject.y > range_obj.y[1] ? directionMemoryObject.y = parseInt(range_obj.y[1]) : ''
        return directionMemoryObject
    }
    /**
     *
     * @desc   计算方向键公共值
     * @param  {event Object} event {Number} directionStandandValueNumber
     * @return {Number} directionMemoryObject | 1
     */
    static directionCommonValueFunc(event, directionStandandValueNumber){
        if (event.keyCode) {
            if (event.shiftKey) {
              return 1
            } else {
              return directionStandandValueNumber
            }
        } else {
            return directionStandandValueNumber
        }
    }
    /**
     *
     * @desc   update uint8array
     * @param  {uint8array} c d
     * @return void
     */
    static updateArrayValue(c, d){
        d.forEach((item, index)=>{
            c[index] = item
        })
    }
    /**
     *
     * @desc   检验中心点是否在第三象限
     * @param  {Object} canvasMarkDataObject
     * @return {Boolean}
     */
    static checkCenterPointInQuadrantFunc(item){
        const center = item.centerPointObject
        const check = (coor) => coor < 0 ? true : false
        if (center === null) {
            return false
        }
        if (check(center.center_x) || check(center.center_y)) {
            return true
        } else {
            return false
        }
    }
}

