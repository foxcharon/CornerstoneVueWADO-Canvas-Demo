<template>
  <div>
    <div class="image-canvas-wrapper"  oncontextmenu="return false" unselectable='on' onselectstart='return false;'
      onmousedown='return false;'>
      <!-- DICOM CANVAS -->
        <span id="loadProgress">Diocm加载: </span>
        <!-- <div> -->
          <div ref="canvas" class="image-canvas" oncontextmenu="return false"></div>
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
      <ul v-if="canvasMarkDataArray[0]">
        <li v-for="(item,index) in canvasMarkDataArray[ canvasMarkDataArray.length-1 ].pointDataArray">
          {{ item.x + "-" + item.y }}
        </li>
      </ul>
      <button @click="submitTestFunc">selectValueString</button>
      <button @click="clearAllDataFunc">clear</button>
      <button @click="moveTestFunc">move</button>
      <select v-model="selectColorFilterString">
        <option value="0">正常</option>
        <option value="1">反色</option>
      </select>
    </div>
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
var config = {
  webWorkerPath: "/static/dist/cornerstoneWADOImageLoaderWebWorker.js",
  taskConfiguration: {
    decodeTask: {
      codecsPath: "/static/dist/cornerstoneWADOImageLoaderCodecs.js"
    }
  }
};
cornerstoneWADOImageLoader.webWorkerManager.initialize(config);
var _this = null
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
      canvasOriginDataObject:null,   // CanvasRenderingContext2D-imgdata-origin
      canvasMarkDataArray:[],    // 记录canvas标注数据的数组
      anotherCanvasMarkDataArray:[],    // 记录canvas标注数据的数组
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
      canvasSizeObject:null,    // 记录现canvas大小的对象
      polygonLatingAndFormingIsDisconnectedBoolean:false,    // 鼠标拖动或拉伸多边形时与多边形失去连接
      isRectPaintingBoolean:false,    // 是否正在绘制矩形
      isEllipsePaintingBoolean:false,    // 是否正在绘制椭圆
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
      cornerstoneTools.mouseInput.enable(canvas);
      cornerstoneTools.mouseWheelInput.enable(canvas);
      cornerstoneTools.touchInput.enable(canvas);

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
      this.repeatGetCanvasDataFunc()
      // this.canvasOriginObject = this.canvasObject
      // console.log(this.canvasObject)
      // console.log(this.$tools.randomString())
      // console.log($)
      // this.canvasObject.save()
      // this.canvasOriginObject.save()
      // this.canvasOriginDataObject = this.canvasObject.getImageData(0, 0, 526, 526)
      // console.log(this.canvasOriginDataObject)
      // setTimeout(()=>{
        // this.canvasOriginDataObject = this.canvasObject.getImageData(0, 0, 526, 526)
        // console.log(this.canvasOriginDataObject)
        // console.log(new Date().getTime())
        // this.canvasOriginDataObject.forEach((data, index)=>{
        // })
        // console.log(new Date().getTime())
      // },100)
      // this.$nextTick(function(){
      //   this.canvasOriginDataObject = this.canvasObject.getImageData(0, 0, 526, 526)
      //   console.log(this.canvasOriginDataObject)
      // })
    },
    repeatGetCanvasDataFunc(){
      // console.log("repeatGetCanvasDataFunc")
      const width = this.canvasSizeObject.width, height = this.canvasSizeObject.height
      this.canvasOriginDataObject = this.canvasObject.getImageData(0, 0, width, height)
      if (this.canvasOriginDataObject.data[3] !== 0) {
        // const Color = this.$color
        // let color_array = new this.$Color_class(this.canvasObject.getImageData(0, 0, width, height).data)
        // let color_result = color_array.get_reverse
        // console.log(color_result)
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
      // console.log("clearTestFunc")
      this.canvasObject.putImageData(this.canvasOriginDataObject, 0, 0)
      // console.log(this.canvasOriginDataObject)
    },
    moveTestFunc(){
      this.clearTestFunc()  // 清空之前的绘制 < 1ms
      this.movePointFunc()  // 移动某个图形 1ms
      this.reDrawFunc()    // 按照记录重绘 1ms
    },
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
          drawRectBeforeFunc(item)
          drawArcBeforeFunc(item.pointDataArray, item.pointActiveIndex, item.type)
          drawCenterArcBeforeFunc(item.centerPointObject, item.centerPointActive)
        }
        // 绘制矩形
        if (item.completed && item.type === "rectangle") {
          drawRectBeforeFunc(item)
          drawArcBeforeFunc(item.pointDataArray, item.pointActiveIndex, item.type)
          drawCenterArcBeforeFunc(item.centerPointObject, item.centerPointActive)
        }
        // 绘制椭圆
        if (item.completed && item.type === "ellipse") {
          drawEllipseBeforeFunc(item)
          drawArcBeforeFunc(item.pointDataArray, item.pointActiveIndex, item.type)
          drawCenterArcBeforeFunc(item.centerPointObject, item.centerPointActive)
        }
      })
      // 复制备用对象
      _this.anotherCanvasMarkDataArray = _this.canvasMarkDataArray
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
    changeCanvasColorFilterFunc(canvas, new_color_array){
      // console.log(this.canvasOriginDataObject)
      // console.log(new_color_array)
      this.clearTestFunc()
      const width = this.canvasSizeObject.width, 
        height = this.canvasSizeObject.height;
      let c = this.canvasObject.getImageData(0, 0, width, height)
      this.updateArrayValue(c.data, new_color_array)
      this.canvasObject.putImageData(c, 0, 0)
      this.reDrawFunc()
    },
    // update uint8array
    updateArrayValue(c, d){
      d.forEach((item, index)=>{
        c[index] = item
      })
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
        // this.canvasOriginDataObject = this.canvasObject.getImageData(0, 0, this.canvasSizeObject.width, this.canvasSizeObject.height)
      }
    },
    // 色彩滤镜选项
    selectColorFilterString:function(new_value, old_value){
      // console.log(JSON.parse(JSON.stringify({width:111,height:[111,222,333]})))
      // let new_color_obj = JSON.parse(JSON.stringify(this.canvasOriginDataObject));
      // console.log(JSON.stringify(this.canvasOriginDataObject))
      // let new_color_obj = {
      //   width:this.canvasOriginDataObject.width,
      //   height:this.canvasOriginDataObject.height,
      //   data:this.canvasOriginDataObject.data
      // }
      function aaa(element, index, array) {
        return element >= 0;
      }
      let new_color_obj = {...this.canvasOriginDataObject}
      let arr = new_color_obj.data
      let arr_2 = arr.filter(aaa)
      let color_array = new this.$Color_class(arr_2)
      let new_color_array
      if (new_value === "0") {
        new_color_array = color_array.get_normal
      } else if (new_value === "1") {
        new_color_array = color_array.get_reverse
      }
      this.changeCanvasColorFilterFunc(this.canvasObject, new_color_array)
    }
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
          console.log("click")
          // console.log(_this.selectValueString)
          // 如果刚刚处于与多边形失去连接状态
          if (_this.polygonLatingAndFormingIsDisconnectedBoolean) {
            console.log("click1")
            _this.polygonLatingAndFormingIsDisconnectedBoolean = false
            return
          }
          // 如果处于可移动或者拉伸某多边形状态就不启动绘制函数
          if (_this.isMouseCanTranslatePolygonBoolean || _this.isMouseTranslatingPolygonBoolean || _this.isMouseCanTransformPolygonBoolean || _this.isMouseTransformingPolygonBoolean) {
            console.log("click2")
            // console.log(_this.isMouseCanTranslatePolygonBoolean)
            // console.log(_this.isMouseTranslatingPolygonBoolean)
            // console.log(_this.isMouseCanTransformPolygonBoolean)
            // console.log(_this.isMouseTransformingPolygonBoolean)
            return
          }
          // 如果不在绘制选项中就不绘制
          if (_this.selectValueString !== "1") {
            console.log("click3")
            return
          }
          // 多边形
          if (_this.selectValueString === "1") {
            console.log("click4")
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
            let x = event.offsetX, y = event.offsetY
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
              let x_ed = item.centerPointObject ? item.centerPointObject.center_x : -999999
              let y_ed = item.centerPointObject ? item.centerPointObject.center_y : -999999
              // let hori = x_ed - x    // 横向距离
              // let vert = y_ed - y    // 纵向距离
              // 中心点与鼠标的距离
              // let distance = Math.sqrt(hori*hori + vert*vert)
              const distance = calcPointDistanceFunc(x, y, x_ed, y_ed)              
              if (distance < judge_number) {
                item.translateable = true
                item.centerPointActive = true
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
                    item.centerPointObject.center_x = item.centerPointObject.center_x + coor_x_distance
                    item.centerPointObject.center_y = item.centerPointObject.center_y + coor_y_distance
                    // 多边形坐标点重新赋值
                    item.pointDataArray.forEach((child_item, child_index)=>{
                      child_item.x = child_item.x + coor_x_distance
                      child_item.y = child_item.y + coor_y_distance
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
                item.translateable = false
                item.centerPointActive = false
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
                pointDataArray.forEach((child_item, child_index) => {
                  // x y 是鼠标此时的点 连接点需要别的标识符
                  const point_x = child_item.x, point_y = child_item.y
                  // const child_hori = point_x - x, child_vert = point_y - y
                  // const child_distance = Math.sqrt(child_hori*child_hori + child_vert*child_vert)
                  const child_distance = calcPointDistanceFunc(x, y, point_x, point_y)
                  // console.log(child_distance)
                  if (child_distance < child_judge_number) {
                    item.pointActiveIndex = child_index
                    child_point_is_marked = true
                    haveATransformingPolygon = true
                    // item.transformable
                    item.transformable = true
                    // item.centerPointActive = true
                    // 如果鼠标不和任何一个连接点挨着
                    // console.log(item.pointActiveIndex)
                  } else if (!haveATransformingPolygon && (child_index === pointDataArray.length - 1)) {
                    _this.isMouseCanTransformPolygonBoolean = false
                    item.transformable = false
                    // ???
                    item.pointActiveIndex = null
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
                  transform_coor_obj.x = transform_coor_obj.x + coor_x_distance
                  transform_coor_obj.y = transform_coor_obj.y + coor_y_distance                                  
                  // 修正
                  obj_a.x = obj_b.x
                  obj_a.y = obj_b.y
                  // 中心点坐标重设
                  const new_center = _this.$Painting_tools.calcCenterInPolygon(item.pointDataArray, _this.$Tools.compareVal)
                  item.centerPointObject = new_center
                }
              }
              // 如果找中心点，就不点亮连接点
              if (distance < judge_number) {
                item.pointActiveIndex = null
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
          // console.log(!_this.isPaintedBoolean)
          if (_this.isRectPaintingBoolean && _this.selectValueString === "2") {            
            rectanglePaintingFunc(event, 2)            
          }
          // 椭圆绘制
          if (_this.isEllipsePaintingBoolean && _this.selectValueString === "3") {            
            ellipsePaintingFunc(event, 2)
          }
        })
    // onmousedown
    $(document)
        .off("mousedown", ".image-canvas")
        .on("mousedown", ".image-canvas", function(event) {
          console.log("mousedown")
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
        })
}
// 计算两点距离公共方法
// x0 y0 鼠标此时的坐标 x1 y1 参照点的坐标
function calcPointDistanceFunc(x0, y0, x1, y1){
  if (x1 === -999999 || y1 === -999999) {
    return 999999
  }
  let hori = x1 - x0    // 横向距离
  let vert = y1 - y0    // 纵向距离
  return Math.sqrt(hori*hori + vert*vert)
}
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
//
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
    _this.$set(_this.canvasMarkDataArray, _this.canvasMarkDataArray.length, canvasMarkDataObject)
  } else if (type === 2) {
    // console.log("???")
    // 拖动时重设右下角点的值
    let canvasMarkDataObject = _this.canvasMarkDataArray[_this.canvasMarkDataArray.length - 1]
    let pointDataArray = canvasMarkDataObject.pointDataArray
    // 椭圆只有一个控制点
    pointDataArray[0].x = event.offsetX
    pointDataArray[0].y = event.offsetY
    // 算中心点 和控制点0 的差值
    let hori = canvasMarkDataObject.centerPointObject.center_x - event.offsetX
    let vert = canvasMarkDataObject.centerPointObject.center_y - event.offsetY
    pointDataArray[1].x = canvasMarkDataObject.centerPointObject.center_x + hori
    pointDataArray[1].y = canvasMarkDataObject.centerPointObject.center_y + vert
    // console.log(pointDataArray)
    // 重绘
    _this.clearTestFunc()
    _this.reDrawFunc()
    drawEllipseBeforeFunc(canvasMarkDataObject)
  } else if (type === 3) {
    // final
    // if (!_this.isPaintedBoolean) {
    let canvasMarkDataObject = _this.canvasMarkDataArray[_this.canvasMarkDataArray.length - 1]
    canvasMarkDataObject.completed = true    
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
    _this.$set(_this.canvasMarkDataArray, _this.canvasMarkDataArray.length, canvasMarkDataObject)
  } else if (type === 2) {
    // 拖动时重设右下角点的值
    let canvasMarkDataObject = _this.canvasMarkDataArray[_this.canvasMarkDataArray.length - 1]
    let pointDataArray = canvasMarkDataObject.pointDataArray
    pointDataArray[1].x = event.offsetX
    pointDataArray[1].y = event.offsetY
    // 重绘
    _this.clearTestFunc()
    _this.reDrawFunc()
    drawRectBeforeFunc(canvasMarkDataObject)
  } else if (type === 3) {
    // final
    // if (!_this.isPaintedBoolean) {
    let canvasMarkDataObject = _this.canvasMarkDataArray[_this.canvasMarkDataArray.length - 1]
    canvasMarkDataObject.completed = true
    // 记录中心点
    canvasMarkDataObject.centerPointObject = _this.$Painting_tools.calcCenterInPolygon(canvasMarkDataObject.pointDataArray, _this.$Tools.compareVal)
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
    _this.$set(_this.canvasMarkDataArray, _this.canvasMarkDataArray.length, canvasMarkDataObject)
    // console.log(_this.canvasMarkDataArray)
    // console.log(_this.canvasMarkDataArray.length - 1)
    // console.log(canvasMarkDataObject)
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
      _this.$set(pointDataArray, 
        pointDataArray.length, 
        {x: event.offsetX, y: event.offsetY})
      _this.$set(_this.canvasMarkDataArray, _this.canvasMarkDataArray.length - 1, canvasMarkDataObject)
      _this.$Painting_tools.drawArcFunc(_this.canvasObject, event.offsetX, event.offsetY, r, _this.arcColorString, _this.arcWidthNumber, _this.arcStrokeColorString)
      // drawArcFunc(_this.canvasObject, event.offsetX, event.offsetY, r, _this.arcColorString, _this.arcWidthNumber, _this.arcStrokeColorString)
    }       
  }
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
      const result = centerPointDeleteFunc(item, index, x, y)
      // 如果返回true就跳出foreach
      if (result) {
        catch_item = item
        catch_index = index
        console.log(catch_item)
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
        let distance = calcPointDistanceFunc(x, y, point_x, point_y)
        let judge_number = _this.arcRNumber + _this.arcWidthNumber - 1  // 5
        // 只有没画完的点才能删除
        if (distance < judge_number && !item.completed) {
          delete_child_index = child_index
          return
        }
      })
      // 删除某个点
      _this.$delete(item.pointDataArray, delete_child_index)
      // 如果发现某个多边形已经没有点了 则删除这个多边形对象
      if (item.pointDataArray.length === 0) {
        delete_index = index
        // 关闭绘制状态
        _this.isPointingBoolean = false
        return
      }
    })
    if (delete_index > -1) {
      _this.$delete(_this.canvasMarkDataArray, delete_index)
    }
  } catch (error) {
    if (error.message === "end_foreach") {
      // catch_index 可能是0 所以不能用
      if (!catch_item) {
        return
      }
      if (confirm("确定删除这个多边形？")) {
        _this.$delete(_this.canvasMarkDataArray, catch_index)
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
function centerPointDeleteFunc (item, index, x, y) {
  // 如果多边形没画完，就不存在中心点
  if (!item.completed || !item.centerPointObject) {
    return false
  }
  const center_x = item.centerPointObject.center_x, center_y = item.centerPointObject.center_y
  // 横向距离  纵向距离
  // const hori = center_x - x, vert = center_y - y
  // const distance = Math.sqrt(hori*hori + vert*vert)
  // 下一个就提你
  let distance = calcPointDistanceFunc(x, y, center_x, center_y)
  const judge_number = _this.centerPointHoverJudgeNumber
  if (distance < judge_number) {
    return true
  } else {
    return false
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
    try {
      _this.$Painting_tools.drawPointLineFunc(_this.canvasObject, pointDataArray, _this.lineColorString, _this.lineWidthNumber)
      drawCenterArcFunc(pointDataArray, canvasMarkDataObject)
      // 复制备用对象
      _this.anotherCanvasMarkDataArray = _this.canvasMarkDataArray
      _this.isPointingBoolean = false    // 正在绘制
      _this.isPaintedBoolean = true    // 绘制过
      canvasMarkDataObject.completed = true
    } catch(error) {
      canvasMarkDataObject.completed = false
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
}
</style>
