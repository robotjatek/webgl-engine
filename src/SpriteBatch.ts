import { IDisposable } from './IDisposable';
import { mat4 } from "gl-matrix";
import { Shader } from "./Shader";
import { Sprite } from "./Sprite";
import { Texture } from "./Texture";
import { gl } from "./WebGLUtils";

export class SpriteBatch implements IDisposable
{
    private BatchShader: Shader;
    private Vertices: number[];
    private TextureCoordinates: number[];
    private VertexBuffer: WebGLBuffer;
    private TextureCoordinateBuffer: WebGLBuffer;
    private Texture: Texture;
    private spr: Sprite;
    public ModelMatrix = mat4.create();

    public constructor(shader: Shader, sprites: Sprite[], texture: Texture)
    {
        this.BatchShader = shader;
        this.Texture = texture;
        this.Vertices = [];
        this.TextureCoordinates = [];
        sprites.forEach((sprite) => {
            this.Vertices = this.Vertices.concat(sprite.Vertices);
            this.TextureCoordinates = this.TextureCoordinates.concat(sprite.TextureCoordinates);
            this.spr = sprite;
        });
        this.ModelMatrix = mat4.identity(this.ModelMatrix);

        this.VertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.Vertices), gl.STATIC_DRAW);

        this.TextureCoordinateBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.TextureCoordinateBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.TextureCoordinates), gl.STATIC_DRAW);
    }
    public Dispose(): void {
        // Shader & texture are external dependencies: they are not disposed here
        this.Vertices = null;
        this.TextureCoordinates = null;
        gl.deleteBuffer(this.VertexBuffer);
        gl.deleteBuffer(this.TextureCoordinateBuffer);
    }

    public Draw(projectionMatrix: mat4, viewMatrix: mat4): void
    {
        const shaderProgram = this.BatchShader.GetProgram();

        this.BatchShader.Use();
        const attribLocation = gl.getAttribLocation(shaderProgram, "a_pos");
        const textureCoordinateAttribLocation = gl.getAttribLocation(shaderProgram, "a_texture_coordinate");

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.Texture.GetTexture());

        gl.bindBuffer(gl.ARRAY_BUFFER, this.VertexBuffer);
        gl.enableVertexAttribArray(attribLocation);
        gl.vertexAttribPointer(attribLocation, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.TextureCoordinateBuffer);
        gl.enableVertexAttribArray(textureCoordinateAttribLocation);
        gl.vertexAttribPointer(textureCoordinateAttribLocation, 2, gl.FLOAT, false, 0, 0);

        const projectionLocation = gl.getUniformLocation(shaderProgram, "projection");
        gl.uniformMatrix4fv(projectionLocation, false, projectionMatrix);
        const viewLocation = gl.getUniformLocation(shaderProgram, "view");
        gl.uniformMatrix4fv(viewLocation, false, viewMatrix);
        const modelLocation = gl.getUniformLocation(shaderProgram, "model");
        gl.uniformMatrix4fv(modelLocation, false, this.ModelMatrix);
        const textureLocation = gl.getUniformLocation(shaderProgram, "u_sampler");
        gl.uniform1i(textureLocation, 0);
        const textureOffsetLocation = gl.getUniformLocation(shaderProgram, "texOffset");
        gl.uniform2fv(textureOffsetLocation, this.spr.textureOffset);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.drawArrays(gl.TRIANGLES, 0, this.Vertices.length / 3);

        gl.disableVertexAttribArray(attribLocation);
        gl.disableVertexAttribArray(textureCoordinateAttribLocation);
        gl.disable(gl.BLEND);
    }
}
