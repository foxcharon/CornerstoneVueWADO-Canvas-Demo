<template>
  <div>
    <div class="image-canvas-wrapper"  oncontextmenu="return false" unselectable='on' onselectstart='return false;'
      onmousedown='return false;'>
      <!-- DICOM CANVAS -->
        <span id="loadProgress">Diocm加载: </span>
        <!-- <div> -->
          <div ref="canvas" class="image-canvas" oncontextmenu="return false" tabindex="-1"></div>
        <!-- </div> -->
    </div>

    <!-- fixed div -->
    <div class="fixed">
      <select v-model="selectValueString">
        <option value="0">无</option>
        <option value="1">多边形</option>
        <option value="2">矩形</option>
        <option value="3">椭圆</option>
      </select>
      <div>
        <p>图片放大缩小</p>
        <button @click="zoomPlusFunc"> + </button> <button @click="zoomSubFunc"> - </button>
        <p>移动单位<count @changeCount="changeCountFunc($event)" :count="directionStandandValueNumber"/></p>
        <p>图片位置控制</p>
        <div class="direction-control">
          <div></div>
          <div @click="directionTopFunc"></div>
          <div></div>
          <div @click="directionLeftFunc"></div>
          <div></div>
          <div @click="directionRightFunc"></div>
          <div></div>
          <div @click="directionBottomFunc"></div>
          <div></div>          
        </div>
      </div>
      <!-- <ul v-if="canvasMarkDataArray[0]">
        <p>数组最新对象的连接点坐标数值</p>
        <li v-for="(item,index) in canvasMarkDataArray[ canvasMarkDataArray.length-1 ].pointDataArray">
          {{ item.x + "-" + item.y }}
        </li>
      </ul> -->
      <button @click="submitTestFunc">selectValueString</button>
      <button @click="clearAllDataFunc">clear</button>
      <button @click="moveTestFunc">move</button>
      <p>颜色滤镜</p>
      <select v-model="selectColorFilterString">
        <option value="0">正常</option>
        <option value="1">反色</option>
        <option value="2">火红</option>
        <option value="3">彩虹色</option>
      </select>
      <div>
        <p>此时视图素材宽高：{{ canvasSizeObject ? canvasSizeObject.width : ""}} {{ canvasSizeObject ? canvasSizeObject.height : "" }}</p>
        <p>此时放大级别：{{ zoomNumberArray[zoomIndexNumber] + "(" + zoomIndexNumber + ")"}}</p>
      </div>
    </div>

    <!-- 隐藏的canvas 放大缩小时需要用到 start -->
    <canvas id="hide-canvas" style="display:none"></canvas>
    <!-- end -->
  </div>

</template>

<script>

//引入 cornerstone,dicomParser,cornerstoneWADOImageLoader
import * as cornerstone from "cornerstone-core";
// import * as dicomParser from "dicom-parser";

// 不建议 npm 安装 cornerstoneWADOImageLoader 如果你做了 会很头疼
import * as cornerstoneWADOImageLoader from "../../static/dist/cornerstoneWADOImageLoader.js";

// Cornerstone 工具外部依赖
import Hammer from "hammerjs";
import * as cornerstoneMath from "cornerstone-math";
import * as cornerstoneTools from "cornerstone-tools";

// Specify external dependencies
cornerstoneTools.external.Hammer = Hammer;
cornerstoneTools.external.cornerstone = cornerstone;
cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
cornerstoneWADOImageLoader.external.cornerstoneMath = cornerstoneMath;

//指定要注册加载程序的基石实例
cornerstoneWADOImageLoader.external.cornerstone = cornerstone;

cornerstone.registerImageLoader("http", cornerstoneWADOImageLoader.loadImage);
cornerstone.registerImageLoader("https", cornerstoneWADOImageLoader.loadImage);

//配置 webWorker (必须配置)
//注意这里的路径问题  如果路径不对 cornerstoneWADOImageLoaderWebWorker 会报错 index.html Uncaught SyntaxError: Unexpected token <
// 这个是 dev 环境的路径，如果在 production 环境项目不在服务器根目录，会找不到文件
var config = {
  webWorkerPath: "/static/dist/cornerstoneWADOImageLoaderWebWorker.js",
  taskConfiguration: {
    decodeTask: {
      codecsPath: "/static/dist/cornerstoneWADOImageLoaderCodecs.js"
    }
  }
};
// 这个是 production 环境的路径，请根据具体情况进行设置
// const path = require('path')
// var config = {
//   webWorkerPath: path.resolve('cornerstone-demo') + "/static/dist/cornerstoneWADOImageLoaderWebWorker.js",
//   taskConfiguration: {
//     decodeTask: {
//       codecsPath: path.resolve('cornerstone-demo') + "/static/dist/cornerstoneWADOImageLoaderCodecs.js"
//     }
//   }
// };
cornerstoneWADOImageLoader.webWorkerManager.initialize(config);
var _this = null

// 组件
import count from "./count";
export default {
  name: "HelloWorld",
  data() {
    return {
      baseUrl: "",
      exampleStudyImageIds: [
        'http://localhost/bbmri-53323851.dcm',
        // 'http://localhost/bbmri-53323707.dcm',
        // 'http://localhost/bbmri-53323851.dcm',
        // 'http://localhost/bbmri-53323707.dcm'
      ],
      isInitLoad: true,
      isShow: true,
      // EDIT ===>>> 20190109
      canvasObject:null,    // CanvasRenderingContext2D
      canvasOriginDataObject:null,   // CanvasRenderingContext2D-imgdata-origin 带滤镜
      canvasOriginFilterDataObject:null,   // CanvasRenderingContext2D-imgdata-origin 不带滤镜
      canvasOriginNormalDataObject:null,   // CanvasRenderingContext2D-imgdata-origin 未使用
      canvasOriginZoomDataObject:null,   // CanvasRenderingContext2D-imgdata-with-zoom-origin
      canvasMarkDataArray:[],    // 记录canvas标注数据的数组 视图模型
      anotherCanvasMarkDataArray:[],    // 记录canvas标注数据的数组 数据模型
      selectValueString:"0",    // 选择模式
      selectColorFilterString:"0",    // 选择滤镜 0 为正常
      isPointingBoolean:false,    // 是否正在绘制
      sqrtStandandNumber:10,  // 过近点计算标准值
      minPointNumNumber:3,  // 最少要几个点
      lineColorString:"red",    // 线的颜色
      arcColorString:"red",    // 圆的颜色
      arcMouseNearColorString:"yellow",    // 鼠标在附近时多边形连接点的圆的填充颜色
      centerArcMouseNearColorString:"yellow",    // 鼠标在附近时中心点的圆的填充颜色
      arcStrokeColorString:"#000",    // 圆的描边颜色
      centerArcStrokeColorString:"#fff",    // 中心点的圆的描边颜色
      arcRNumber:4,    // 圆半径
      lineWidthNumber:1,  // 直线线宽
      arcWidthNumber:2,    // 圆线宽
      isCanCopyOriginCanvasDataBoolean:true,    // 是否可以记录canvas原数据
      centerPointHoverJudgeNumber: Math.sqrt(20*20+20*20),     // 是否接近中心点判定值
      polygonPointHoverJudgeNumber: Math.sqrt(10*10+10*10),     // 是否接近多边形连接点判定值
      isPaintedBoolean:false,    // 是否已经完成过绘制
      canTranslatePolygonIndex:-1,    // 此时有鼠标处于几号多边形的中心点附近
      isMouseCanTranslatePolygonBoolean:false,    // true 此时有鼠标处于某个多边形的中心点附近
      isMouseTranslatingPolygonBoolean:false,    // true 此时正在拖动某个多边形，依赖上一个变量
      polygonMovingMouseStartedCoordinateObject:null,    // 鼠标移动多边形 前一次的坐标
      polygonMovingMouseContinueCoordinateObject:null,    // 鼠标移动多边形 现在的坐标
      isMouseCanTransformPolygonBoolean:false,    // true 此时有鼠标处于某个多边形的连接点附近
      isMouseTransformingPolygonBoolean:false,    // true 此时正在拉伸某个多边形，依赖上一个变量
      polygonTransformingMouseStartedCoordinateObject:null,    // 鼠标拉伸多边形 前一次的坐标
      polygonTransformingMouseContinueCoordinateObject:null,    // 鼠标拉伸多边形 现在的坐标
      canvasSizeObject:null,    // 记录现canvas大小的对象 可变
      canvasOriginSizeObject:null,    // 记录原canvas大小的对象 不变
      polygonLatingAndFormingIsDisconnectedBoolean:false,    // 鼠标拖动或拉伸多边形时与多边形失去连接
      isRectPaintingBoolean:false,    // 是否正在绘制矩形
      isEllipsePaintingBoolean:false,    // 是否正在绘制椭圆
      zoomNumberArray:[1, 2, 3, 4, 5],    // 放大倍数数组
      zoomIndexNumber:0,    // 此时处于哪个放大倍数
      directionMemoryObject:{
        x:0,
        y:0
      },    // 记忆点过的方向键的对象
      viewXYCoordinateObject:{
        x:0,
        y:0
      },    // 此时源图视窗起始点（左上角）的XY坐标值 - XY坐标原型值
      prototypeXYCoordinateObject:{
        x:0,
        y:0
      },    // XY坐标原型值（如果没有点任何方向键，此时XY坐标值是多少）
      displayCenterXYCoordinateObject:{
        x:0,
        y:0
      },    // 视图的中心点的坐标
      scrollViewCoorObject:{
        x:0,
        y:0
      },   // 此时源图视窗起始点（左上角）的XY坐标值
      buttonViewCoorObject:{
        x:0,
        y:0
      },   // 此时源图视窗起始点（左上角）的XY坐标值
      scrollPXYcObject:null,    // 滚轮用 暂时废弃
      scrollBaseObject:{
        deltaY:0,
        offsetX:0,
        offsetY:0
      },
      scrollBaseBoolean:true,   // 滚轮是否生效，防止事件叠加导致计算错误
      mouseMiddleStatusBoolean:false,   // 此时是否在按鼠标中键
      mouseMiddleMoveStartCoorObject:null,
      mouseMiddleMoveEndCoorObject:null,
      moveImageCanvasFuncRuningStatusBoolean:false,
      directionStandandValueNumber:10,    // 点1下移动几个像素
      keyEventBaseBoolean:true,    // 键盘是否生效
      keyEventObject:null,    // 键盘事件对象
      colorFilterWord:'normal',
      colorFilterDataArray:[]   // 存各种颜色滤镜的数组
      // EDIT END
    };
  },
  methods: {
    show() {
      const _this = this;
      if (this.isShow === true) {
        this.isShow = false;
        // this.$http
        //   .get("http://10.0.0.5:90/DoctorService/Service.asmx/CS_Dicom")
          // .then(function(res) {
            // console.log("res:", res);

            // let Image = res.body.value;
            // console.log("res.body.value:", res.body.value);

            // _this.baseUrl = res.body.value.filmain;
            // console.log("res.body.value.filmain:", res.body.value.filmain);

            // _this.exampleStudyImageIds = res.body.value.testDate.testDate1;
            // console.log(
            //   "res.body.value.testDate.testDate1:",
            //   res.body.value.filmain
            // );
            
            // 找到要渲染的元素
            let canvas = this.$refs.canvas;
            // console.log(canvas);
            // 在 DOM 中将 canvas 元素注册到 cornerstone
            cornerstone.enable(canvas);
            // 拼接 url : cornerstoneWADOImageLoader 需要 wadouri 路径头
            const imageUrl = _this.baseUrl + _this.exampleStudyImageIds[0];
            // const imageUrl = 'http://localhost/bbmri-53323851.dcm';
            let imageId = "wadouri:" + imageUrl;

            //  Load & Display
            cornerstone.loadAndCacheImage(imageId).then(
              function(image) {
                // console.log(image);
                // 设置元素视口
                var viewport = cornerstone.getDefaultViewportForImage(
                  canvas,
                  image
                );
                // 显示图像
                cornerstone.displayImage(canvas, image, viewport);
                // 激活工具
                _this.initCanvasTools();

                // console.log("display")
              },
              function(err) {
                alert(err);
              }
            );

            // Dicom 加载 进度
            cornerstone.events.addEventListener(
              "cornerstoneimageloadprogress",
              function(event) {
                const eventData = event.detail;
                const loadProgress = document.getElementById("loadProgress");
                loadProgress.textContent = `Dicom加载: ${
                  eventData.percentComplete
                }%`;
                if (eventData.percentComplete === 100) {
                  // console.log("complete")
                }
              }
            );
          // });
      } else {
        this.isShow = true;
      }
    },
    initCanvasTools() {
      let _self = this;
      let canvas = this.$refs.canvas;
      this.isInitLoad = false;

      // 为 canvasStack 找到 imageIds
      let allImageIds = [];
      // this.exampleStudyImageIds.forEach(function(imageId) {
      //   let imageUrl = "wadouri:" + _self.baseUrl + imageId;
      //   allImageIds.push(imageUrl);
      // });
      // this.exampleStudyImageIds = [
      //   'http://localhost/bbmri-53323851.dcm',
      //   'http://localhost/bbmri-53323707.dcm',
      //   'http://localhost/bbmri-53323851.dcm',
      //   'http://localhost/bbmri-53323707.dcm'
      // ]
      this.exampleStudyImageIds.forEach(function(imageId) {
        let imageUrl = "wadouri:" + imageId;
        allImageIds.push(imageUrl);
      });

      // Create canvasStack
      let canvasStack = {
        currentImageIdIndex: 0,
        imageIds: allImageIds
      };

      // Enable Inputs
      // cornerstoneTools.mouseInput.enable(canvas);
      // cornerstoneTools.mouseWheelInput.enable(canvas);
      // cornerstoneTools.touchInput.enable(canvas);

      // Set the stack as tool state
      cornerstoneTools.addStackStateManager(canvas, ["stack"]);
      cornerstoneTools.addToolState(canvas, "stack", canvasStack);
      cornerstoneTools.stackScrollWheel.activate(canvas); // Mouse wheel
      cornerstoneTools.scrollIndicator.enable(canvas); // Position indicator

      // EDIT

      // Mouse
      // cornerstoneTools.wwwc.activate(canvas, 1); // left click
      cornerstoneTools.pan.activate(canvas, 2); // middle click
      // cornerstoneTools.zoom.activate(canvas, 4); // right click

      // Touch / Gesture
      // cornerstoneTools.wwwcTouchDrag.activate(canvas); // - Drag
      // cornerstoneTools.zoomTouchPinch.activate(canvas); // - Pinch
      // cornerstoneTools.panMultiTouch.activate(canvas); // - Multi (x2)

      this.extra()

      // EDIT END
    },
    /*
       * Window Resize
       *
       */
    listenForWindowResize() {
      this.$nextTick(function() {
        window.addEventListener(
          "resize",
          this.debounce(this.onWindowResize, 100)
        );
      });
    },
    onWindowResize() {
      cornerstone.resize(this.$refs.canvas, true);
    },
    /*
       * Utility Methods
       *
       */
    debounce(func, wait, immediate) {
      var timeout;
      return function() {
        var context = this;
        var args = arguments;
        var later = function() {
          timeout = null;
          if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
      };
    },
    // EDIT 
    extra(){
      // this.$refs.canvas.setAttribute("width", this.$ref.canvas.getAttribute("height"))
      // this.$refs.canvas.width = this.$refs.canvas.height
      const c = document.getElementsByTagName("canvas")[0]
      this.canvasObject = c.getContext('2d')
      this.canvasSizeObject = {
        width:c.width,
        height:c.height
      }
      this.canvasOriginSizeObject = {
        width:c.width,
        height:c.height
      }
      this.repeatGetCanvasDataFunc()
      // 滚轮事件
      this.$Tools.scrollCommonFunction(window, document)
      const _this = this
      window.addWheelListener(this.$refs.canvas, function( e ) { 
        // console.log(e)
        // console.log( e.deltaY );
        if (!_this.scrollBaseBoolean) {
          return
        }
        _this.scrollBaseObject = {
          deltaY:e.deltaY,
          offsetX:e.offsetX,
          offsetY:e.offsetY
        }
        _this.scrollBaseBoolean = false
        window.setTimeout(()=>{
          // deltaY < 0 放大 deltaY > 0 缩小
          if (_this.scrollBaseObject.deltaY < 0) {
            _this.scrollDriveCanvasZoomCalc(_this.scrollBaseObject.deltaY, _this.scrollBaseObject.offsetX, _this.scrollBaseObject.offsetY)
          } else {
            _this.scrollDriveCanvasZoomNarrowCalc(_this.scrollBaseObject.deltaY, _this.scrollBaseObject.offsetX, _this.scrollBaseObject.offsetY)
          }          
          _this.scrollBaseBoolean = true
        },100)        
        e.preventDefault();
      })
      // this.test()
    },    
    // 数组测试
    // test(){
    //   let unique = (arr) => ([...(new Set(arr))])
    //   let obj = {
    //     "qqq":0,
    //     "www":0,
    //     "eee":0,
    //     "rrr":1,
    //     "ttt":1,
    //     "yyy":99,
    //     "uuu":99,
    //     "iii":99
    //   }
    //   let value_arr = unique(Object.values(obj))
    //   let new_obj = {}
    //   console.log(value_arr)
    //   value_arr.forEach((item, index, a)=>{
    //     for (let i in obj) {
    //       if (obj[i] === item) {
    //         if(!new_obj[item]){
    //           new_obj[item] = []
    //         }
    //         new_obj[item].push(i)            
    //       }
    //     }        
    //   })
    //   console.log(new_obj)
    // },
    // type "0" "1"
    // 更换滤镜选项 执行函数换色
    watchDriveFilterChangeFunc(cv_data_obj, type){
      function aaa(element, index, array) {
        return element >= 0;
      }
      let new_color_obj = {...cv_data_obj}
      let arr = new_color_obj.data
      let arr_2 = arr.filter(aaa)
      let color_array = new this.$Color_class(arr_2)
      const new_color_array = ((color_array) => {
        if (type === "0") {
          return color_array.get_normal
        } else if (type === "1") {
          return color_array.get_reverse
        } else if (type === "2") {
          return color_array.get_hot
        } else if (type === "3") {
          return color_array.get_rainbow
        }
      })(color_array)      
      const origin_color = this.canvasOriginDataObject.data
      this.updateArrayValue(origin_color, new_color_array)
      // console.log(arr_2)
      // console.log(this.canvasOriginFilterDataObject)
      this.beforeRenderAfterZoomChangeFunc()
    },
    // 把渲染调用抽出来
    beforeRenderAfterZoomChangeFunc(){
      const w = this.canvasOriginSizeObject.width,
        h = this.canvasOriginSizeObject.height,
        {x, y} = this.scrollViewCoorObject,
        zoom = this.zoomNumberArray[this.zoomIndexNumber];
      const now_w = parseInt(w / zoom),
        now_h = parseInt(h / zoom);
      this.renderAfterZoomChange(x, y, w, h, now_w, now_h, '')
    },
    // 计数器
    changeCountFunc($event){
      this.directionStandandValueNumber = $event
    },
    repeatGetCanvasDataFunc(){
      const _this = this      
      const p = (resolve, reject) => {
        _this.canvasOriginFilterDataObject = _this.canvasObject.getImageData(0, 0, width, height)
        _this.canvasOriginNormalDataObject = _this.canvasObject.getImageData(0, 0, width, height)
        _this.canvasOriginZoomDataObject = _this.canvasObject.getImageData(0, 0, width, height)
        // _this.test(_this.canvasOriginFilterDataObject)
        resolve('200 OK ');
      }
      const width = this.canvasSizeObject.width, height = this.canvasSizeObject.height
      this.canvasOriginDataObject = this.canvasObject.getImageData(0, 0, width, height)      
      if (this.canvasOriginDataObject.data[3] !== 0) {
        console.log(new Date().getTime())
        const p_run = new Promise(p).then((result) => {console.log(result + new Date().getTime())}) 
        return
      } else {
        setTimeout(()=>{
          this.repeatGetCanvasDataFunc()
        },10)
      }
    },
    submitTestFunc(){
      alert(this.selectValueString)
    },
    clearAllDataFunc(){
      this.anotherCanvasMarkDataArray = []
      this.canvasMarkDataArray = []
      this.clearTestFunc()
    },
    clearTestFunc(){
      this.canvasObject.putImageData(this.canvasOriginZoomDataObject, 0, 0)
    },
    trueClearTestFunc(){
      this.canvasObject.putImageData(this.canvasOriginZoomDataObject, 0, 0)
    },
    moveTestFunc(){
      this.clearTestFunc()  // 清空之前的绘制 < 1ms
      this.movePointFunc()  // 移动某个图形 1ms
      this.reDrawFunc()    // 按照记录重绘 1ms
    },
    // 检验中心点是否在第三象限
    checkCenterPointInQuadrantFunc(item){
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
    },
    // 重绘
    reDrawFunc(){
      // console.log("reDrawFunc")
      const mark_array = this.canvasMarkDataArray
      mark_array.forEach((item, index) => {
        // 绘制多边形
        if (item.type === "polygon") {          
          drawArcBeforeFunc(item.pointDataArray, item.pointActiveIndex, item.type)
        }
        // console.log(item.completed)
        if (item.completed && item.type === "polygon") {
          this.$Painting_tools.drawPointLineFunc(this.canvasObject, item.pointDataArray, this.lineColorString, this.lineWidthNumber)
          drawCenterArcBeforeFunc(item.centerPointObject, item.centerPointActive)
        }
        // item.centerPointObject === null 不计算中心点
        if (item.completed && item.centerPointObject && item.type === "polygon") {
          drawCenterArcBeforeFunc(item.centerPointObject, item.centerPointActive)
        }
        // 绘制矩形
        if (item.completed && item.type === "rectangle") {
          // 如果中心点在第三象限就不绘制
          if (this.checkCenterPointInQuadrantFunc(item)) {
            return
          }
          drawRectBeforeFunc(item)
          drawArcBeforeFunc(item.pointDataArray, item.pointActiveIndex, item.type)
          drawCenterArcBeforeFunc(item.centerPointObject, item.centerPointActive)
        }
        // // 绘制矩形
        // if (item.completed && item.type === "rectangle") {
        //   drawRectBeforeFunc(item)
        //   drawArcBeforeFunc(item.pointDataArray, item.pointActiveIndex, item.type)
        //   drawCenterArcBeforeFunc(item.centerPointObject, item.centerPointActive)
        // }
        // 绘制椭圆
        if (item.completed && item.type === "ellipse") {
          // 如果中心点在第三象限就不绘制
          if (this.checkCenterPointInQuadrantFunc(item)) {
            return
          }
          drawEllipseBeforeFunc(item)
          drawArcBeforeFunc(item.pointDataArray, item.pointActiveIndex, item.type)
          drawCenterArcBeforeFunc(item.centerPointObject, item.centerPointActive)
        }
      })
      // 复制备用对象
      // _this.anotherCanvasMarkDataArray = _this.canvasMarkDataArray
      // mark_array.forEach((item, index) => {
      //   this.$Painting_tools.drawPointLineFunc(_this.canvasObject, item.pointDataArray, _this.lineColorString, _this.lineWidthNumber)
      //   drawArcBeforeFunc(item.pointDataArray)
      // })
    },
    movePointFunc(){
      let canvasMarkDataObject = this.canvasMarkDataArray[0]
      let pointDataArray = canvasMarkDataObject.pointDataArray
      let centerPointObject = canvasMarkDataObject.centerPointObject
      pointDataArray.forEach((item, index) => {
        item.x = item.x
        item.y = item.y
      })
      if (centerPointObject) {
        centerPointObject.center_x = centerPointObject.center_x
        centerPointObject.center_y = centerPointObject.center_y
      }      
    },
    // 滤镜
    // changeCanvasColorFilterFunc(canvas, new_color_array){
    //   this.clearTestFunc()
    //   const width = this.canvasSizeObject.width, 
    //     height = this.canvasSizeObject.height;
    //   let c = this.canvasObject.getImageData(0, 0, width, height)
    //   this.updateArrayValue(c.data, new_color_array)
    //   this.canvasObject.putImageData(c, 0, 0)
    //   this.reDrawFunc()
    // },
    // update uint8array
    updateArrayValue(c, d){
      d.forEach((item, index)=>{
        c[index] = item
      })
    },
    // 放大图片入口
    zoomPlusFunc(){
      const limit = this.zoomNumberArray.length - 1
      const plus = x => x + 1;
      const max = x => x > limit ? limit : x;
      this.zoomIndexNumber = max(plus(this.zoomIndexNumber)) 
      this.calcNowSourceWidthHeightFunc()
    },
    // 缩小图片入口
    zoomSubFunc(){
      const limit = 0
      const sub = x => x - 1;
      const min = x => x < limit ? limit : x;
      this.zoomIndexNumber = min(sub(this.zoomIndexNumber))
      this.calcNowSourceWidthHeightFunc()
    },
    // 计算方向键公共值
    directionCommonValueFunc(event){
      if (event.keyCode) {
        if (event.shiftKey) {
          return 1
        } else {
          return this.directionStandandValueNumber
        }
      } else {
        return this.directionStandandValueNumber
      }
    },
    // 上方向键
    directionTopFunc(event){
      const number = this.directionCommonValueFunc(event)
      const change = obj => ({y:obj.y - number, x:obj.x})
      this.viewXYCoordinateObject = this.checkViewCoorRangeFunc(change(this.viewXYCoordinateObject))
      this.calcNowSourceWidthHeightFunc('up')
    },
    // 左方向键
    directionLeftFunc(event){
      const number = this.directionCommonValueFunc(event)
      const change = obj => ({y:obj.y, x:obj.x - number})
      this.viewXYCoordinateObject = this.checkViewCoorRangeFunc(change(this.viewXYCoordinateObject))
      this.calcNowSourceWidthHeightFunc('left')
    },
    // 右方向键
    directionRightFunc(event){
      const number = this.directionCommonValueFunc(event)
      const change = obj => ({y:obj.y, x:obj.x + number})
      this.viewXYCoordinateObject = this.checkViewCoorRangeFunc(change(this.viewXYCoordinateObject))
      this.calcNowSourceWidthHeightFunc('right')
    },
    // 下方向键
    directionBottomFunc(event){
      const number = this.directionCommonValueFunc(event)
      const change = obj => ({y:obj.y + number, x:obj.x})
      this.viewXYCoordinateObject = this.checkViewCoorRangeFunc(change(this.viewXYCoordinateObject))
      this.calcNowSourceWidthHeightFunc('down')
    },
    // 获取差值坐标取值范围
    checkViewCoorRangeFunc(obj){
      // console.log(obj)
      // console.log(obj.x)
      const standand = {
        x:[-this.prototypeXYCoordinateObject.x,this.prototypeXYCoordinateObject.x],
        y:[-this.prototypeXYCoordinateObject.y,this.prototypeXYCoordinateObject.y]
      }
      // console.log(standand['x'][0])
      obj.x < standand['x'][0] ? obj.x = standand['x'][0] : ''
      obj.x > standand['x'][1] ? obj.x = standand['x'][1] : ''
      obj.y < standand['y'][0] ? obj.y = standand['y'][0] : ''
      obj.y > standand['y'][1] ? obj.y = standand['y'][1] : ''
      return obj
    },
    // 获取方向键对象取值范围
    getDirectionNumberRange(){
      const zoom_number = this.zoomNumberArray[this.zoomIndexNumber],
        standand_number = this.directionStandandValueNumber,
        w = this.canvasOriginSizeObject.width,
        h = this.canvasOriginSizeObject.height;
      let now_w = w / zoom_number,
        now_h = h / zoom_number;
      let proto_x = (w - now_w) / 2,
        proto_y = (h - now_h) / 2;
      let range_x = proto_x / standand_number,
        range_y = proto_y / standand_number;
      return {
        x:[-range_x, range_x],
        y:[-range_y, range_y]
      }
    },
    // directionMemoryObject 修正
    directionMemoryObjectRangeCheckFunc(directionMemoryObject, range_obj){
      // console.log(directionMemoryObject, range_obj)
      directionMemoryObject.x < range_obj.x[0] ? directionMemoryObject.x = parseInt(range_obj.x[0]) : ''
      directionMemoryObject.y < range_obj.y[0] ? directionMemoryObject.y = parseInt(range_obj.y[0]) : ''
      directionMemoryObject.x > range_obj.x[1] ? directionMemoryObject.x = parseInt(range_obj.x[1]) : ''
      directionMemoryObject.y > range_obj.y[1] ? directionMemoryObject.y = parseInt(range_obj.y[1]) : ''
      // console.log(directionMemoryObject)
      return directionMemoryObject
    },
    getDisplayCenterSingleFunc(data_model_value, display_model_value, zoom, w){
      const answer = data_model_value - (display_model_value / zoom) + (w / (2*zoom))
      return answer
    },
    // 滚轮用
    // 计算dataModel
    getDataModelValueInScroll(coor, scrollViewCoorObject, zoom){
      // console.log(coor, zoom)
      if (zoom === 1) {
        return coor
      } else {
        // console.log(scrollViewCoorObject)
        // console.log(parseInt(coor.x / zoom))
        // console.log(scrollViewCoorObject.x + parseInt(coor.x / zoom))
        return {
          x:scrollViewCoorObject.x + parseInt(coor.x / zoom),
          y:scrollViewCoorObject.y + parseInt(coor.y / zoom)
        }
      }
    },
    // 计算原型坐标
    calcPrototypeXYCoordinateObjectFunc(w, h, zoom){
      let prototypeXYCoordinateObject = this.prototypeXYCoordinateObject,
        now_w = parseInt(w / zoom),
        now_h = parseInt(h / zoom);
      prototypeXYCoordinateObject.x = parseInt((w - now_w) / 2)
      prototypeXYCoordinateObject.y = parseInt((h - now_h) / 2)      
    },
    // 计算原型坐标和现坐标的偏差值
    calcSubAboutPrototypeAndNowCoorFunc(prototype, scroll){
      this.viewXYCoordinateObject = {
        x:scroll.x - prototype.x,
        y:scroll.y - prototype.y
      }
      return {
        x:scroll.x - prototype.x,
        y:scroll.y - prototype.y
      }
    },
    // 滚轮放大图片计算 放大用
    // deltaY 滚轮值 offsetX 鼠标横坐标 offsetY 鼠标纵坐标
    scrollDriveCanvasZoomCalc(deltaY, offsetX, offsetY){
      // console.log("scrollDriveCanvasZoomCalc")
      // deltaY < 0 放大 deltaY > 0 缩小
      // 计算now_zoom_number
      let now_zoom_number;
      const prev_zoom_number = this.zoomIndexNumber,
        zoom_min = 0,
        zoom_max = this.zoomNumberArray.length - 1;
      // 如果已到最小还想缩小，或者已到最大还想变大，就拒绝
      if ((deltaY > 0 && prev_zoom_number === zoom_min)||(deltaY < 0 && prev_zoom_number === zoom_max)) {
        return
      }      
      const plus = x => x + 1;
      const sub = x => x - 1;
      const range_max_func = x => x > zoom_max ? zoom_max : x;
      const range_min_func = x => x < zoom_min ? zoom_min : x;
      deltaY < 0 ? now_zoom_number = range_max_func(plus(prev_zoom_number)) : '';
      deltaY > 0 ? now_zoom_number = range_min_func(sub(prev_zoom_number)) : '';
      // console.log(now_zoom_number)
      // 计算之后的值赋值给zoomIndexNumber
      this.zoomIndexNumber = now_zoom_number
      const zoom = this.zoomNumberArray[this.zoomIndexNumber];
      // x10 相对于1倍率的横坐标 y10 相对于1倍率的纵坐标
      // x20 相对于将要发生的倍率的横坐标 y20 相对于将要发生的倍率的纵坐标
      const data_model_coor = this.getDataModelValueInScroll({
        x:offsetX,
        y:offsetY
      }, this.scrollViewCoorObject, this.zoomNumberArray[prev_zoom_number])
      // console.log(data_model_coor.x)
      const x10 = data_model_coor.x,
        y10 = data_model_coor.y;      
      const x20 = parseInt(x10 / zoom),
        y20 = parseInt(y10 / zoom);
      const x00 = x10 - x20,
        y00 = y10 - y20;
      const w = this.canvasOriginSizeObject.width,
        h = this.canvasOriginSizeObject.height,
        standand = this.directionStandandValueNumber;
      const now_w = parseInt(w / zoom),
        now_h = parseInt(h / zoom);
      // let {x1, y1, x_max_stand, y_max_stand} = this.checkXYCurrentFunc(x00, y00, w - now_w, h - now_h)
      let {x1, y1, x_max_stand, y_max_stand} = this.checkXYCurrentFunc(x00, y00, w - now_w, h - now_h)
      // console.log(x10, x20, x00)
      // console.log(x00, y00, w, h, now_w, now_h)
      // 记录此时的初始点坐标，方便下次使用
      this.scrollViewCoorObject = {
        x:x1,
        y:y1
      }      
      // console.log(this.scrollViewCoorObject.y)
      // 计算原型坐标
      this.calcPrototypeXYCoordinateObjectFunc(w, h, zoom)
      // 计算原型坐标和现坐标的偏差值 viewXYCoordinateObject
      // console.log(this.viewXYCoordinateObject.x)
      const dmoOrigin = this.calcSubAboutPrototypeAndNowCoorFunc(this.prototypeXYCoordinateObject, this.scrollViewCoorObject)
      // 重设方向键记录
      // this.directionMemoryObject = {
      //   x:parseInt(dmoOrigin.x / standand),
      //   y:parseInt(dmoOrigin.y / standand)
      // }
      console.log("view", this.viewXYCoordinateObject.x)
      console.log("scroll", this.scrollViewCoorObject.x)
      console.log("prototype", this.prototypeXYCoordinateObject.x)
      // 调用渲染
      this.renderAfterZoomChange(x1, y1, w, h, now_w, now_h, 'scroll')
    },
    // 滚轮放大图片计算 缩小用
    // deltaY 滚轮值 offsetX 鼠标横坐标 offsetY 鼠标纵坐标
    scrollDriveCanvasZoomNarrowCalc(deltaY, offsetX, offsetY){
      // deltaY < 0 放大 deltaY > 0 缩小
      // 计算now_zoom_number
      let now_zoom_number;
      const prev_zoom_number = this.zoomIndexNumber,
        zoom_min = 0,
        zoom_max = this.zoomNumberArray.length - 1;
      // 如果已到最小还想缩小，或者已到最大还想变大，就拒绝
      if ((deltaY > 0 && prev_zoom_number === zoom_min)||(deltaY < 0 && prev_zoom_number === zoom_max)) {
        return
      }      
      const plus = x => x + 1;
      const sub = x => x - 1;
      const range_max_func = x => x > zoom_max ? zoom_max : x;
      const range_min_func = x => x < zoom_min ? zoom_min : x;
      deltaY < 0 ? now_zoom_number = range_max_func(plus(prev_zoom_number)) : '';
      deltaY > 0 ? now_zoom_number = range_min_func(sub(prev_zoom_number)) : '';
      // 计算之后的值赋值给zoomIndexNumber
      this.zoomIndexNumber = now_zoom_number
      const zoom = this.zoomNumberArray[this.zoomIndexNumber];
      // x10 相对于1倍率的横坐标 y10 相对于1倍率的纵坐标
      // x20 相对于将要发生的倍率的横坐标 y20 相对于将要发生的倍率的纵坐标
      const data_model_coor = this.getDataModelValueInScroll({
        x:offsetX,
        y:offsetY
      }, this.scrollViewCoorObject, this.zoomNumberArray[prev_zoom_number])
      const x10 = data_model_coor.x,
        y10 = data_model_coor.y;      
      const x20 = parseInt(x10 / zoom),
        y20 = parseInt(y10 / zoom);
      const x00 = x10 - x20,
        y00 = y10 - y20;
      const w = this.canvasOriginSizeObject.width,
        h = this.canvasOriginSizeObject.height,
        standand = this.directionStandandValueNumber;
      const now_w = parseInt(w / zoom),
        now_h = parseInt(h / zoom);
      let {x1, y1, x_max_stand, y_max_stand} = this.checkXYCurrentFunc(x00, y00, w - now_w, h - now_h)
      // 记录此时的初始点坐标，方便下次使用
      this.scrollViewCoorObject = {
        x:x1,
        y:y1
      }
      // 计算原型坐标
      this.calcPrototypeXYCoordinateObjectFunc(w, h, zoom)
      // 计算原型坐标和现坐标的偏差值 viewXYCoordinateObject
      const dmoOrigin = this.calcSubAboutPrototypeAndNowCoorFunc(this.prototypeXYCoordinateObject, this.scrollViewCoorObject)
      // 重设方向键记录
      console.log("view", this.viewXYCoordinateObject.x)
      console.log("scroll", this.scrollViewCoorObject.x)
      console.log("prototype", this.prototypeXYCoordinateObject.x)
      // 调用渲染
      this.renderAfterZoomChange(x1, y1, w, h, now_w, now_h, 'scroll')
    },
    // 计算相关值
    calcNowSourceWidthHeightFunc(type){
      const range_obj = this.getDirectionNumberRange()
      // 获取初始宽高 放大倍数
      // 求差值坐标
      const w = this.canvasOriginSizeObject.width,
        h = this.canvasOriginSizeObject.height,
        dmo = this.directionMemoryObjectRangeCheckFunc(this.directionMemoryObject, range_obj),
        standand = this.directionStandandValueNumber,
        zoom_number = this.zoomNumberArray[this.zoomIndexNumber];        
      let prototypeXYCoordinateObject = this.prototypeXYCoordinateObject,
        viewXYCoordinateObject = this.viewXYCoordinateObject,
        scrollViewCoorObject = this.scrollViewCoorObject;
      // console.log("?", dmo)
      // 计算现在用的源图片宽高 源图片初始点坐标
      let now_w = parseInt(w / zoom_number),
        now_h = parseInt(h / zoom_number);
        // x = parseInt((w - now_w) / 2) + dmo.x * standand,
        // y = parseInt((h - now_h) / 2) + dmo.y * standand;
      // x_max_stand:w - now_w, y_max_stand:h - now_h 两倍原型值 prototypeValue2X
      // (w - now_w) / 2,  (h - now_h) / 2 原型值：没有点过方向键时xy的值
      prototypeXYCoordinateObject.x = parseInt((w - now_w) / 2)
      prototypeXYCoordinateObject.y = parseInt((h - now_h) / 2)
      // viewXYCoordinateObject range change
      viewXYCoordinateObject = this.checkViewCoorRangeFunc(viewXYCoordinateObject)
      // x y
      let x = prototypeXYCoordinateObject.x + viewXYCoordinateObject.x,
        y = prototypeXYCoordinateObject.y + viewXYCoordinateObject.y;
      // console.log(prototypeXYCoordinateObject)
      // console.log(this.prototypeXYCoordinateObject)
      // 检查xy的值是否超出范围
      // let {x1, y1, x_max_stand, y_max_stand} = this.checkXYCurrentFunc(x, y, w - now_w, h - now_h)
      let x1 = x, y1 = y
      // x1 === 0 ? this.checkDirectionMemoryObject(x1, 0, parseInt((w - now_w) / 2), 'x', this.directionMemoryObject) : ''
      // x1 === x_max_stand ? this.checkDirectionMemoryObject(x1, x_max_stand, parseInt((w - now_w) / 2), 'x', this.directionMemoryObject) : ''
      // y1 === 0 ? this.checkDirectionMemoryObject(y1, 0, parseInt((h - now_h) / 2), 'y', this.directionMemoryObject) : ''
      // x1 === y_max_stand ? this.checkDirectionMemoryObject(y1, y_max_stand, parseInt((h - now_h) / 2), 'y', this.directionMemoryObject) : ''
      // 方向键点击数修正      
      // ???
      // console.log(x1, y1, prototypeXYCoordinateObject.y, standand, w)
      // 差值坐标
      // viewXYCoordinateObject.x = dmo.x * standand
      // viewXYCoordinateObject.y = dmo.y * standand
      // console.log("===820===", viewXYCoordinateObject.x, viewXYCoordinateObject.y)
      // viewXYCoordinateObject = {
      //   x: x1,
      //   y: y1
      // }
      // console.log("dmo", viewXYCoordinateObject.x, viewXYCoordinateObject.y)
      scrollViewCoorObject.x = prototypeXYCoordinateObject.x + viewXYCoordinateObject.x
      scrollViewCoorObject.y = prototypeXYCoordinateObject.y + viewXYCoordinateObject.y
      console.log("view", this.viewXYCoordinateObject.x)
      console.log("scroll", this.scrollViewCoorObject.x)
      console.log("prototype", this.prototypeXYCoordinateObject.x)
      this.renderAfterZoomChange(x1, y1, w, h, now_w, now_h, "button")
      // 计算scrollViewCoorObject
      // this.scrollViewCoorObject = ((type) => {
      //   const _self = this.scrollViewCoorObject
      //   // console.log("_self", _self)
      //   let x_mixin = 0,
      //     y_mixin = 0;
      //   if (type === 'up') {
      //     y_mixin = -10
      //   } else if (type === 'down') {
      //     y_mixin = 10
      //   } else if (type === 'left') {
      //     x_mixin = -10
      //   } else if (type === 'right') {
      //     x_mixin = 10
      //   }
      //   const max_and_min = this.checkXYCurrentRangeFunc()
      //   // console.log(max_and_min)
      //   let x = _self.x + x_mixin,
      //     y = _self.y + y_mixin;
      //   // console.log(x)
      //   // console.log(y)
      //   x < max_and_min.x[0] ? x = max_and_min.x[0] : ''
      //   x > max_and_min.x[1] ? x = max_and_min.x[1] : ''
      //   y < max_and_min.y[0] ? y = max_and_min.y[0] : ''
      //   y > max_and_min.y[1] ? y = max_and_min.y[1] : ''
      //   // console.log(x)
      //   // console.log(y)
      //   return {
      //     x:x,
      //     y:y,
      //   }
      // })(type)      
      // viewXYCoordinateObject = {
      //   x:scrollViewCoorObject.x - prototypeXYCoordinateObject.x,
      //   y:scrollViewCoorObject.y - prototypeXYCoordinateObject.y
      // }
      // console.log(this.scrollViewCoorObject.y)
    },
    checkXYCurrentRangeFunc(){
      const w = this.canvasOriginSizeObject.width,
        h = this.canvasOriginSizeObject.height,
        zoom_number = this.zoomNumberArray[this.zoomIndexNumber];
      const now_w = parseInt(w / zoom_number),
        now_h = parseInt(h / zoom_number);
      const x_max = w - now_w,
        y_max = h - now_h;
      return {
        x:[0, x_max],
        y:[0, y_max]
      }
    },
    // 检查XY是否在合法范围内
    checkXYCurrentFunc(x, y, x_max_stand, y_max_stand){
      // const base = x < y ? x : y
      x < 0 ? x = 0 : ''
      y < 0 ? y = 0 : ''
      x > x_max_stand ? x = x_max_stand : ''
      y > y_max_stand ? y = y_max_stand : ''
      return {x1: x, y1: y, x_max_stand:x_max_stand, y_max_stand:y_max_stand}
    },
    // 检查 DirectionMemoryObject 已废弃
    checkDirectionMemoryObject(render_key, value, stand, key, obj){
      const directionStandandValueNumber = this.directionStandandValueNumber
      obj[key] = parseInt((value - stand) / directionStandandValueNumber)
    },
    // 渲染
    renderAfterZoomChange(x, y, w, h, now_w, now_h, ui_type){
      const _this = this
      // this.canvasObject.putImageData(this.canvasOriginDataObject, 0, 0)
      let hideCanvasHTML = document.getElementsByTagName("canvas")[1]
      hideCanvasHTML.width = w,
        hideCanvasHTML.height = h;
      let hideCanvasObject = hideCanvasHTML.getContext('2d')
      hideCanvasObject.putImageData(this.canvasOriginDataObject, 0, 0)
      // console.log(this.canvasOriginFilterDataObject)
      hideCanvasHTML.toBlob(function (e) {
        // console.log(e)
        const reader = new FileReader()
        reader.readAsDataURL(e)
        reader.onload = function(e){
          let img = new Image()
          img.src = e.target.result
          img.id = "abc"
          // img.crossOrigin = "Anonymous"
          // console.log(img.src)
          img.style.display = "none"
          // img注入进DOM
          document.body.appendChild(img)
          img.onload = function () {
            let canvasHTML = document.getElementsByTagName("canvas")[0]
            let ctx = canvasHTML.getContext("2d")
            ctx.drawImage(img, x, y, now_w, now_h, 0, 0, w, h)
            _this.canvasSizeObject = {
              width: now_w,
              height: now_h
            }
            // 记录zoomOriginData
            _this.canvasOriginZoomDataObject = ctx.getImageData(0, 0, w, h)
            // 重计算displayModel
            _this.resetDisplayModelFunc(ui_type)
            // 重绘
            _this.reDrawFunc()
            // img从DOM中移除
            document.body.removeChild(img)
            console.log(new Date().getTime())
          }
        }
      })
    },
    // 重设显示模型的数据 核心
    // dataModel -> displayModel
    resetDisplayModelCoreFunc(pXYcWithOffset, zoom_number){
      let canvasMarkDataArray = this.canvasMarkDataArray
      this.anotherCanvasMarkDataArray.forEach((item, index, this_arr) => {
        if (true) {
          // 中心点 center
          const centerPointObject = item.centerPointObject
          // dataModel中这个点与所知坐标的差值
          const no_mult_coor_center = {
            center_x:centerPointObject.center_x - pXYcWithOffset.x,
            center_y:centerPointObject.center_y - pXYcWithOffset.y
          }
          // console.log(no_mult_coor_center)
          // 得到的坐标再乘以倍率
          const have_mult_coor_center = {
            center_x: parseInt(no_mult_coor_center.center_x * zoom_number),
            center_y: parseInt(no_mult_coor_center.center_y * zoom_number)
          }
          // console.log(have_mult_coor_center)
          // set
          setCoreObjectArray(canvasMarkDataArray[index], "canvasMarkDataObject", "update", 0, "centerPointObject", have_mult_coor_center)
          // 链接点 connect
          // let point_arr = canvasMarkDataArray[index]
          // console.log(point_arr)
          let new_point_arr = []
          item.pointDataArray.forEach((child_item, child_index, child_this_arr) => {            
            const point = child_item
            const no_mult_coor_connect = {
              x:point.x - pXYcWithOffset.x,
              y:point.y - pXYcWithOffset.y
            }
            const have_mult_coor_connect = {
              x: parseInt(no_mult_coor_connect.x * zoom_number),
              y: parseInt(no_mult_coor_connect.y * zoom_number)
            }
            // console.log(child_item)
            // console.log(have_mult_coor_connect)
            new_point_arr.push(have_mult_coor_connect)
            // set
            // setCoreObjectArray(point_arr.pointDataArray, "pointDataArray", "update", child_index, null, have_mult_coor_connect)
            // point_arr.pointDataArray[0].x = 499
            // 对象没有深拷贝，所以子key的引用有问题，需要对子key值进行直接重设
          })
          // set
          setCoreObjectArray(canvasMarkDataArray[index], "canvasMarkDataObject", "update", 0, "pointDataArray", new_point_arr)
        }
      })
    },
    // 重设显示模型的数据
    resetDisplayModelFunc(ui_type){
      const range_obj = this.getDirectionNumberRange()
      // pXYc 当前倍率下的原型点位置 dmo 点了几次方向键 standand 移动单位标准值
      const pXYc = this.prototypeXYCoordinateObject,
        vXYc = this.viewXYCoordinateObject,
        dmo = this.directionMemoryObjectRangeCheckFunc(this.directionMemoryObject, range_obj),
        standand = this.directionStandandValueNumber,
        zoom_number = this.zoomNumberArray[this.zoomIndexNumber];
      // pXYc + dmo*standand = pXYcWithOffset 偏差原型值（原型值 + 移动偏差值）
      let pXYcWithOffset = {
        x:pXYc.x + vXYc.x,
        y:pXYc.y + vXYc.y
      }
      // if (ui_type === "scroll") {
      //   pXYcWithOffset = {
      //     x:pXYc.x + this.scrollPXYcObject.x,
      //     y:pXYc.y + this.scrollPXYcObject.y
      //   }
      //   console.log(pXYc.x, this.scrollPXYcObject.x)
      // }
      this.resetDisplayModelCoreFunc(pXYcWithOffset, zoom_number)      
    }
    // getXYMaxMinPointFunc(arr, index){
    //   return arr[index]
    // }
    // EDIT END
  },
  mounted() {
    _this = this
    this.show();

    // test
    // let arr = [0,1,2]
    // this.$delete(arr,0)
    // console.log(arr)
  },  
  watch:{
    // 用户操作选项
    selectValueString:function(new_value, old_value){
      if (new_value === "1" && this.isCanCopyOriginCanvasDataBoolean) {
        this.isCanCopyOriginCanvasDataBoolean = false
      }
    },
    // 色彩滤镜选项
    selectColorFilterString:function(new_value, old_value){
      this.watchDriveFilterChangeFunc(this.canvasOriginFilterDataObject, new_value)
    }
  },
  components: {
    count
  }
};
var timeoutFunction = null
// $(document).on("click", ".image-canvas", function() {
//     console.log("click")
//     painting();
// });
painting()
// $(document).on("dblclick", ".image-canvas", function(e) {
//     console.log("dblclick")
//     e.preventDefault();
//     _this.isPointingBoolean = false
//     deletePointBecauseDblclickFunc()
//     drawPointFunc()
// });
// 初始化
function painting() {
    //在绑定之前先解绑，解决了事件多次触发的问题。
    // alert("???")
    // oncllick 点击事件
    $(document)
        .off("click", ".image-canvas")
        .on("click", ".image-canvas", function(event) {
          // console.log("click")
          // console.log(_this.selectValueString)
          // 如果刚刚处于与多边形失去连接状态
          if (_this.polygonLatingAndFormingIsDisconnectedBoolean) {
            // console.log("click1")
            _this.polygonLatingAndFormingIsDisconnectedBoolean = false
            return
          }
          // 如果处于可移动或者拉伸某多边形状态就不启动绘制函数
          if (_this.isMouseCanTranslatePolygonBoolean || _this.isMouseTranslatingPolygonBoolean || _this.isMouseCanTransformPolygonBoolean || _this.isMouseTransformingPolygonBoolean) {
            // console.log("click2")
            // console.log(_this.isMouseCanTranslatePolygonBoolean)
            // console.log(_this.isMouseTranslatingPolygonBoolean)
            // console.log(_this.isMouseCanTransformPolygonBoolean)
            // console.log(_this.isMouseTransformingPolygonBoolean)
            return
          }
          // 如果不在绘制选项中就不绘制
          if (_this.selectValueString !== "1") {
            // console.log("click3")
            return
          }
          // 多边形
          if (_this.selectValueString === "1") {
            // console.log("click4")
            // alert("???")
            pointPaintingFunc(event)            
          }          
        })
    // onmousemove 鼠标移动事件
    $(document)
        .off("mousemove", ".image-canvas")
        .on("mousemove", ".image-canvas", function(event) {
          // 移动 拉伸
          if (_this.isPaintedBoolean) {
            const x = event.offsetX, 
              y = event.offsetY;
            const judge_number = _this.centerPointHoverJudgeNumber
            let reDrawStatusBoolean = true
            let haveATranslatePolygon = false
            let haveATransformingPolygon = false
            _this.canvasMarkDataArray.forEach((item, index, this_arr) => {
              // 只计算已完成的多边形
              if (!item.completed) {
                return
              }
              // 计算中心点
              const x_ed = item.centerPointObject ? item.centerPointObject.center_x : -999999
              const y_ed = item.centerPointObject ? item.centerPointObject.center_y : -999999
              // let hori = x_ed - x    // 横向距离
              // let vert = y_ed - y    // 纵向距离
              // 中心点与鼠标的距离
              // let distance = Math.sqrt(hori*hori + vert*vert)
              const distance = _this.$Painting_tools.calcPointDistanceFunc(x, y, x_ed, y_ed)              
              if (distance < judge_number) {
                // item.translateable = true
                // item.centerPointActive = true
                setCoreObjectArray(item, "canvasMarkDataObject", "update", null, "translateable", true)
                setCoreObjectArray(item, "canvasMarkDataObject", "update", null, "centerPointActive", true)
                _this.canTranslatePolygonIndex = index
                _this.isMouseCanTranslatePolygonBoolean = true
                haveATranslatePolygon = true
                // 
                if (true) {
                  // 鼠标现坐标记录 多边形现坐标计算
                  if (_this.isMouseTranslatingPolygonBoolean) {
                    // console.log("polygon")
                    // 鼠标移动 mouseleave 记录坐标B
                    _this.polygonMovingMouseContinueCoordinateObject = {
                      x:event.offsetX,
                      y:event.offsetY
                    }
                    // 计算两个坐标对象的差值 保留正负
                    let obj_a = _this.polygonMovingMouseStartedCoordinateObject
                    const obj_b = _this.polygonMovingMouseContinueCoordinateObject
                    // console.log(obj_a.x, obj_a.y)
                    // console.log(obj_b.x, obj_b.y)
                    let coor_x_distance = obj_b.x - obj_a.x
                    let coor_y_distance = obj_b.y - obj_a.y
                    // 中心点重新赋值
                    // item.centerPointObject.center_x = item.centerPointObject.center_x + coor_x_distance
                    // item.centerPointObject.center_y = item.centerPointObject.center_y + coor_y_distance
                    let new_center_x = item.centerPointObject.center_x + coor_x_distance
                    let new_center_y = item.centerPointObject.center_y + coor_y_distance
                    setCoreObjectArray(item, "canvasMarkDataObject", "update", 0, "centerPointObject", {
                      center_x:new_center_x,
                      center_y:new_center_y
                    })
                    // displayModel -> dataModel
                    // 显示模型数据 - 数据模型数据
                    const modelDataObject = getCurrentDataModelSinglePointValue({center_x:new_center_x, center_y:new_center_y}, "center")
                    // item 对应 _this.anotherCanvasMarkDataArray[index]
                    setCoreObjectArray(_this.anotherCanvasMarkDataArray[index], "canvasMarkDataObject", "update", 0, "centerPointObject", modelDataObject)
                    // 多边形坐标点重新赋值
                    item.pointDataArray.forEach((child_item, child_index, this_arr)=>{
                      // child_item.x = child_item.x + coor_x_distance
                      // child_item.y = child_item.y + coor_y_distance
                      let new_child_item_x = child_item.x + coor_x_distance
                      let new_child_item_y = child_item.y + coor_y_distance
                      setCoreObjectArray(this_arr, "pointDataArray", "update", child_index, null, {
                        x:new_child_item_x,
                        y:new_child_item_y
                      })
                      // displayModel -> dataModel
                      // 显示模型数据 - 数据模型数据
                      const modelDataObject_singlePoint = getCurrentDataModelSinglePointValue({x:new_child_item_x, y:new_child_item_y}, "connect")
                      setCoreObjectArray(_this.anotherCanvasMarkDataArray[index].pointDataArray, "pointDataArray", "update", child_index, null, modelDataObject_singlePoint)
                    })
                    // 修正polygonMovingMouseStartedCoordinateObject，保证下一次移动正常
                    obj_a.x = obj_b.x
                    obj_a.y = obj_b.y
                  }                  
                  // reDrawStatusBoolean = false
                  // 激活重绘
                  // _this.clearTestFunc()
                  // _this.reDrawFunc()
                }                
                // console.log(item.centerPointActive)
              } else {
                // 如果是数组最后一个，且没有可移动多边形
                if (!haveATranslatePolygon && (index === this_arr.length - 1)) {
                  _this.canTranslatePolygonIndex = -1
                  _this.isMouseCanTranslatePolygonBoolean = false
                }
                // item.translateable = false
                // item.centerPointActive = false
                setCoreObjectArray(item, "canvasMarkDataObject", "update", null, "translateable", false)
                setCoreObjectArray(item, "canvasMarkDataObject", "update", null, "centerPointActive", false)
                // 激活重绘
                // _this.clearTestFunc()
                // _this.reDrawFunc()
              }
              // 多边形的各个点与鼠标的距离
              if (!(distance < judge_number)) {
                let pointDataArray = item.pointDataArray
                const child_judge_number = _this.polygonPointHoverJudgeNumber
                let child_point_is_marked = false
                _this.isMouseCanTransformPolygonBoolean = true
                // console.log(_this.isMouseCanTransformPolygonBoolean)
                pointDataArray.forEach((child_item, child_index, this_arr) => {
                  // x y 是鼠标此时的点 连接点需要别的标识符
                  const point_x = child_item.x, point_y = child_item.y
                  // const child_hori = point_x - x, child_vert = point_y - y
                  // const child_distance = Math.sqrt(child_hori*child_hori + child_vert*child_vert)
                  const child_distance = _this.$Painting_tools.calcPointDistanceFunc(x, y, point_x, point_y)
                  // console.log(child_distance)
                  if (child_distance < child_judge_number) {
                    // item.pointActiveIndex = child_index
                    setCoreObjectArray(item, "canvasMarkDataObject", "update", null, "pointActiveIndex", child_index)
                    child_point_is_marked = true
                    haveATransformingPolygon = true
                    // item.transformable
                    // item.transformable = true
                    setCoreObjectArray(item, "canvasMarkDataObject", "update", null, "transformable", true)
                    // item.centerPointActive = true
                    // 如果鼠标不和任何一个连接点挨着
                    // console.log(item.pointActiveIndex)
                  } else if (!haveATransformingPolygon && (child_index === pointDataArray.length - 1)) {
                    _this.isMouseCanTransformPolygonBoolean = false
                    // item.transformable = false
                    // ???
                    // item.pointActiveIndex = null

                    setCoreObjectArray(item, "canvasMarkDataObject", "update", null, "transformable", false)
                    setCoreObjectArray(item, "canvasMarkDataObject", "update", null, "pointActiveIndex", null)
                  }                  
                })
                // console.log(child_point_is_marked, index)
                // !child_point_is_marked ? item.pointActiveIndex = null : ''
                // 鼠标现坐标记录 多边形现坐标计算
                // console.log(_this.isMouseTransformingPolygonBoolean)
                if (_this.isMouseTransformingPolygonBoolean) {
                  if (item.pointActiveIndex === null) {
                    // 重设移动和拉伸布尔值
                    resetLatingAndFormingBooleanFunc()
                    // 激活重绘
                    _this.clearTestFunc()
                    _this.reDrawFunc()
                    return
                  }
                  // 鼠标移动 mouseleave 记录坐标B
                  _this.polygonTransformingMouseContinueCoordinateObject = {
                    x:event.offsetX,
                    y:event.offsetY
                  }
                  // 计算两个坐标对象的差值 保留正负
                  let obj_a = _this.polygonTransformingMouseStartedCoordinateObject
                  const obj_b = _this.polygonTransformingMouseContinueCoordinateObject
                  //
                  let coor_x_distance = obj_b.x - obj_a.x
                  let coor_y_distance = obj_b.y - obj_a.y
                  // 把新点坐标注入到对象中
                  let transform_coor_obj = item.pointDataArray[item.pointActiveIndex]
                  // transform_coor_obj.x = transform_coor_obj.x + coor_x_distance
                  // transform_coor_obj.y = transform_coor_obj.y + coor_y_distance
                  let new_transform_coor_obj_x = transform_coor_obj.x + coor_x_distance
                  let new_transform_coor_obj_y = transform_coor_obj.y + coor_y_distance
                  setCoreObjectArray(item.pointDataArray, "pointDataArray", "update", item.pointActiveIndex, null, {
                    x:new_transform_coor_obj_x,
                    y:new_transform_coor_obj_y
                  })
                  // displayModel -> dataModel
                  // 显示模型数据 - 数据模型数据
                  const modelDataObject = getCurrentDataModelSinglePointValue({x:new_transform_coor_obj_x, y:new_transform_coor_obj_y}, "connect")
                  // item 对应 _this.anotherCanvasMarkDataArray[index]
                  setCoreObjectArray(_this.anotherCanvasMarkDataArray[index].pointDataArray, "pointDataArray", "update", item.pointActiveIndex, null, modelDataObject)
                  // 修正
                  obj_a.x = obj_b.x
                  obj_a.y = obj_b.y
                  // 中心点坐标重设
                  const new_center = _this.$Painting_tools.calcCenterInPolygon(item.pointDataArray, _this.$Tools.compareVal)   
                  // item.centerPointObject = new_center
                  setCoreObjectArray(item, "canvasMarkDataObject", "update", null, "centerPointObject", new_center)
                  // displayModel -> dataModel
                  // 显示模型数据 - 数据模型数据
                  const modelDataObject_center = getCurrentDataModelSinglePointValue(new_center, "center")
                  // item 对应 _this.anotherCanvasMarkDataArray[index]
                  setCoreObjectArray(_this.anotherCanvasMarkDataArray[index], "canvasMarkDataObject", "update", null, "centerPointObject", modelDataObject_center)
                }
              }
              // 如果找中心点，就不点亮连接点
              if (distance < judge_number) {
                item.pointActiveIndex = null
                setCoreObjectArray(item, "canvasMarkDataObject", "update", null, "pointActiveIndex", null)
              }
              // 重设移动和拉伸布尔值
              resetLatingAndFormingBooleanFunc()
              // console.log(_this.isMouseTransformingPolygonBoolean)
              // 激活重绘
              _this.clearTestFunc()
              _this.reDrawFunc()
            })
          }
          // 矩形绘制
          // _this.selectValueString 模式选项 1 多边形 2 矩形 3 椭圆
          // console.log(!_this.isPaintedBoolean)
          if (_this.isRectPaintingBoolean && _this.selectValueString === "2") {            
            rectanglePaintingFunc(event, 2)            
          }
          // 椭圆绘制
          if (_this.isEllipsePaintingBoolean && _this.selectValueString === "3") {            
            ellipsePaintingFunc(event, 2)
          }
          // console.log("mousemove")         
        })
    // onmousedown
    $(document)
        .off("mousedown", ".image-canvas")
        .on("mousedown", ".image-canvas", function(event) {
          // console.log("mousedown")
          if (_this.isMouseCanTranslatePolygonBoolean && event.which === 1) {
            // 鼠标点击 mousedown 记录坐标A
            _this.polygonMovingMouseStartedCoordinateObject = {
              x:event.offsetX,
              y:event.offsetY
            }
            _this.isMouseTranslatingPolygonBoolean = true
          }
          // console.log(_this.isMouseCanTransformPolygonBoolean)
          if (_this.isMouseCanTransformPolygonBoolean && event.which === 1) {
            // 鼠标点击 mousedown 记录坐标A
            _this.polygonTransformingMouseStartedCoordinateObject = {
              x:event.offsetX,
              y:event.offsetY
            }
            _this.isMouseTransformingPolygonBoolean = true
          }
          // 删除点
          if (event.which === 3) {
            pointDeleteFunc(event)
          }
          // 矩形
          // console.log(!_this.isMouseTranslatingPolygonBoolean)
          // console.log(!_this.isMouseTransformingPolygonBoolean)
          // console.log(_this.selectValueString)
          if (_this.selectValueString === "2" && !_this.isMouseTranslatingPolygonBoolean && !_this.isMouseTransformingPolygonBoolean && event.which === 1) {
            // 开始绘制
            // console.log("rectanglePaintingFunc")
            rectanglePaintingFunc(event, 1)
          }
          // 椭圆
          if (_this.selectValueString === "3" && !_this.isMouseTranslatingPolygonBoolean && !_this.isMouseTransformingPolygonBoolean && event.which === 1) {
            // 开始绘制
            ellipsePaintingFunc(event, 1)
          }
          // 移动底图
          if (event.which === 2) {
            
          }
        })
    // onmouseup
    $(document)
        .off("mouseup", ".image-canvas")
        .on("mouseup", ".image-canvas", function(event) {
          console.log("mouseup")
          if (_this.isMouseCanTranslatePolygonBoolean) {            
            _this.isMouseTranslatingPolygonBoolean = false
            _this.polygonMovingMouseStartedCoordinateObject = null
            _this.polygonMovingMouseContinueCoordinateObject = null
          }
          if (_this.isMouseCanTransformPolygonBoolean) {            
            _this.isMouseTransformingPolygonBoolean = false
            _this.polygonTransformingMouseStartedCoordinateObject = null
            _this.polygonTransformingMouseContinueCoordinateObject = null
          }
          // 矩形结束绘制
          if (_this.isRectPaintingBoolean && _this.selectValueString === "2") {
            rectanglePaintingFunc(event, 3)
          }
          // 椭圆结束绘制
          if (_this.isEllipsePaintingBoolean && _this.selectValueString === "3") {
            ellipsePaintingFunc(event, 3)
          }
          // 移动底图
          if (event.which === 2) {
            _this.mouseMiddleStatusBoolean = false            
          }
        })
    // onkeydown 键盘事件
    $(document).keydown(function(event){
      // console.log(event)
      if (!_this.keyEventBaseBoolean) {
        return
      }
      _this.keyEventBaseBoolean = false
      _this.keyEventObject = event
      setTimeout(() => {
        keydownEventSwitchFunc(event)
        _this.keyEventBaseBoolean = true
      },30)
    })
}
// 键盘事件分发
function keydownEventSwitchFunc(event){
  // w 87 up
  if (event.keyCode === 87) {
    _this.directionTopFunc(event)
  }
  // s 83 down
  if (event.keyCode === 83) {
    _this.directionBottomFunc(event)
  }
  // d 68 right
  if (event.keyCode === 68) {
    _this.directionRightFunc(event)
  }
  // a 65 left
  if (event.keyCode === 65) {
    _this.directionLeftFunc(event)
  }
  // + 187 add zoom
  if (event.keyCode === 187) {
    _this.zoomPlusFunc()
  }
  // - 189 sub zoom 
  if (event.keyCode === 189) {
    _this.zoomSubFunc()
  }
}
// 计算两点距离公共方法
// x0 y0 鼠标此时的坐标 x1 y1 参照点的坐标
// function calcPointDistanceFunc(x0, y0, x1, y1){
//   if (x1 === -999999 || y1 === -999999) {
//     return 999999
//   }
//   let hori = x1 - x0    // 横向距离
//   let vert = y1 - y0    // 纵向距离
//   return Math.sqrt(hori*hori + vert*vert)
// }
// 把lating和forming布尔值重设为正确的值
function resetLatingAndFormingBooleanFunc(){
  // 如果此时所有多边形都不处于移动和拉伸状态
  const allPolygonIsStatic = allPolygonLateAndFormCheckFunc()
  // 就 _this.isMouseTranslatingPolygonBoolean _this.isMouseTransformingPolygonBoolean 为 false
  if (allPolygonIsStatic) {
    let result = false
    if (_this.isMouseTranslatingPolygonBoolean) {
      _this.isMouseTranslatingPolygonBoolean = false
      result = true
    }
    if (_this.isMouseTransformingPolygonBoolean) {
      _this.isMouseTransformingPolygonBoolean = false
      result = true
    }
    if (result) {
      // console.log("result")
      _this.polygonLatingAndFormingIsDisconnectedBoolean = true
    }                
  }
}
// 如果没有任何图形就重置状态
function checkCanvasMarkDataArrayFunc(){
  if (_this.canvasMarkDataArray.length === 0) {
    _this.isMouseCanTranslatePolygonBoolean = false
    _this.isMouseTranslatingPolygonBoolean = false
    _this.isMouseCanTransformPolygonBoolean = false
    _this.isMouseTransformingPolygonBoolean = false
  }
}
// 如果此时所有多边形都不处于移动和拉伸状态
function allPolygonLateAndFormCheckFunc () {
  let result = true
  _this.canvasMarkDataArray.forEach((item, index, this_arr) => {
    item.translateable ? result = false : ''
    item.transformable ? result = false : ''
  })
  return result
}
// 椭圆绘制函数
// type 1 mousedown 2 mouseleave 3 mouseup
function ellipsePaintingFunc (event, type) {
  const r = _this.arcRNumber
  if (type === 1) {
    _this.isPaintedBoolean = false
    _this.isEllipsePaintingBoolean = true
    // const canvasMarkDataObject = {
    //   id: _this.$Tools.randomString(),
    //   type:'ellipse',   // 椭圆
    //   visible: true,
    //   active: false,
    //   color: undefined,
    //   completed:false,    // 是否已完成绘制
    //   centerPointActive:false,    // 是否激活中心点（可以移动多边形）
    //   translateable:false,    // 是否在移动
    //   transformable:false,    // 是否在拉伸
    //   // 中心点坐标
    //   // 椭圆的中心点会在一开始就记录
    //   centerPointObject:{
    //     center_x:event.offsetX,
    //     center_y:event.offsetY
    //   },      
    //   pointActiveIndex:null,    // 此时激活了多边形的哪个连接点（一个时刻只会有一个）
    //   // 椭圆只有一个控制点
    //   // type1 时椭圆没有控制点 type2 时才有
    //   pointDataArray: [
    //     {
    //       x: event.offsetX,
    //       y: event.offsetY
    //     },
    //     {
    //       x: event.offsetX,
    //       y: event.offsetY
    //     }
    //   ]
    // }
    // 把数据对象放进实体类
    const canvasMarkDataObject = new _this.$CanvasMarkDataObject_class(_this.$Tools.randomString(), 'ellipse', event.offsetX, event.offsetY)
    // _this.$set(_this.canvasMarkDataArray, _this.canvasMarkDataArray.length, canvasMarkDataObject)
    setCoreObjectArray(_this.canvasMarkDataArray, "canvasMarkDataArray", "add", _this.canvasMarkDataArray.length, null, canvasMarkDataObject)
    // displayModel -> dataModel
    // 显示模型的数据 - 数据模型的数据
    // 用...运算符实现拷贝（不深）
    const modelDataObject = getCurrentDataModelValue({...canvasMarkDataObject, isDataModel:true}, canvasMarkDataObject.type)
    setCoreObjectArray(_this.anotherCanvasMarkDataArray, "canvasMarkDataArray", "add", _this.anotherCanvasMarkDataArray.length, null, modelDataObject)
  } else if (type === 2) {
    // console.log("???")
    // 拖动时重设右下角点的值
    let canvasMarkDataObject = _this.canvasMarkDataArray[_this.canvasMarkDataArray.length - 1]
    let pointDataArray = canvasMarkDataObject.pointDataArray
    // _this.anotherCanvasMarkDataArray[_this.anotherCanvasMarkDataArray.length - 1].pointDataArray = null
    let pointDataArray_2 = _this.anotherCanvasMarkDataArray[_this.anotherCanvasMarkDataArray.length - 1].pointDataArray
    // console.log(pointDataArray[0].x)
    // console.log(_this.anotherCanvasMarkDataArray[_this.anotherCanvasMarkDataArray.length - 1].pointDataArray[0].x)
    // 椭圆只有一个控制点
    // pointDataArray[0].x = event.offsetX
    // pointDataArray[0].y = event.offsetY
    setCoreObjectArray(pointDataArray, "pointDataArray", "update", 0, null, {
      x:event.offsetX,
      y:event.offsetY
    })
    // displayModel -> dataModel
    // 显示模型的数据 - 数据模型的数据
    const modelDataObject = getCurrentDataModelSinglePointValue({
      x:event.offsetX,
      y:event.offsetY
    }, "connect")
    setCoreObjectArray(pointDataArray_2, "pointDataArray", "update", 0, null, modelDataObject)
    // 算中心点 和控制点0 的差值
    let hori = canvasMarkDataObject.centerPointObject.center_x - event.offsetX
    let vert = canvasMarkDataObject.centerPointObject.center_y - event.offsetY
    // pointDataArray[1].x = canvasMarkDataObject.centerPointObject.center_x + hori
    // pointDataArray[1].y = canvasMarkDataObject.centerPointObject.center_y + vert
    let second_point_x = canvasMarkDataObject.centerPointObject.center_x + hori
    let second_point_y = canvasMarkDataObject.centerPointObject.center_y + vert
    setCoreObjectArray(pointDataArray, "pointDataArray", "update", 1, null, {
      x:second_point_x,
      y:second_point_y
    })
    // displayModel -> dataModel
    // 显示模型的数据 - 数据模型的数据
    const modelDataObject_singlePoint = getCurrentDataModelSinglePointValue({
      x:second_point_x,
      y:second_point_y
    }, "connect")
    setCoreObjectArray(pointDataArray_2, "pointDataArray", "update", 1, null, modelDataObject_singlePoint)
    // console.log(pointDataArray)
    // 重绘
    _this.clearTestFunc()
    _this.reDrawFunc()
    drawEllipseBeforeFunc(canvasMarkDataObject)
  } else if (type === 3) {
    // final
    // if (!_this.isPaintedBoolean) {
    let canvasMarkDataObject = _this.canvasMarkDataArray[_this.canvasMarkDataArray.length - 1]
    // let canvasMarkDataObject_2 = _this.anotherCanvasMarkDataArray[_this.canvasMarkDataArray.length - 1]
    // canvasMarkDataObject.completed = true
    setCoreObjectArray(canvasMarkDataObject, "canvasMarkDataObject", "update", null, "completed", true)    
    // setCoreObjectArray(canvasMarkDataObject_2, "canvasMarkDataObject", "update", null, "completed", true)    
    _this.isPaintedBoolean = true
    _this.isEllipsePaintingBoolean = false
    // 重绘
    _this.clearTestFunc()
    _this.reDrawFunc()
    // }
  }
}
// 矩形绘制函数
// type 1 mousedown 2 mouseleave 3 mouseup
function rectanglePaintingFunc (event, type) {
  const r = _this.arcRNumber
  if (type === 1) {
    _this.isPaintedBoolean = false
    _this.isRectPaintingBoolean = true
    // const canvasMarkDataObject = {
    //   id: _this.$Tools.randomString(),
    //   type:'rectangle',   // 矩形
    //   visible: true,
    //   active: false,
    //   color: undefined,
    //   completed:false,    // 是否已完成绘制
    //   centerPointActive:false,    // 是否激活中心点（可以移动多边形）
    //   translateable:false,    // 是否在移动
    //   transformable:false,    // 是否在拉伸
    //   centerPointObject:null,    // 中心点坐标
    //   pointActiveIndex:null,    // 此时激活了多边形的哪个连接点（一个时刻只会有一个）
    //   pointDataArray: [
    //     {
    //       x: event.offsetX,
    //       y: event.offsetY
    //     },
    //     {
    //       x: event.offsetX,
    //       y: event.offsetY
    //     }
    //   ]    // point_0 左上角点 point_1 右下角点 
    // }
    // 把数据对象放进实体类
    const canvasMarkDataObject = new _this.$CanvasMarkDataObject_class(_this.$Tools.randomString(), 'rectangle', event.offsetX, event.offsetY)
    // _this.$set(_this.canvasMarkDataArray, _this.canvasMarkDataArray.length, canvasMarkDataObject)
    setCoreObjectArray(_this.canvasMarkDataArray, "canvasMarkDataArray", "add", _this.canvasMarkDataArray.length, null, canvasMarkDataObject)
    // displayModel -> dataModel
    // 显示模型的数据 - 数据模型的数据
    // 用...运算符实现拷贝（不深）
    const modelDataObject = getCurrentDataModelValue({...canvasMarkDataObject, isDataModel:true}, canvasMarkDataObject.type)
    setCoreObjectArray(_this.anotherCanvasMarkDataArray, "canvasMarkDataArray", "add", _this.anotherCanvasMarkDataArray.length, null, modelDataObject)
  } else if (type === 2) {
    // 拖动时重设右下角点的值
    let canvasMarkDataObject = _this.canvasMarkDataArray[_this.canvasMarkDataArray.length - 1]
    let pointDataArray = canvasMarkDataObject.pointDataArray
    // another
    let pointDataArray_2 = _this.anotherCanvasMarkDataArray[_this.anotherCanvasMarkDataArray.length - 1].pointDataArray
    // pointDataArray[1].x = event.offsetX
    // pointDataArray[1].y = event.offsetY
    setCoreObjectArray(pointDataArray, "pointDataArray", "update", 1, null, {
      x:event.offsetX,
      y:event.offsetY
    })
    // displayModel -> dataModel
    // 显示模型的数据 - 数据模型的数据
    const modelDataObject = getCurrentDataModelSinglePointValue({
      x:event.offsetX,
      y:event.offsetY
    }, "connect")
    setCoreObjectArray(pointDataArray_2, "pointDataArray", "update", 1, null, modelDataObject)
    // 重绘
    _this.clearTestFunc()
    _this.reDrawFunc()
    drawRectBeforeFunc(canvasMarkDataObject)
  } else if (type === 3) {
    // final
    // if (!_this.isPaintedBoolean) {
    let canvasMarkDataObject = _this.canvasMarkDataArray[_this.canvasMarkDataArray.length - 1]
    // another
    let canvasMarkDataObject_another = _this.anotherCanvasMarkDataArray[_this.anotherCanvasMarkDataArray.length - 1]
    // let centerPointObject = canvasMarkDataObject.centerPointObject
    // canvasMarkDataObject.completed = true
    setCoreObjectArray(canvasMarkDataObject, "canvasMarkDataObject", "update", null, "completed", true)
    // 记录中心点
    const new_center = _this.$Painting_tools.calcCenterInPolygon(canvasMarkDataObject.pointDataArray, _this.$Tools.compareVal)
    // canvasMarkDataObject.centerPointObject = new_center
    setCoreObjectArray(canvasMarkDataObject, "canvasMarkDataObject", "update", null, "centerPointObject", new_center)
    // displayModel -> dataModel
    // 显示模型的数据 - 数据模型的数据
    const modelDataObject = getCurrentDataModelSinglePointValue({
      center_x:new_center.center_x,
      center_y:new_center.center_y,
    }, "center")
    setCoreObjectArray(canvasMarkDataObject_another, "canvasMarkDataObject", "update", null, "centerPointObject", modelDataObject)

    _this.isPaintedBoolean = true
    _this.isRectPaintingBoolean = false
    // 重绘
    _this.clearTestFunc()
    _this.reDrawFunc()
    // }
  }
}
// 多边形 记录点的函数
function pointPaintingFunc (event) {
  const r = _this.arcRNumber
  if (!_this.isPointingBoolean) {    
    // alert("???")
    // canvasMarkDataArray.push(new canvasMarkDataObject)
    // console.log(event)
    // const canvasMarkDataObject = {
    //   id: _this.$Tools.randomString(),
    //   type:'polygon',   // 多边形
    //   visible: true,
    //   active: false,
    //   color: undefined,
    //   completed:false,    // 是否已完成绘制
    //   centerPointActive:false,    // 是否激活中心点（可以移动多边形）
    //   translateable:false,    // 是否在移动
    //   transformable:false,    // 是否在拉伸
    //   centerPointObject:null,    // 中心点坐标
    //   pointActiveIndex:null,    // 此时激活了多边形的哪个连接点（一个时刻只会有一个）
    //   pointDataArray: [
    //     {
    //       x: event.offsetX,
    //       y: event.offsetY
    //     }
    //   ]     
    // }
    // 把数据对象放进实体类
    const canvasMarkDataObject = new _this.$CanvasMarkDataObject_class(_this.$Tools.randomString(), 'polygon', event.offsetX, event.offsetY)
    // _this.$set(_this.canvasMarkDataArray, _this.canvasMarkDataArray.length, canvasMarkDataObject)
    setCoreObjectArray(_this.canvasMarkDataArray, "canvasMarkDataArray", "add", _this.canvasMarkDataArray.length, null, canvasMarkDataObject)
    // console.log(_this.canvasMarkDataArray)
    // console.log(_this.canvasMarkDataArray.length - 1)
    // console.log(canvasMarkDataObject)
    // displayModel -> dataModel
    // 显示模型的数据 - 数据模型的数据
    // 用...运算符实现拷贝（不深）
    const modelDataObject = getCurrentDataModelValue({...canvasMarkDataObject, isDataModel:true}, canvasMarkDataObject.type)
    setCoreObjectArray(_this.anotherCanvasMarkDataArray, "canvasMarkDataArray", "add", _this.anotherCanvasMarkDataArray.length, null, modelDataObject)
    // painting
    _this.isPointingBoolean = true    
    _this.$Painting_tools.drawArcFunc(_this.canvasObject, event.offsetX, event.offsetY, r, _this.arcColorString, _this.arcWidthNumber, _this.arcStrokeColorString)
    // drawArcFunc(_this.canvasObject, event.offsetX, event.offsetY, r, _this.arcColorString, _this.arcWidthNumber, _this.arcStrokeColorString)
  } else {
    // canvasMarkDataObject.push(new pointDataArray)      
    let canvasMarkDataObject = _this.canvasMarkDataArray[_this.canvasMarkDataArray.length - 1]
    let pointDataArray = canvasMarkDataObject.pointDataArray
    let prevX,prevY
    if (pointDataArray[pointDataArray.length - 1]) {
      prevX = pointDataArray[pointDataArray.length - 1].x
      prevY = pointDataArray[pointDataArray.length - 1].y
    } else {
      prevX = prevY = null
    }    
    // 检测这一点是否和上一点过近，过近就启动完成判定  
    if (_this.$Painting_tools.checkPointAndPointIsNearFunc(event.offsetX, event.offsetY, prevX, prevY, _this.sqrtStandandNumber)) {
      settlePointFunc(pointDataArray.length)
    } else {      
      // _this.$set(pointDataArray, 
      //   pointDataArray.length, 
      //   {x: event.offsetX, y: event.offsetY})
      setCoreObjectArray(pointDataArray, "pointDataArray", "add", pointDataArray.length, null,
        {x: event.offsetX, y: event.offsetY})
      // _this.$set(_this.canvasMarkDataArray, _this.canvasMarkDataArray.length - 1, canvasMarkDataObject)
      setCoreObjectArray(_this.canvasMarkDataArray, "canvasMarkDataArray", "update", _this.canvasMarkDataArray.length - 1, null, canvasMarkDataObject)
      // displayModel -> dataModel
      // 显示模型的数据 - 数据模型的数据
      const canvasMarkDataObject_another = _this.anotherCanvasMarkDataArray[_this.anotherCanvasMarkDataArray.length - 1]
      setCoreObjectArray(
        canvasMarkDataObject_another.pointDataArray,
        "pointDataArray",
        "add", 
        pointDataArray.length, 
        null,
        getCurrentDataModelSinglePointValue({x: event.offsetX, y: event.offsetY}, "connect")
      )
      setCoreObjectArray(_this.anotherCanvasMarkDataArray, "canvasMarkDataArray", "update", _this.anotherCanvasMarkDataArray.length - 1, null, canvasMarkDataObject_another)
      // painting
      _this.$Painting_tools.drawArcFunc(_this.canvasObject, event.offsetX, event.offsetY, r, _this.arcColorString, _this.arcWidthNumber, _this.arcStrokeColorString)
      // drawArcFunc(_this.canvasObject, event.offsetX, event.offsetY, r, _this.arcColorString, _this.arcWidthNumber, _this.arcStrokeColorString)
    }       
  }
}
// canvasMarkDataArray 的所有增删改归于一个函数管理
// a target b name c status d index e key f value
// name: [canvasMarkDataArray, canvasMarkDataObject, centerPointObject, pointDataArray]
function setCoreObjectArray(target, name, status, index, key, value){
  // console.log("===" + name)
  // 总数组
  if (name === "canvasMarkDataArray") {
    if (status === "add") {
      _this.$set(target, target.length, value)
      return
    }
    if (status === "update") {
      _this.$set(target, index, value)
      return
    }
    if (status === "delete") {
      _this.$delete(target, index)
      return
    }
  }
  // 一个图形的对象
  if (name === "canvasMarkDataObject") {
    if (status === "update") {
      if (typeof value === "boolean" || typeof value === "number" || typeof value === "null" || typeof value === "object") {
        target[key] = value
        return
      }
    }
  }
  // 一个图形对象的点数组
  if (name === "pointDataArray") {
    if (status === "add") {
      _this.$set(target, target.length, value)
      return
    }
    if (status === "update") {
      _this.$set(target, index, value)
      return
    }
    if (status === "delete") {
      _this.$delete(target, index)
      return
    }
  }
  // 一个图形对象的点数组中的一个对象
  // if (name === "pointDataObject") {
  //   if (status === "update") {
  //     target = value
  //     return
  //   }
  // }
}
// 删除点的函数
function pointDeleteFunc (event) {
  const x = event.offsetX, y = event.offsetY
  let catch_item, catch_index
  try {
    let delete_index = -1
    _this.canvasMarkDataArray.forEach((item, index) => {
      // 计算中心点
      // result boolean
      const result = _this.$Tools.centerPointDeleteFunc(item, index, x, y, _this.centerPointHoverJudgeNumber, _this.$Painting_tools.calcPointDistanceFunc)
      // 如果返回true就跳出foreach
      if (result) {
        catch_item = item
        catch_index = index
        // console.log(catch_item)
        throw new Error("end_foreach");
      } 
      // 计算连接点
      let delete_child_index = -1
      item.pointDataArray.forEach((child_item, child_index) => {
        let point_x = child_item.x
        let point_y = child_item.y
        // let hori = point_x - x    // 横向距离
        // let vert = point_y - y    // 纵向距离
        // 连接点与鼠标的距离
        // let distance = Math.sqrt(hori*hori + vert*vert)
        let distance = _this.$Painting_tools.calcPointDistanceFunc(x, y, point_x, point_y)
        let judge_number = _this.arcRNumber + _this.arcWidthNumber - 1  // 5
        // 只有没画完的点才能删除
        if (distance < judge_number && !item.completed) {
          delete_child_index = child_index
          return
        }
      })
      // 删除某个点
      // _this.$delete(item.pointDataArray, delete_child_index)
      setCoreObjectArray(item.pointDataArray, "pointDataArray", "delete", delete_child_index, null, null)
      // 对应的dataModelObject也要删除
      setCoreObjectArray(_this.anotherCanvasMarkDataArray[index].pointDataArray, "pointDataArray", "delete", delete_child_index, null, null)
      // 如果发现某个多边形已经没有点了 则删除这个多边形对象
      if (item.pointDataArray.length === 0) {
        delete_index = index
        // 关闭绘制状态
        _this.isPointingBoolean = false
        return
      }
    })
    if (delete_index > -1) {
      // _this.$delete(_this.canvasMarkDataArray, delete_index)
      setCoreObjectArray(_this.canvasMarkDataArray, "canvasMarkDataArray", "delete", delete_index, null, null)
      // 对应的dataModelObject也要删除
      setCoreObjectArray(_this.anotherCanvasMarkDataArray, "canvasMarkDataArray", "delete", delete_index, null, null)
    }
  } catch (error) {
    if (error.message === "end_foreach") {
      // catch_index 可能是0 所以不能用
      if (!catch_item) {
        return
      }
      if (confirm("确定删除这个多边形？")) {
        // _this.$delete(_this.canvasMarkDataArray, catch_index)
        setCoreObjectArray(_this.canvasMarkDataArray, "canvasMarkDataArray", "delete", catch_index, null, null)
        // 对应的dataModelObject也要删除
        setCoreObjectArray(_this.anotherCanvasMarkDataArray, "canvasMarkDataArray", "delete", catch_index, null, null)
        if (_this.canvasMarkDataArray.length === 0) {
          checkCanvasMarkDataArrayFunc()
        }
      }
    }
  }    
  // 激活重绘
  _this.clearTestFunc()
  _this.reDrawFunc()
}
// 检查想删除的点是不是中心点
function centerPointDeleteFunc (item, index, x, y, judge_number, func) {
  // 如果多边形没画完，就不存在中心点
  if (!item.completed || !item.centerPointObject) {
    return false
  }
  const center_x = item.centerPointObject.center_x, 
    center_y = item.centerPointObject.center_y;
  // 横向距离  纵向距离
  // const hori = center_x - x, vert = center_y - y
  // const distance = Math.sqrt(hori*hori + vert*vert)
  let distance = func(x, y, center_x, center_y)
  // const judge_number = _this.centerPointHoverJudgeNumber
  if (distance < judge_number) {
    return true
  } else {
    return false
  }
}
// displayModel -> dataModel
// 把显示模型的数据转成数据模型
// type ellipse rectangle polygon
function getCurrentDataModelValue(canvasMarkDataObject, type){
  // console.log("getCurrentDataModelValue")
  // canvasMarkDataObject.isDataModel2 = true
  // prototype 原型 scroll 实际 view 差值
  const zoom_number = _this.zoomNumberArray[_this.zoomIndexNumber],
    proto_obj = _this.prototypeXYCoordinateObject,
    standand_number = _this.directionStandandValueNumber,
    view_coordinate = _this.viewXYCoordinateObject;
  // zoom为 1时直接返回原对象错误（因为引用的问题，所以不能直接返回原对象）
  if (false) {
    // return canvasMarkDataObject
  } else {
    if (type === "ellipse") {
      // console.log(canvasMarkDataObject)
      let {center_x, center_y} = canvasMarkDataObject.centerPointObject
      // console.log({x, y})
      // console.log(proto_obj)
      // A = (width - width / zoom比例) / 2
      // B = A + ([display]x / zoom比例)
      // C = B + (方向键值 * 方向值单位)
      // console.log(_this.prototypeXYCoordinateObject)
      // console.log(proto_obj.x, center_x / zoom_number, view_coordinate.x * standand_number)
      const x_calc = (num) => proto_obj.x + num / zoom_number + view_coordinate.x
      const y_calc = (num) => proto_obj.y + num / zoom_number + view_coordinate.y
      const obj = {
        center_x: parseInt(x_calc(center_x)),
        center_y: parseInt(y_calc(center_y))
      }
      // console.log(obj)
      // 把修改后的值赋值给(dataModel)canvasMarkDataObject
      canvasMarkDataObject.centerPointObject = obj      
      // canvasMarkDataObject.pointDataArray[0] = {
      //   x:obj.center_x,
      //   y:obj.center_y
      // }
      canvasMarkDataObject.pointDataArray = [
        {
          x:obj.center_x,
          y:obj.center_y
        },
        {
          x:obj.center_x,
          y:obj.center_y
        }
      ]      
      return canvasMarkDataObject
    } else if (type === "rectangle" || type === "polygon") {
      const x_calc = (num) => proto_obj.x + num / zoom_number + view_coordinate.x
      const y_calc = (num) => proto_obj.y + num / zoom_number + view_coordinate.y
      let arr = []
      let origin_arr = canvasMarkDataObject.pointDataArray
      origin_arr.forEach((item, index) => {
        let obj = {}
        const x = item.x,
          y = item.y;
        obj.x = parseInt(x_calc(x))
        obj.y = parseInt(y_calc(y))
        arr.push(obj)
      })
      origin_arr = null
      canvasMarkDataObject.pointDataArray = arr
      return canvasMarkDataObject
    } else if (type === "polygon") {
      return
    }
  }
}
// displayModel -> dataModel
// 把显示模型的数据转成数据模型
// 当数据是只有xy值的对象时用这个
// type connect 连接点 center 中心点
// prototype 原型 scroll 实际 view 差值
function getCurrentDataModelSinglePointValue(singlePointObject, type){
  if (!(type === "connect" || type === "center")) {
    console.warn("getCurrentDataModelSinglePointValue type ERROR: unknown type " + `=${type}=`)
  }
  // console.log(type)
  const zoom_number = _this.zoomNumberArray[_this.zoomIndexNumber],
    proto_obj = _this.prototypeXYCoordinateObject,
    standand_number = _this.directionStandandValueNumber,
    view_coordinate = _this.viewXYCoordinateObject;
  // zoom为 1时直接返回原对象
  if (zoom_number === 1) {
    return singlePointObject
  } else {
    let x, y
    type === "connect" ? x = singlePointObject.x : x = singlePointObject.center_x
    type === "connect" ? y = singlePointObject.y : y = singlePointObject.center_y
    const x_calc = (num) => proto_obj.x + num / zoom_number + view_coordinate.x
    const y_calc = (num) => proto_obj.y + num / zoom_number + view_coordinate.y
    let obj
    type === "connect" ? obj = {x:parseInt(x_calc(x)), y:parseInt(y_calc(y))} : obj = {center_x:parseInt(x_calc(x)), center_y:parseInt(y_calc(y))}
    // type === "center" ? obj = {center_x:x_calc(x), center_y:y_calc(y)} : ''
    // console.log(obj)
    return obj
  }
}
// 双击时删除多余的点（已废弃）
function deletePointBecauseDblclickFunc(){
  if (!_this.canvasMarkDataArray[_this.canvasMarkDataArray.length - 1]) {
    return
  }
  let canvasMarkDataObject = _this.canvasMarkDataArray[_this.canvasMarkDataArray.length - 1]
  let pointDataArray = canvasMarkDataObject.pointDataArray
  _this.$delete(pointDataArray, pointDataArray.length - 1)
  _this.$delete(pointDataArray, pointDataArray.length - 1)
  _this.$set(_this.canvasMarkDataArray, _this.canvasMarkDataArray.length - 1, canvasMarkDataObject)
}
// 鼠标中键移动底图的函数 （已作废）
function moveImageCanvasFunc(event, type){
  // const zoom_number = _this.zoomIndexNumber
  // const zoom = _this.zoomNumberArray[zoom_number]  
  // // 1被率时无法移动
  // if (!zoom_number) {
  //   return
  // }
  // // display_model
  // const mouse_display_coor = {
  //   x:event.offsetX,
  //   y:event.offsetY
  // }
  // // data_model
  // const data_model_coor = _this.getDataModelValueInScroll(mouse_display_coor, _this.scrollViewCoorObject, zoom)  
  // // 注入到end对象
  // if (type === 1) {
  //   _this.mouseMiddleMoveStartCoorObject = {
  //     x:data_model_coor.x,
  //     y:data_model_coor.y
  //   }
  // } else if (type === 2) {    
  //   _this.mouseMiddleMoveEndCoorObject = {
  //     x:data_model_coor.x,
  //     y:data_model_coor.y
  //   }  
  //   // 比对start和end对象
  //   const sub_coor_obj = {
  //     x:_this.mouseMiddleMoveEndCoorObject.x - _this.mouseMiddleMoveStartCoorObject.x,
  //     y:_this.mouseMiddleMoveEndCoorObject.y - _this.mouseMiddleMoveStartCoorObject.y
  //   }    
  //   if (sub_coor_obj.x !== 0 || sub_coor_obj.y !== 0) {
  //     console.log(sub_coor_obj.x)      
  //     _this.scrollViewCoorObject.x = _this.scrollViewCoorObject.x + sub_coor_obj.x
  //     _this.scrollViewCoorObject.y = _this.scrollViewCoorObject.y + sub_coor_obj.y
  //     _this.viewXYCoordinateObject.x = _this.viewXYCoordinateObject.x + sub_coor_obj.x
  //     _this.viewXYCoordinateObject.y = _this.viewXYCoordinateObject.y + sub_coor_obj.y
  //     // 检验改变后的值是否合法
  //     const range_obj = _this.checkXYCurrentRangeFunc()
  //     let scroll_coor_x = _this.scrollViewCoorObject.x
  //     let scroll_coor_y = _this.scrollViewCoorObject.y
  //     scroll_coor_x < range_obj.x[0] ? scroll_coor_x = range_obj.x[0] : ''
  //     scroll_coor_x > range_obj.x[1] ? scroll_coor_x = range_obj.x[1] : ''
  //     scroll_coor_y < range_obj.y[0] ? scroll_coor_y = range_obj.y[0] : ''
  //     scroll_coor_y > range_obj.y[1] ? scroll_coor_y = range_obj.y[1] : ''
  //     if (false) {
       
  //     } else {
  //       const result = {
  //         x:scroll_coor_x,
  //         y:scroll_coor_y,
  //         w:_this.canvasOriginSizeObject.width,
  //         h:_this.canvasOriginSizeObject.height,
  //         now_w:parseInt(_this.canvasOriginSizeObject.width / zoom),
  //         now_h:parseInt(_this.canvasOriginSizeObject.height / zoom)
  //       }        
  //       _this.renderAfterZoomChange(result.x, result.y, result.w, result.h, result.now_w, result.now_h, '')
  //       _this.mouseMiddleMoveStartCoorObject = _this.mouseMiddleMoveEndCoorObject
  //     }    
  //   }
  // }
}
// 绘制线函数
// function drawPointLineFunc (canvas, pointDataArray, lineColorString, lineWidthNumber) {
//   let ctx = canvas 
//   ctx.beginPath();
//   pointDataArray.forEach((item, index)=>{
//     if (index === 0) {
//       ctx.moveTo(item.x, item.y)
//     } else {
//       ctx.lineTo(item.x, item.y)
//     }
//   })
//   ctx.strokeStyle = lineColorString;
//   ctx.lineWidth = lineWidthNumber;
//   ctx.closePath();
//   ctx.stroke()
// }
// 画椭圆入口
// item: canvasMarkDataObject
// x为椭圆中心横坐标，y为椭圆中心纵坐标，a为椭圆横半轴长，b为椭圆纵半轴长。
function drawEllipseBeforeFunc(item){
  const x = item.centerPointObject.center_x,
    y = item.centerPointObject.center_y,
    a = item.pointDataArray[0].x - item.centerPointObject.center_x, // 控制点坐标 - 中心点坐标
    b = item.pointDataArray[0].y - item.centerPointObject.center_y;
  // drawEllipseFunc(_this.canvasObject, x, y, a, b, "red", 1, "red")
  _this.$Painting_tools.drawEllipseFunc(_this.canvasObject, x, y, a, b, "red", 1, "red")
}
// 画矩形入口
function drawRectBeforeFunc(item){
  // _this.canvasMarkDataArray.forEach((item, index) => {
    // if (item.type === "rectangle") {
      const x0 = item.pointDataArray[0].x,
        y0 = item.pointDataArray[0].y,
        x1 = item.pointDataArray[1].x,
        y1 = item.pointDataArray[1].y;
      _this.$Painting_tools.drawRectFunc(_this.canvasObject, x0, y0, x1, y1, "red", 1, "red")
      // drawRectFunc(_this.canvasObject, item.pointDataArray[0].x, item.pointDataArray[0].y, item.pointDataArray[1].x, item.pointDataArray[1].y, "red", 1, "red")
    // }
  // })
}
// 绘制椭圆函数
//---------使用三次贝塞尔曲线模拟椭圆2
// function drawEllipseFunc(canvas, x, y, a, b, rectFillColorString, rectWidthNumber, rectStrokeColorString){
//   let ctx = canvas
//   let k = .5522848,
//   ox = a * k, // 水平控制点偏移量
//   oy = b * k; // 垂直控制点偏移量

//   ctx.beginPath();
//   ctx.lineWidth = rectWidthNumber;
//   ctx.strokeStyle = rectStrokeColorString;
//   //从椭圆的左端点开始顺时针绘制四条三次贝塞尔曲线
//   ctx.moveTo(x - a, y);
//   ctx.bezierCurveTo(x - a, y - oy, x - ox, y - b, x, y - b);
//   ctx.bezierCurveTo(x + ox, y - b, x + a, y - oy, x + a, y);
//   ctx.bezierCurveTo(x + a, y + oy, x + ox, y + b, x, y + b);
//   ctx.bezierCurveTo(x - ox, y + b, x - a, y + oy, x - a, y);
//   ctx.closePath();
//   ctx.stroke();
// }
// 绘制矩形函数
// x0, y0 起始点 x1, y1 当前点
// function drawRectFunc(canvas, x0, y0, x1, y1, rectFillColorString, rectWidthNumber, rectStrokeColorString){
//   let ctx = canvas
//   let point_0_size = Math.sqrt(x0*x0 + y0*y0)
//   let point_1_size = Math.sqrt(x1*x1 + y1*y1)
//   let width = Math.round(Math.abs(x1 - x0))
//   let height = Math.round(Math.abs(y1 - y0))
//   // ctx.strokeStyle = _this.lineColorString
//   // 正向画与逆向画
//   let x, y
//   if (point_1_size > point_0_size) {
//     x = x0, y = y0
//   } else {
//     x = x1, y = y1
//   }
//   x = x + 0.5
//   y = y + 0.5
//   ctx.beginPath();
//   // ctx.fillStyle = rectFillColorString;
//   ctx.lineWidth = rectWidthNumber;
//   ctx.strokeStyle = rectStrokeColorString;
//   ctx.rect(x, y, width, height)
//   ctx.closePath();
//   ctx.stroke()
// }
// 绘制标记圆函数
// function drawArcFunc(canvas, x, y, r, arcColorString, arcWidthNumber, arcStrokeColorString){
//   let ctx = canvas  
//   ctx.beginPath();
//   ctx.fillStyle = arcColorString;
//   ctx.lineWidth = arcWidthNumber;
//   ctx.strokeStyle = arcStrokeColorString;
//   ctx.arc(x, y, r, 0, 2*Math.PI);  
//   ctx.closePath();
//   ctx.stroke()
//   ctx.fill()
// }
// 重绘用 画圆入口
function drawArcBeforeFunc(pointDataArray, pointActiveIndex, type){
  const r = _this.arcRNumber
  pointDataArray.forEach((item, index) => {
    // console.log(item)
    let arc_color
    if (type === "polygon" || type === "rectangle" || type === "ellipse") {
      pointActiveIndex === index ? arc_color = _this.arcMouseNearColorString : arc_color = _this.arcColorString
    } else {
      arc_color = _this.arcColorString
    }
    _this.$Painting_tools.drawArcFunc(_this.canvasObject, item.x, item.y, r, arc_color, _this.arcWidthNumber, _this.arcStrokeColorString)    
    // drawArcFunc(_this.canvasObject, item.x, item.y, r, arc_color, _this.arcWidthNumber, _this.arcStrokeColorString)
  })
}
// 重绘用 画中心点-圆入口
function drawCenterArcBeforeFunc(centerPointObject, centerAcitveBoolean){
  // console.log("centerAcitveBoolean")
  // console.log(centerAcitveBoolean)
  let arc_color
  centerAcitveBoolean ? arc_color = _this.centerArcMouseNearColorString : arc_color = _this.arcColorString
  _this.$Painting_tools.drawArcFunc(_this.canvasObject, centerPointObject.center_x, centerPointObject.center_y, _this.arcRNumber, arc_color, _this.arcWidthNumber, _this.centerArcStrokeColorString)
  // drawArcFunc(_this.canvasObject, centerPointObject.center_x, centerPointObject.center_y, _this.arcRNumber, arc_color, _this.arcWidthNumber, _this.centerArcStrokeColorString)
}
// 检查两点是否过近
// function checkPointAndPointIsNearFunc (x, y, p_x, p_y, standand) {
//   // const standand = standand
//   if (!p_x || !p_y) {
//     return false
//   }
//   let across = Math.abs(x - p_x)
//   let release = Math.abs(y - p_y)
//   let distance = Math.sqrt(across*across + release*release)
//   if (distance < standand) {
//     return true
//   } else {
//     return false
//   }
// }
// 结算入口，如果可以结算就绘制
function settlePointFunc (length) {
  const min = _this.minPointNumNumber
  if (length < min) {
    alert("最少要画3个点")
    return
  } else {
    let canvasMarkDataObject = _this.canvasMarkDataArray[_this.canvasMarkDataArray.length - 1]
    let pointDataArray = canvasMarkDataObject.pointDataArray

    let canvasMarkDataObject_another = _this.anotherCanvasMarkDataArray[_this.anotherCanvasMarkDataArray.length - 1]
    try {
      _this.$Painting_tools.drawPointLineFunc(_this.canvasObject, pointDataArray, _this.lineColorString, _this.lineWidthNumber)
      drawCenterArcFunc(pointDataArray, canvasMarkDataObject)
      // 数据模型相关对象注入中心点
      setAnotherCenterArc(canvasMarkDataObject_another.pointDataArray, canvasMarkDataObject_another)
      // 复制备用对象
      // _this.anotherCanvasMarkDataArray = _this.canvasMarkDataArray
      _this.isPointingBoolean = false    // 正在绘制
      _this.isPaintedBoolean = true    // 绘制过
      // canvasMarkDataObject.completed = true
      setCoreObjectArray(canvasMarkDataObject, "canvasMarkDataObject", "update", null, "completed", true)
    } catch(error) {
      // console.log(error)
      // canvasMarkDataObject.completed = false
    }    
  }
}
// 绘制多边形中心点
function drawCenterArcFunc(pointDataArray, canvasMarkDataObject){
  let obj = _this.$Painting_tools.calcCenterInPolygon(pointDataArray, _this.$Tools.compareVal)
  canvasMarkDataObject.centerPointObject = obj    // 把中心点坐标放进多边形对象
  // console.log(obj)
  const r = _this.arcRNumber
  let arc_color = _this.arcColorString  
  let ctx = _this.canvasObject
  _this.$Painting_tools.drawArcFunc(_this.canvasObject, obj.center_x, obj.center_y, r, arc_color, _this.arcWidthNumber, _this.centerArcStrokeColorString)
  // drawArcFunc(_this.canvasObject, obj.center_x, obj.center_y, r, arc_color, _this.arcWidthNumber, _this.centerArcStrokeColorString)
  // ctx.fillStyle = _this.arcColorString;
  // ctx.lineWidth = _this.arcWidthNumber;
  // ctx.strokeStyle = _this.centerArcStrokeColorString;
  // ctx.beginPath();
  // ctx.arc(obj.center_x, obj.center_y, _this.arcRNumber, 0, 2*Math.PI);  
  // ctx.closePath();
  // ctx.stroke()
  // ctx.fill()
}
function setAnotherCenterArc(pointDataArray, canvasMarkDataObject){
  let obj = _this.$Painting_tools.calcCenterInPolygon(pointDataArray, _this.$Tools.compareVal)
  canvasMarkDataObject.centerPointObject = obj    // 把中心点坐标放进多边形对象
}
// 计算多边形中心点坐标
// function calcCenterInPolygon(pointDataArray, func){
//   let x_value_arr = [], y_value_arr = []
//   pointDataArray.forEach((item, index) => {
//     x_value_arr.push(item.x)
//     y_value_arr.push(item.y)
//   })
//   // console.log(x_value_arr)
//   // console.log(y_value_arr)
//   let x_obj = func(x_value_arr)
//   // let x_obj = _this.$Tools.compareVal(x_value_arr)
//   let y_obj = func(y_value_arr)
//   // let y_obj = _this.$Tools.compareVal(y_value_arr)
//   // console.log(x_obj, y_obj)
//   let center_x = Math.abs(parseInt((x_obj.max + x_obj.min) / 2))
//   let center_y = Math.abs(parseInt((y_obj.max + y_obj.min) / 2))
//   return {center_x, center_y}
//   // let x_max_point_obj = pointDataArray[x_obj.max_index]
//   // let x_min_point_obj = pointDataArray[x_obj.min_index]
//   // let y_max_point_obj = pointDataArray[y_obj.max_index]
//   // let y_min_point_obj = pointDataArray[y_obj.min_index]
//   // console.log(x_max_point_obj, x_min_point_obj, y_max_point_obj, y_min_point_obj)
// }
// var aaaaaaa = 1;
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.image-canvas-wrapper {
  width: 80vh;
  height: 80vh;
  margin: 0 auto;
}

.image-canvas {
  width: 100%;
  height: 100%;
}

.fixed{
  position: fixed;
  right: 5px;
  top:5px;
  border: 1px solid #666;
  width:200px;
  height: 80vh;
  overflow: auto;
}
.direction-control{
  width: 90px;
  height: 90px;
  display: flex;
  flex-wrap: wrap;
}
.direction-control div{
  width: 30px;
  height: 30px;
}
.direction-control div:nth-child(even){
  background: lightblue;
}
</style>
