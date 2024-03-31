import { vec2, vec3 } from 'gl-matrix';
import { gl } from "./WebGLUtils";

export class Shader {
    private program: WebGLProgram;
    private valid: boolean;

    constructor(vertexPath: string, fragmentPath: string) {
        const vertexId = this.LoadShader(vertexPath, gl.VERTEX_SHADER);
        const fragment = this.LoadShader(fragmentPath, gl.FRAGMENT_SHADER);
        this.program = this.createProgram(vertexId, fragment);
        gl.deleteShader(vertexId);
        gl.deleteShader(fragment);
        this.valid = true;
    }

    public Use(): void {
        if (!this.valid) {
            throw new Error("Trying to use a deleted shader program!");
        }

        gl.useProgram(this.program);
    }

    public GetProgram(): WebGLProgram {
        if (!this.valid) {
            throw new Error("Trying to get a deleted shader program!");
        }

        return this.program;
    }

    public Delete(): void {
        this.valid = false;
        gl.deleteProgram(this.program);
    }

    public SetFloatUniform(name: string, value: number): void {
        this.Use();
        const location = gl.getUniformLocation(this.program, name);
        gl.uniform1f(location, value);
    }

    public SetVec2Uniform(name: string, value: vec2): void {
        this.Use();
        const location = gl.getUniformLocation(this.program, name);
        gl.uniform2fv(location, value);
    }

    private createProgram(vertexId: WebGLShader, fragment: WebGLShader): WebGLProgram {
        const program = gl.createProgram();
        gl.attachShader(program, vertexId);
        gl.attachShader(program, fragment);
        gl.linkProgram(program);
        gl.detachShader(program, vertexId);
        gl.detachShader(program, fragment);
        return program;
    }

    private LoadShader(elementPath: string, type: number): WebGLShader {
        const id = gl.createShader(type);
        const src = this.GetSourceFromUrl(elementPath);
        gl.shaderSource(id, src);
        gl.compileShader(id);
        const error = gl.getShaderInfoLog(id);
        if (error !== undefined && error.length > 0) {
            throw new Error(`Failed to compile shader (${elementPath}): ` + error);
        }

        return id;
    }

    private GetSourceFromUrl(url: string): string {
        const req = new XMLHttpRequest();
        req.open("GET", url, false);
        req.overrideMimeType("text/plain");
        req.send(null);
        return req.responseText;
    }
}
