var GameManager = {
  init: function(rlayers, data) {
    if (rlayers) {
      this.layers = rlayers;
      this.contexts = this.layers.map(layer => layer.getContext("2d"));
      this.scenes = [];
      this.active_scene = 0;
      this.last_frame = performance.now();
      this.fps = 0;
      this.tick_rate = 100;
      this.tick_count = 0;
      this.looping = false;
    }

    if (data) {
      Object.assign(this, data);
    }

    this.layers.forEach(layer => { // Synchronizes display dimensions from canvas dimensions
      layer.width = layer.clientWidth;
      layer.height = layer.clientHeight;
    });

    this.requestAnimationFrame =
      window.requestAnimationFrame ||
      window.mozRequestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.msRequestAnimationFrame;
    window.requestAnimationFrame = requestAnimationFrame;

    this.set_interpolation();

    if (this.looping) {
      this.loop();
    }
  },

  register_scene(scene) {
    this.scenes.push(scene);
  },

  get_scene(id = this.active_scene) {
    return this.scenes[id];
  },

  get_context(id) {
    return this.contexts[id];
  },

  get_layer(id) {
    return this.layers[id];
  },

  client_supports_mix_blend_mode() {
    return !!window.getComputedStyle(document.body).mixBlendMode;
  },

  frame() {
    if (this.layers[0].width != this.layers[0].clientWidth || this.layers[0].height != this.layers[0].clientHeight) {
      this.layers.forEach((layer, id) => {
        layer.width = this.contexts[id].width = layer.clientWidth;
        layer.height = this.contexts[id].height = layer.clientHeight;
      });
      this.set_interpolation();
    }
    this.scenes[this.active_scene].draw();

  },

  loop() {
    requestFrame();
    function requestFrame() {
      window.requestAnimationFrame(() => {
        if (GameManager.looping) {
          GameManager.frame();
          GameManager.fps = (GameManager.fps + 10 / (performance.now() - GameManager.last_frame)) / 1.01;
          GameManager.last_frame = performance.now();
          (document.getElementById("fps-counter") || {}).innerText = Math.round(GameManager.fps, 2) + " fps";
        }
        requestFrame();
      });
    }
  },

  tick() {
    if (this.looping) {
      this.tick_count++;
      if (scene = this.scenes[this.active_scene]) {
        scene.tick(this.tick_count);
      }
    }
  },

  set_interpolation() {
    this.contexts.forEach(context => { // Disables the image smoothing feature
      context.imageSmoothingEnabled = false;
      context.mozImageSmoothingEnabled = false;
      context.webkitImageSmoothingEnabled = false;
      context.msImageSmoothingEnabled = false;
    });
  }
}

var GameObject = {
  new: function(frames, data) {
    return Object.assign({}, this,
      {frames},
      data);
  },

  draw: function(x, y, width, height, context, frame) {
    if (image = this.frames[frame]) {
      let t = performance.now();
      context.drawImage(image, x, y, width, height);
      if ((d = performance.now() - t) > 4) {
        console.log(d, image, x, y, width, height);
      }
    }
  }
}

var Scene = {
  new: function(data) {
    this.objects = [];
    this.elements = [];
    this.vx = 0;
    this.vy = 0;
    this.scale = 1;
    this.backgrounds = [];
    this.composite_operations = [];

    return Object.assign(this, data);
  },

  register_objects: function(objects) {
    return new Promise((resolve, reject) => {
      var promises = [];
      objects.forEach(raw => {
        let object = {
          name: raw.name,
          frames: (raw.frames || []).map(url => {
            var img = new Image();
            img.src = url;
            if (!img.complete) {
              promises.push(new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
              }));
            }
            return img;
          })
        };
        this.objects[object.name] = GameObject.new(object.frames, Object.assign({name: object.name}, raw.data));
      });
      Promise.all(promises).then(resolve).catch(reject);
    });
  },

  add_element(name, x, y, width, height, layer = 0, frame = 0, index = this.elements.length, data) {
    if (index == this.elements.length || !index) {
      this.elements.push(index, Object.assign({
        name,
        x,
        y,
        width,
        height,
        layer,
        frame,
        fixed: false,
        visible: true,
        size_relative: false
      }, data));
    }
    else {
      this.elements.insert(index, Object.assign({
        name,
        x,
        y,
        width,
        height,
        layer,
        frame,
        fixed: false,
        visible: true,
        size_relative: false
      }, data));
    }

    return this.elements[index];
  },

  draw() {
    GameManager.contexts.forEach((context, id) => {
      var layer = GameManager.get_layer(id);
      context.clearRect(0, 0, layer.width, layer.height);
      context.fillStyle = this.backgrounds[id] || "black";
      context.fillRect(0, 0, layer.width, layer.height);
      if (this.composite_operations[id]) {
        context.globalCompositeOperation = this.composite_operations[id];
      }
    });

    this.elements.forEach(element => {
      if (parent = this.objects[element.name]) {
        if (parent.onbeforedraw) parent.onbeforedraw(element);
        let layer = GameManager.get_layer(element.layer);
        let context = GameManager.get_context(element.layer);
        if (element.fixed) {
          context.globalCompositeOperation = parent.composite_operation || this.composite_operations[element.layer] || "normal";
          parent.draw(
            element.x,
            element.y,
            element.width * (element.size_relative ? layer.clientWidth : 1),
            element.height * (element.size_relative ? layer.clientHeight : 1),
            context,
            element.frame
          );
        }
        else {
          let x = (element.x - this.vx) * this.scale;
          let y = (element.y - this.vy) * this.scale;
          let w = element.width * this.scale;
          let h = element.height * this.scale;
          if (x < layer.width && y < layer.height && x + w > 0 && y + h > 0) {
            parent.draw(
              x,
              y,
              w,
              h,
              context,
              element.frame
            );
          }
        }
      }
    });
  },

  tick(n) {
    this.objects.forEach(object => {
      if (object.ontick) object.ontick(n);
    });
    this.elements.forEach(element => {
      if (element.ontick) element.ontick(n);
      if (parent = this.objects[element.name]) {
        if (parent.element && parent.element.ontick) parent.element.ontick.bind(element)(n);
      }
    });
  }
}

Array.prototype.insert = function(index) {
  this.splice.apply(this, [index, 0].concat(
    Array.prototype.slice.call(arguments, 1)));
  return this;
};

/*window.onresize = () => {
  GameManager.init();
}*/
