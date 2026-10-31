/* Mesh drift: the supplied WebGL1 shader with the portfolio's warm palette. */
(async function () {
  const canvas = document.getElementById('mesh-drift');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false });
  if (!gl) return; // The CSS mesh remains visible without WebGL.
  try {
    const response = await fetch('assets/mesh-drift.frag');
    if (!response.ok) throw new Error('Shader could not be loaded');
    const fragmentSource = await response.text();
    function compile(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(message);
      }
      return shader;
    }
    const vertex = compile(gl.VERTEX_SHADER,
      'attribute vec2 a_position; void main(){gl_Position=vec4(a_position,0.0,1.0);}');
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program));
    }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniform = name => gl.getUniformLocation(program, name);
    // Charcoal -> burnt orange -> signature orange -> warm cream.
    const colors = ['1e1d1b', '91421f', 'eb5e28', 'ccc5b9'];
    const palette = new Float32Array(24);
    colors.forEach((hex, i) => {
      for (let c = 0; c < 3; c++) palette[i * 3 + c] = parseInt(hex.slice(c * 2, c * 2 + 2), 16) / 255;
    });
    gl.uniform3fv(uniform('u_colors[0]'), palette);
    // Broader travel keeps the blobs moving through the visible side gutters.
    gl.uniform4f(uniform('u_shape'), 0.78, 0.65, 0.50, 0.00);
    gl.uniform4f(uniform('u_surface'), 2.40, 1.16, 0.00, 1.00);
    gl.uniform4f(uniform('u_finish'), 0.00, 0.00, 0.000, 0.09);
    gl.uniform4f(uniform('u_transform'), 1453.0, 0.00, 0.24, 0.0);
    gl.uniform4f(uniform('u_space'), 0, 0, 0, 0);
    gl.uniform4f(uniform('u_cursor'), 0, 2.0, 0.65, 0.46);
    const scene = uniform('u_scene');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let time = 0;
    let previous = null;
    let lost = false;
    function render(now) {
      frame = 0;
      if (document.hidden || lost) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
      if (!reducedMotion.matches && previous !== null) time += Math.min(now - previous, 100) / 1000;
      previous = now;
      gl.uniform4f(scene, width, height, time * 0.40, 4.0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      canvas.parentElement.classList.add('mesh-ready');
      if (!reducedMotion.matches) frame = requestAnimationFrame(render);
    }
    function resume() {
      cancelAnimationFrame(frame);
      previous = null;
      if (!document.hidden && !lost) frame = requestAnimationFrame(render);
    }
    document.addEventListener('visibilitychange', resume);
    reducedMotion.addEventListener('change', resume);
    window.addEventListener('resize', resume, { passive: true });
    canvas.addEventListener('webglcontextlost', () => {
      lost = true;
      cancelAnimationFrame(frame);
      canvas.parentElement.classList.remove('mesh-ready');
      canvas.style.opacity = '0';
    });
    resume();
  } catch (error) {
    canvas.parentElement.classList.remove('mesh-ready');
    canvas.style.opacity = '0';
    console.warn('Mesh background unavailable; using CSS fallback.', error);
  }
})();
