import { vec2, vec4 } from 'gl-matrix';
import { ShaderPool } from './ShaderPool';
import { gl } from "./WebGLUtils";

export class Shader {
    private program: WebGLProgram;
    private valid: boolean;

    private constructor(vertexShader: WebGLShader, fragmentShader: WebGLShader) {
        this.program = this.createProgram(vertexShader, fragmentShader);
        this.valid = true;
    }

    // TODO: for every create call there should exist a Destroy/Dispose call
    public static async Create(vertexPath: string, fragmentPath: string): Promise<Shader> {
        const vertexShader = await Shader.LoadShader(vertexPath, gl.VERTEX_SHADER);
        const fragmentShader = await Shader.LoadShader(fragmentPath, gl.FRAGMENT_SHADER);
        const shader = new Shader(vertexShader, fragmentShader);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        return shader;
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

    public SetVec4Uniform(name: string, value: vec4): void {
        this.Use();
        const location = gl.getUniformLocation(this.program, name);
        gl.uniform4fv(location, value);
    }

    private createProgram(vertex: WebGLShader, fragment: WebGLShader): WebGLProgram {
        const program = gl.createProgram();
        gl.attachShader(program, vertex);
        gl.attachShader(program, fragment);
        gl.linkProgram(program);
        gl.detachShader(program, vertex);
        gl.detachShader(program, fragment);
        return program;
    }

    private static async LoadShader(elementPath: string, type: number): Promise<WebGLShader> {
        const id = gl.createShader(type);
        const src = await ShaderPool.GetInstance().LoadShaderSource(elementPath);
        gl.shaderSource(id, src);
        gl.compileShader(id);
        const error = gl.getShaderInfoLog(id);
        if (error !== undefined && error.length > 0) {
            throw new Error(`Failed to compile shader (${elementPath}): ` + error);
        }

        return id;
    }
}
