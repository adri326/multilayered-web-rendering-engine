var GameManager = {
  init: function(rlayers, data) {
    if (rlayers) {
      this.layers = rlayers;
      this.contexts = this.layers.map(layer => layer.getContext("2d"));
      this.scenes = [];
      this.active_scene = 0;
      this.loop = false;
      this.last_frame = performance.now();
      this.fps = 0;
      this.tick_rate = 100;
      this.tick_count = 0;
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

    this.contexts.forEach(context => { // Disables the image smoothing feature
      context.imageSmoothingEnabled = false;
      context.mozImageSmoothingEnabled = false;
      context.webkitImageSmoothingEnabled = false;
      context.msImageSmoothingEnabled = false;
    });

    if (this.loop) {
      console.log("Banana?");
      if (!this.interval) this.interval = setInterval(this.tick.bind(this), this.tick_rate);
      window.requestAnimationFrame(() => {
        GameManager.frame();
      });
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
    this.layers.forEach((layer, id) => {
      if (layer.width != layer.clientWidth) layer.width = this.contexts[id].width = layer.clientWidth;
      if (layer.height != layer.clientHeight) layer.height = this.contexts[id].height = layer.clientHeight;
    });
    this.scenes[this.active_scene].draw();
    if (this.loop) {
      window.requestAnimationFrame(() => {
        GameManager.frame();
      });
    }
    this.fps = (this.fps + 1000 / (performance.now() - this.last_frame)) / 2;
    this.last_frame = performance.now();
  },

  tick() {
    this.tick_count++;
    if (scene = this.scenes[this.active_scene]) {
      scene.tick(this.tick_count);
    }
  }
}

var GameObject = {
  new: function(frames, data) {
    return Object.assign({}, this,
      {frames},
      data);
  },

  draw: function(x, y, width, height, context, frame) {
    //console.log(this, frame);
    if (image = this.frames[frame]) {
      //console.log(image);
      context.drawImage(image, x, y, width, height);
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
            promises.push(new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
            }));
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
        if (element.fixed) {
          let layer = GameManager.get_layer(element.layer);
          let context = GameManager.get_context(element.layer);
          context.globalCompositeOperation = parent.composite_operation || this.composite_operations[element.layer] || "normal";
          parent.draw(
            element.x,
            element.y,
            element.width * (element.size_relative ? layer.clientWidth : 1),
            element.height * (element.size_relative ? layer.clientHeight : 1),
            GameManager.get_context(element.layer),
            element.frame
          );
        }
        else {
          parent.draw(
            (element.x - this.vx) * this.scale,
            (element.y - this.vy) * this.scale,
            element.width * this.scale,
            element.height * this.scale,
            GameManager.get_context(element.layer),
            element.frame
          );
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

window.onresize = () => {
  GameManager.init();
}
