import { mat4 } from "gl-matrix";
import { Shader } from "./Shader";
import { Sprite } from "./Sprite";
import { gl } from "./WebGLUtils";

export class SpriteBatch
{
    private BatchShader: Shader;
    private Vertices: number[];
    private Buffer: WebGLBuffer;

    private ModelMatrix = mat4.create();

    public constructor(shader: Shader, sprites: Sprite[])
    {
        this.BatchShader = shader;
        this.Vertices = [];
        sprites.forEach((sprite) => {
            this.Vertices = this.Vertices.concat(sprite.Vertices);
        });
        this.ModelMatrix = mat4.identity(this.ModelMatrix);

        this.Buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.Buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.Vertices), gl.STATIC_DRAW);
    }

    public Draw(projectionMatrix: mat4, viewMatrix: mat4): void
    {
        const shaderProgram = this.BatchShader.GetProgram();

        this.BatchShader.Use();
        const attribLocation = gl.getAttribLocation(this.BatchShader.GetProgram(), "a_pos");

        gl.bindBuffer(gl.ARRAY_BUFFER, this.Buffer);
        gl.enableVertexAttribArray(attribLocation);
        gl.vertexAttribPointer(attribLocation, 3, gl.FLOAT, false, 0, 0);

        const projectionLocation = gl.getUniformLocation(shaderProgram, "projection");
        gl.uniformMatrix4fv(projectionLocation, false, projectionMatrix);
        const viewLocation = gl.getUniformLocation(shaderProgram, "view");
        gl.uniformMatrix4fv(viewLocation, false, viewMatrix);
        const modelLocation = gl.getUniformLocation(shaderProgram, "model");
        gl.uniformMatrix4fv(modelLocation, false, this.ModelMatrix);

        gl.drawArrays(gl.TRIANGLES, 0, this.Vertices.length / 3);
        gl.disableVertexAttribArray(attribLocation);
    }
}
