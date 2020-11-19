AFRAME.registerComponent('reflection-shader', {
    init: function () {
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

        var texture = new THREE.VideoTexture(this.el.sceneEl.systems.arjs.arToolkitSource.domElement)
        texture.minFilter =  THREE.NearestFilter

        this.material  = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 },
                texture: { type: 't', value: texture },
            },
            vertexShader : vertexShader,
            fragmentShader : fragShader
        });
        this.material.uniforms.texture.value.wrapS = this.material.uniforms.texture.value.wrapT = THREE.ClampToEdgeWrapping;
        this.applyToMesh();
        this.el.addEventListener('model-loaded', () => this.applyToMesh());
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
    }
})
