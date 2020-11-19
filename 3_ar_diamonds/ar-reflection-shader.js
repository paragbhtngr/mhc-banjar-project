
// this piece was created by Andreas Cuervo. I've added some minor changes, but all credit belongs to him
// Check out the original @ https://gist.github.com/AndresCuervo/b4cfdbc46fe056832d822871522ae3bb


// Note: requires https://rawgit.com/jeromeetienne/ar.js/master/aframe/build/aframe-ar.js
// or A-Frame.js + AR.js + THREEx + some other bindings,
// basically, just use Jerome Etienne's A-Frame AR lib ¯\_(ツ)_/¯ 


// This is all based off Jerome Etienne's work, and he originally linked to
// these two sources, so I'll do the same here:
// http://http.developer.nvidia.com/CgTutorial/cg_tutorial_chapter07.html
// https://www.clicktorelease.com/code/streetViewReflectionMapping/#51.50700703827454,-0.12791916931155356

AFRAME.registerComponent('reflection-shader', {
  init: function () {
    this.prepare = this.prepare.bind(this)
    var timerId = setInterval( e => {
      if (!this.el.sceneEl.systems.arjs['_arSession'])
        return;
      clearInterval(timerId)
      this.prepare()
    }, 1000)
  },
  prepare: function() {
    
      const data = this.data;
      /**** SHADER DEFINITIONS *****/
      const vertexShader = `varying vec3 vReflect;

      void main() {
          vec4 mPosition = modelMatrix * vec4( position, 1.0 );
          vec3 nWorld = normalize( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );
          vReflect = normalize( reflect( normalize( mPosition.xyz - cameraPosition ), nWorld) );

          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }`

      const fragShader = `uniform sampler2D texture;
      varying vec3 vReflect;

      void main(void) {
          // 2d video plane lookup
          // todo: ! here we could raytrace the ray into the _markerplane_! we know this ("reasonable area around the marker")
          vec2 p = vec2(vReflect.x, vReflect.y);

          vec3 color = texture2D( texture, p ).rgb;
          gl_FragColor = vec4( color, 1.0 );
      }`
      
      // use the video element to create a video texture     
      var texture = new THREE.VideoTexture(this.el.sceneEl.systems.arjs['_arSession'].arSource.domElement)
      texture.minFilter =  THREE.NearestFilter
    

      this.material  = new THREE.ShaderMaterial({
          uniforms: {
              time: { value: 0.0 },
              texture: { type: 't', value: texture },
              // pull to see the throshold: 0.7-ish solid glass/water ("upsidevdown"), 0.8+ thinner glass ("magnifying glass")
              // refractionRatio: { type: 'f', value: 0.9 },
              // experiment to adjust offset to video-plane. set to 1 for no effect
              // distance: { type: 'f', value: 1 }
          },
          // Note, idk why exactly, but it appears that you NEED to explicitly
          // name the vertexShader & fragmentShader arguments and not just as:
          // vertexShader,
          // fragShader
          //
          // Will expore this some other time ¯\_(ツ)_/¯
          vertexShader : vertexShader,
          fragmentShader : fragShader
      });
      this.material.uniforms.texture.value.wrapS = this.material.uniforms.texture.value.wrapT = THREE.ClampToEdgeWrapping;
      this.applyToMesh();
      this.el.addEventListener('model-loaded', () => this.applyToMesh());
      this.ready = true
  },
  /**
   * Apply the material to the current entity.
   */
  applyToMesh: function() {
    const object = this.el.getObject3D('mesh');
    const material = this.material;
    if (object) {
      object.traverse(function (node) {
        if (node.isMesh) node.material = material;
      });
    }
  },
  /**
   * On each frame, update the 'time' uniform in the shaders.
   */
  tick: function (t) {
    if (this.ready) {
      this.material.uniforms.time.value = t / 1000;
    }
  }

})