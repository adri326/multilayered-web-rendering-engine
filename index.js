var scenes = [{
  dirt: {
    name: "dirt",
    frames: [
      "dirt-1",
      "dirt-2"
    ]
  },
  bg: {
    name: "bg",
    frames: [
      "bg-1",
      "bg-2"
    ]
  },
  star: {
    name: "star",
    frames: [
      "star-1",
      "star-2"
    ]
  },
  test: {
    name: "test",
    frames: [
      "test-1"
    ]
  },
  lamp: {
    name: "lamp",
    frames: [
      "lamp-1",
      "lamp-2",
      "lamp-3",
      "lamp-4"
    ],
    data: {
      element: {
        ontick: function(n) {
          if (this.frame >= 1 && this.frame <= 3) {
            this.frame = Math.floor(Math.random() * 3 + 1);
          }
        }
      }
    }
  },
  moon: {
    name: "moon",
    frames: [
      "moon-1",
      "moon-2"
    ]
  }
}]

window.addEventListener("load", function() {
  GameManager.init([
    document.getElementById('layer-1'),
    document.getElementById('layer-2')
  ], {
    looping: true
  });
  var promises = [];
  scenes.forEach(scene => {
    var ascene = Scene.new({
      backgrounds: [
        "#352a40",
        "#202020"
      ],
      composite_operations: [
        "normal",
        "lighter"
      ],
      scale: 4
    });
    promises.push(ascene.register_objects(Object.keys(scene).map(key => {
      let o = Object.assign({}, scene[key]);
      o.frames = o.frames.map(f => "./assets/" + f + ".png");
      return o;
    })));
    GameManager.register_scene(ascene);
  });
  Promise.all(promises).then(_ => {
    var scene = GameManager.get_scene(0);

    // BG
    scene.add_element("bg", 0, 0, 1, 1, 0, 0, 0, {
      fixed: true,
      size_relative: true
    })
    for (x = 0; x < 16; x++) {
      y = 1;
      scene.add_element("bg", x*32, y*32, 32, 32, 0, 1);
    }

    for (n = 0; n < 16; n++) { // Stars
      let x = n * 32 + Math.round(Math.random() * 64 - 32);
      let y = Math.round(Math.random() * 32 * 1.2);
      scene.add_element("star", x, y, 32, 32, 0, 0);
      scene.add_element("star", x, y, 32, 32, 1, 1);
    }

    scene.add_element("moon", 200, -24, 98, 98);
    scene.add_element("moon", 200, -24, 98, 98, 1, 1);

    for (y = 3; y < 8; y++) { // Dirt
      for (x = 0; x < 16; x++) {
        scene.add_element("dirt", x*32, y*32, 32, 32);
      }
    }
    for (y = 2; y < 3; y++) { // Grass
      for (x = 0; x < 16; x++) {
        scene.add_element("dirt", x*32, y*32, 32, 32, 0, 1);
      }
    }

    scene.add_element("lamp", 98, 32, 32, 32);
    scene.add_element("lamp", 64, 0, 98, 98, 1, 1);
  }).catch(console.error);
});
