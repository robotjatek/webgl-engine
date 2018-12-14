import { gl } from "./WebGLUtils";

export class Shader
{
    private program: WebGLProgram;

    constructor(vertexPath: string, fragmentPath: string)
    {
        const vertexId = this.LoadShader(vertexPath, gl.VERTEX_SHADER);
        const fragment = this.LoadShader(fragmentPath, gl.FRAGMENT_SHADER);
        this.program = this.createProgram(vertexId, fragment);
    //    gl.deleteShader(vertexId);
    //    gl.deleteShader(fragment);
    }

    public Use(): void
    {
        gl.useProgram(this.program);
    }

    public GetProgram(): WebGLProgram
    {
        return this.program;
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

    private LoadShader(elementPath: string, type: number): WebGLShader
    {
        const id = gl.createShader(type);
        const src = this.GetSourceFromUrl(elementPath);
        gl.shaderSource(id, src);
        gl.compileShader(id);
        const error = gl.getShaderInfoLog(id);
        if (error !== undefined && error.length > 0)
        {
            throw new Error(`Failed to compile shader (${elementPath}): ` + error);
        }

        return id;
    }

    private GetSourceFromUrl(url: string): string
    {
        const req = new XMLHttpRequest();
        req.open("GET", url, false);
        req.overrideMimeType("text/plain");
        req.send(null);
        return req.responseText;
    }
}
