
// this piece was created by Andreas Cuervo. I've added some minor changes, but all credit belongs to him
// Check out the original @ https://gist.github.com/AndresCuervo/b4cfdbc46fe056832d822871522ae3bb


// Note: requires https://rawgit.com/jeromeetienne/ar.js/master/aframe/build/aframe-ar.js
// or A-Frame.js + AR.js + THREEx + some other bindings,
// basically, just use Jerome Etienne's A-Frame AR lib ¯\_(ツ)_/¯ 


// This is all based off Jerome Etienne's work, and he originally linked to
// these two sources, so I'll do the same here:
// http://http.developer.nvidia.com/CgTutorial/cg_tutorial_chapter07.html
// https://www.clicktorelease.com/code/streetViewReflectionMapping/#51.50700703827454,-0.12791916931155356

AFRAME.registerComponent('refraction-shader', {
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
      const vertexShader = `
        #define TAU 6.28318530718

        varying vec3 worldNormal;
        varying vec3 viewDirection;
        
        void main() {
          vec4 worldPosition = modelMatrix * vec4( position, 1.0);
          worldNormal = normalize( modelViewMatrix * vec4(normal, 0.)).xyz;
          viewDirection = normalize(worldPosition.xyz - cameraPosition);
      
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `

      const fragShader = `
        #define TAU 6.28318530718
        #define PI 3.14159265359
        #define S(a,b,n) smoothstep(a,b,n)
        #define REFRACT_INDEX vec3(2.407, 2.426, 2.451)
        #define REFRACT_SPREAD vec3 (0.0, 0.02, 0.05) // This is not physically based, just from the top of my head 
        #define MAX_BOUNCE 5
        #define COS_CRITICAL_ANGLE 0.91
        
        uniform sampler2D envMap;
        uniform vec2 uReso;
        
        varying vec3 worldNormal;
        varying vec3 viewDirection;

        void main() {
          float ior = 1.5;

          // screen coordinates
	        vec2 uv = gl_FragCoord.xy / uReso;
    
          // combine backface and frontface normal
          vec3 normal = worldNormal;
    
          vec3 reflectDir = reflect(viewDirection, normal);
          float fresnelFactor = pow(1.0 + dot( viewDirection, normal), 3.0 );

          // calculate refraction and apply to uv
          vec3 inDir = refract(viewDirection, normal, 1.0/ior);
          vec3 inDirR, inDirG, inDirB;

          for (int bounce = 0; bounce < MAX_BOUNCE; bounce++)
          {
            float f_bounce = float(bounce);

            // Convert normal to -1, 1 range
            vec3 inN = viewDirection*inDir;
            // vec3 inN = textureCube(envMap, inDir) * vec3(2.0, 2.0, 2.0) - 1.0;
            if (dot(-inDir, inN) > COS_CRITICAL_ANGLE)
            {
              // The more bounces we have the heavier dispersion should be
              inDirR = refract(inDir, inN, REFRACT_INDEX.r);
              inDirG = refract(inDir, inN, REFRACT_INDEX.g + f_bounce * REFRACT_SPREAD.g);
              inDirB = refract(inDir, inN, REFRACT_INDEX.b + f_bounce * REFRACT_SPREAD.b);
              break;
            }

            // We didn't manage to exit diamond in MAX_BOUNCE
            // To be able exit from diamond to air we need fake our refraction 
            // index other way we'll get float3(0,0,0) as return
            if (bounce == MAX_BOUNCE-1)
            {
              inDirR = refract(inDir, inN, 1.0/ REFRACT_INDEX.r);
              inDirG = refract(inDir, inN, 1.0/ (REFRACT_INDEX.g + f_bounce * REFRACT_SPREAD.g));
              inDirB = refract(inDir, inN, 1.0/ (REFRACT_INDEX.b + f_bounce * REFRACT_SPREAD.b));
              break;
            }
            inDir = reflect(inDir, inN);
          }
          uv += inDir.xy;
    
          // sample environment texture
          vec4 tex = texture2D(envMap, uv);
          vec4 color = tex;
          color.rgb = mix(color.rgb, vec3(1.0 ), fresnelFactor);
          
          gl_FragColor = vec4(color.rgb, 1.0);
        }
      `
      
      // use the video element to create a video texture     
      var texture = new THREE.VideoTexture(this.el.sceneEl.systems.arjs['_arSession'].arSource.domElement)
      texture.minFilter =  THREE.NearestFilter

      const width = window.innerWidth;
      const height = window.innerHeight;

      this.backfaceFbo = new THREE.WebGLRenderTarget(width, height);

      this.material  = new THREE.ShaderMaterial({
          uniforms: {
              envMap: { type: 't', value: texture },
              uReso: { value: new THREE.Vector2(100,100) }
          },
          vertexShader : vertexShader,
          fragmentShader : fragShader
      });
      this.material.uniforms.envMap.value.wrapS = this.material.uniforms.envMap.value.wrapT = THREE.ClampToEdgeWrapping;
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
      this.material.uniforms.uReso.value = new THREE.Vector2(window.innerWidth, window.innerHeight) 
    }
  }

})