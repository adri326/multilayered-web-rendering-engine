# multilayered-web-rendering-engine
Another web rendering engine, this time to try out the concept of having multiple layers merged using HTML5s `mix-blend-mode` feature

You can see how it performs [here](https://adri326.github.io/multilayered-web-rendering-engine/)!

The engine has one main element where the different canvas are stored, aswell as the different scenes. Scenes contain `GameObjects` and implementation of these `GameObjects`, called `elements`

Note that this engine is not optimised **at all**. It just stupidly draws every `element` it can find to draw; this is just a proof of concept to show what you can do with the wonderful `mix-blend-mode` feature, combined with canvases.
