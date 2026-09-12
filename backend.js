/* if you are reading this this code is not for open source code */
// this code may need fixing the math requures a smooth interplation wich doesnt need?
const shaderSource = {
    vertex: `#version 300 es
    precision mediump float;

    uniform mat4 u_modelViewMatrix;
    uniform mat4 u_projectionMatrix;
    uniform float u_k; // Amplitude
    uniform float u_p; // Frequency parameter
    uniform float u_m; // Scale
    uniform float u_S_seed; // Seed

    out vec3 v_worldPos;

    // Fixed noise function with continuous derivatives
    float f(float x, float s) {
        float p_val = u_p;
        float k_mod = u_k;
        float nx = x / p_val;  // Normalized position
        float n = floor(nx);    // Integer part
        float fract_x = fract(nx); // Fractional part for smooth interpolation
        
        // Generate deterministic pseudo-random value
        float E = 45731.0 * cos(100000.0 * n) + s;
        float mod_E_k = mod(E, k_mod);
        if (mod_E_k < 0.0) mod_E_k += k_mod;
        
        // Get next value for interpolation
        float E_next = 45731.0 * cos(100000.0 * (n + 1.0)) + s;
        float mod_E_next = mod(E_next, k_mod);
        if (mod_E_next < 0.0) mod_E_next += k_mod;
        
        // Smooth interpolation between values
        float t = fract_x;
 
        return mix(mod_E_k, mod_E_next, t);
    }

    // Bilinear interpolation function
    float bilinear(vec2 pos, vec2 cell, float[4] corners) {
        vec2 t = smoothstep(0.0, 1.0, pos - cell);
        float ab = mix(corners[0], corners[1], t.x);
        float cd = mix(corners[2], corners[3], t.x);
        return mix(ab, cd, t.y);
    }

    float terrain_height(vec2 pos) {
        vec2 cell = floor(pos);
        vec2 local = pos - cell;
        
        // Get noise values at 4 corners
        float[4] corners;
        corners[0] = f(cell.x, cell.y + u_S_seed);
        corners[1] = f(cell.x + 1.0, cell.y + u_S_seed);
        corners[2] = f(cell.x, cell.y + 1.0 + u_S_seed);
        corners[3] = f(cell.x + 1.0, cell.y + 1.0 + u_S_seed);
        
        return bilinear(local, vec2(0), corners);
    }

    void main() {
        int x_cells = 500;
        int y_cells = 100;

        float i_cell = float(gl_VertexID / (x_cells * 6));
        float j_cell = float((gl_VertexID / 6) % y_cells);

        float x0 = i_cell;
        float z0 = j_cell;
        float x1 = i_cell + 1.0;
        float z1 = j_cell;
        float x2 = i_cell;
        float z2 = j_cell + 1.0;
        float x3 = i_cell + 1.0;
        float z3 = j_cell + 1.0;

        int vertexIndex = gl_VertexID % 6;

        float pos_x, pos_z;
        if (vertexIndex == 0) { pos_x = x0; pos_z = z0; }
        else if (vertexIndex == 1) { pos_x = x1; pos_z = z1; }
        else if (vertexIndex == 2) { pos_x = x3; pos_z = z3; }
        else if (vertexIndex == 3) { pos_x = x0; pos_z = z0; }
        else if (vertexIndex == 4) { pos_x = x3; pos_z = z3; }
        else { pos_x = x2; pos_z = z2; } // vertexIndex == 5

        // Apply scaling and calculate terrain height
        vec2 scaled_pos = vec2(pos_x, pos_z) / u_m;
        float height = u_k * terrain_height(scaled_pos);

        vec3 pos = vec3(pos_x, height, pos_z);
        v_worldPos = pos;
        gl_Position = u_projectionMatrix * u_modelViewMatrix * vec4(pos, 1.0);
    }
`,

fragment: `#version 300 es
precision mediump float;

in vec3 v_worldPos;
out vec4 outColor;

void main() {
    float cellX = min(floor(v_worldPos.x), 9999.0);
    float cellZ = min(floor(v_worldPos.z), 9999.0);
    int gridCoordX = int(cellX);
    int gridCoordY = int(cellZ);

    int colorIndex = (gridCoordX + gridCoordY) % 3;
    vec3 color;
    if (colorIndex == 0) {
        color = vec3(1.0, 0.0, 0.0); // Red
    } else if (colorIndex == 1) {
        color = vec3(0.0, 1.0, 0.0); // Green
    } else {
        color = vec3(0.0, 0.0, 1.0); // Blue
    }

    outColor = vec4(color, 1.0);
}
`,
};






function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation failed:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}


const vertexShader = compileShader(gl, gl.VERTEX_SHADER, shaderSource.vertex);
const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, shaderSource.fragment);


function createAndBindBuffer(gl, target, data, attributeLocation, size) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    gl.vertexAttribPointer(attributeLocation, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attributeLocation);

    return buffer;

}

//const program = createProgram(gl, vertexShader, fragmentShader);
//gl.useProgram(program);
// Create and link shader program
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(program));
}

gl.useProgram(program);






function createAndBindBuffer(gl, target, data, attributeLocation, size) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    gl.vertexAttribPointer(attributeLocation, size, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attributeLocation);
    return buffer;
}


const colors = new Float32Array([
    // front bottom right
    0.0, 1.0, 0.0, 1.0,
    0.0, 1.0, 0.0, 1.0,
    1.0, 0.0, 0.0, 1.0,
    // front top left
    1.0, 0.0, 0.0, 1.0,
    1.0, 0.0, 0.0, 1.0,
    1.0, 0.0, 0.0, 1.0,

]);


const colorAttributeLocation = gl.getAttribLocation(program, 'a_color');
const colorBuffer = createAndBindBuffer(gl, gl.ARRAY_BUFFER, colors, colorAttributeLocation, 4);

var resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");

const projectionMatrix = mat4.create();
const uProjectionMatrix = gl.getUniformLocation(program, 'u_projectionMatrix');
const uModelViewMatrix = gl.getUniformLocation(program, 'u_modelViewMatrix');
mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 250000);
gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);
gl.clearColor(0.0, 0.0, 0.5, 1.0);
gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
gl.enable(gl.DEPTH_TEST);

// Try these values for different terrain styles
gl.uniform1f(gl.getUniformLocation(program, 'u_k'), 15.0); // taller mountains
gl.uniform1f(gl.getUniformLocation(program, 'u_p'), 3.0); // more frequent features
gl.uniform1f(gl.getUniformLocation(program, 'u_m'), 100.0); // larger features
gl.uniform1f(gl.getUniformLocation(program, 'u_S_seed'), 1.36);



const fpsElement = document.getElementById('fps');

let frameCount = 0;
let startTime = performance.now();

// Animation loop
function animate() {
    // Update model-view matrix
    handleKeyInput();

    frameCount++;
    const now = performance.now();
    let elapsed = now - startTime;
    if (elapsed >= 1000) {
        const fps = (frameCount / elapsed) * 1000;
        fpsElement.textContent = `FPS: ${fps.toFixed(2)}`;

        frameCount = 0;
        startTime = now;
    }


    position = vec3.lerp([], position, targetPosition, 0.1);
    mat4.lookAt(
        modelViewMatrix,
        [position[0], position[1], position[2]],
        [position[0] + Math.sin(mouseX), position[1] + Math.sin(mouseY), position[2] - Math.cos(mouseX)],
        [0, 1, 0]
    );
    gl.clear(gl.COLOR_BUFFER_BIT);
    for (let i = 1; i < 2; i++) {
        const tempMatrix = mat4.clone(modelViewMatrix);
        mat4.translate(modelViewMatrix, tempMatrix, [i, 0, 0]);
        gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);
        // Draw the cubes with texture coordinates
        //TRIANGLES
        //POINTS
        gl.drawArrays(gl.TRIANGLES, 0, 50000000);
        mat4.copy(modelViewMatrix, tempMatrix);
    }

    requestAnimationFrame(animate);
}

animate();


