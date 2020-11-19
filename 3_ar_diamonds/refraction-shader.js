// This is all based off Jerome Etienne's work, and he originally linked to
// these two sources, so I'll do the same here:
// http://http.developer.nvidia.com/CgTutorial/cg_tutorial_chapter07.html
// https://www.clicktorelease.com/code/streetViewReflectionMapping/#51.50700703827454,-0.12791916931155356

AFRAME.registerComponent('refraction-shader', {
    schema: {
        refractionIndex: { type : 'number', default: 0.9 },
        distance: { type : 'number', default: 1 },
        // TODO :  add tint color to *= the color of gl_FragColor :)
        tintColor : { default : [255, 255, 255] },
        opacity: { default : 1 }
    },
    init: function () {
        // Mostly from Jerome Etienne, except refractionRatio -> refractionIndex because that makes more sense to me
        const vertexShader = `varying vec3 vRefract;
        uniform float refractionIndex;

        void main() {
            vec4 mPosition = modelMatrix * vec4( position, 1.0 );
            vec3 nWorld = normalize( mat3( modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz ) * normal );
            vRefract = normalize( refract( normalize( mPosition.xyz - cameraPosition ), nWorld, refractionIndex ) );

            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }`

        const fragShader = `uniform sampler2D texture;
        varying vec3 vRefract;
        // experiment with distance to the video plane. should do real ray-plane-intersection!

        uniform float distance;
        uniform float opacity;

        uniform vec3 tintColor;

        void main(void) {
            // 2d video plane lookup
            // todo: ! here we could raytrace the ray into the _markerplane_! we know this ("reasonable area around the marker")
            vec2 p = vec2(vRefract.x*distance + 0.5, vRefract.y*distance + 0.5);

            vec3 color = texture2D( texture, p ).rgb;

            // float mixThresh = 0.05;
            // color.r = mix(color.r, normalize(tintColor.r), mixThresh);
            // color.g = mix(color.g, normalize(tintColor.g), mixThresh);
            // color.b = mix(color.b, normalize(tintColor.b), mixThresh);

            // color.r = normalize(color.r * tintColor.r);
            // color.g = normalize(color.g * tintColor.g);
            // color.b = normalize(color.b * tintColor.b);
            gl_FragColor = vec4(color, opacity );
            // gl_FragColor = vec4(normalize(tintColor), opacity );
        }`

        var texture = new THREE.VideoTexture(this.el.sceneEl.systems.arjs.arToolkitSource.domElement)
        texture.minFilter =  THREE.NearestFilter

        this.material  = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 },
                texture: { type: 't', value: texture },
                // pull to see the throshold: 0.7-ish solid glass/water ("upsidevdown"), 0.8+ thinner glass ("magnifying glass")
                // refractionIndex: { type: 'f', value: 0.7 },

                // This is actually the inverse of the refraction index:
                refractionIndex: { type: 'f', value: this.data.refractionIndex },
                // experiment to adjust offset to video-plane. set to 1 for no effect
                distance: { type: 'f', value: this.data.distance },
                tintColor: { type: 'vec3', value: new THREE.Color(this.data.tintColor.r, this.data.tintColor.g, this.data.tintColor.b)},
                opacity: { type: 'f', value: this.data.opacity},
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
        this.el.addEventListener('model-loaded', () => {
            this.applyToMesh()
        });
    },
    /**
     * Apply the material to the current entity.
     */
    applyToMesh: function() {
        const mesh = this.el.getObject3D('mesh')
        if (mesh) {
            var mat = this.material
            mesh.traverse(function (node) {
                if (node.isMesh) {
                    node.material = mat
                }
            })
        }
    },
    tick: function (t) {
        this.material.uniforms.time.value = t / 1000
        this.material.uniforms.refractionIndex.value = this.data.refractionIndex
        this.material.uniforms.distance.value = this.data.distance
        this.material.uniforms.tintColor.value = this.data.tintColor
        this.material.uniforms.opacity.value = this.data.opacity
    }
})
