# WebGL engine

A little webgl experiment. Features batched sprite rendering sprite animation collision detection, and a little bit of the WebAudio API.

The original intent for this project was to prototype a batched renderer. Based on the experience gained here, a batched renderer was implemented in my [ProceduralCity](https://github.com/robotjatek/ProceduralCity) project.

## Build

Run the following command from the terminal:

`$> tsc --build tsconfig.json`

## Running locally

- install a http server `npm install --global http-server`
- run `npm install` from the root folder
- `$> tsc --build tsconfig.json`
- run `http-server command` from the root folder

![screenshot](webgl.png)
