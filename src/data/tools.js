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
}

