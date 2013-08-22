var World = {
    encodeChars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",

    create: function(width, height) {
        this.width = width || 64;
        this.height = height || 64;
        this.clear();
    },

    clear: function() {
        this.fill(0);
    },

    fill: function(val) {
        this.data = [];

        for (var y = 0; y < this.height; y++) {
            this.data.push([]);

            for (var x = 0; x < this.width; x++) {
                this.data[y].push(val);
            }
        }
    },

    set: function(x, y, val) {
        this.data[y][x] = val;
    },

    save: function () {
        var worldPrefix = "" + this.width;
        worldPrefix += ":" + this.height + ":";

        var worldData = "";

        var nextBlock = [];
        for (var y = 0; y < this.height; y++) {
            for (var x = 0; x < this.width; x++) {
                nextBlock.push(this.data[y][x]);

                if (nextBlock.length === 6) {
                    var blockValue = 0;
                    for (var i = 0; i < 6; i++) {
                        blockValue += nextBlock.shift() << (5 - i);
                    }

                    worldData += this.encodeChars[blockValue];
                }
            }
        }

        if (nextBlock.length !== 0) {
            var blockValue = 0;
            for (var i = 0; i < nextBlock.length; i++) {
                blockValue += nextBlock[i] << (5 - i);
            }

            worldData += this.encodeChars[blockValue];
        }

        return worldPrefix + worldData;
    },

    tick: function() {
        var squareNeighbours = [];
        for (var y = 0; y < this.height; y++) {
            squareNeighbours.push([]);

            for (var x = 0; x < this.width; x++) {
                squareNeighbours[y].push(0);

                for (var yOffset = -1; yOffset <= 1; yOffset++) {
                    for (var xOffset = -1; xOffset <= 1; xOffset++) {
                        // wrap coordinates
                        var wrappedY = (this.height + y + yOffset) % this.height;
                        var wrappedX = (this.width + x + xOffset) % this.width;

                        squareNeighbours[y][x] += this.data[wrappedY][wrappedX];
                    }
                }

                squareNeighbours[y][x] -= this.data[y][x];
            }
        }

        for (var y = 0; y < this.height; y++) {
            for (var x = 0; x < this.width; x++) {
                if (this.data[y][x] === 1) {
                    if (squareNeighbours[y][x] < 2 || squareNeighbours[y][x] > 3) {
                        this.data[y][x] = 0;
                    }
                } else {
                    if (squareNeighbours[y][x] === 3) {
                        this.data[y][x] = 1;
                    }
                }
            }
        }
    }
};


var Life = {
    testCanvas: function() {
        var c = document.createElement("canvas");
        if (c.getContext) {
            return true;
        } else {
            return false;
        }
    },

    reqAnimFrame: function(cb) {
        if (window.requestAnimationFrame) {
            window.requestAnimationFrame(cb);
        } else if (window.mozRequestAnimationFrame) {
            window.mozRequestAnimationFrame(cb);
        } else if (window.webkitRequestAnimationFrame) {
            window.webkitRequestAnimationFrame(cb);
        }
    },

    createCanvas: function() {
        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("width", 512);
        this.canvas.setAttribute("height", 512);

        this.canvas.classList.add("clickable");

        this.drawing = null;

        this.canvas.addEventListener("mousedown", this.startDraw.bind(this));
        this.canvas.addEventListener("mousemove", this.draw.bind(this));
        this.canvas.addEventListener("mouseup", this.stopDraw.bind(this));
        this.canvas.addEventListener("mouseout", this.stopDraw.bind(this));

        this.context = this.canvas.getContext("2d");
    },

    normalizeXY: function(evt) {
        var normalX = 0;
        var normalY = 0;

        if (evt.x !== undefined && evt.y !== undefined) {
            normalX = evt.x;
            normalY = evt.y;
        } else {  // Firefox, fun time!
            normalX = evt.clientX + document.body.scrollLeft +
                document.documentElement.scrollLeft;
            normalY = evt.clientY + document.body.scrollTop +
                document.documentElement.scrollTop;
        }

        normalX -= this.canvas.offsetLeft;
        normalY -= this.canvas.offsetTop;

        return { "x": normalX, "y": normalY };
    },

    startDraw: function(evt) {
        coords = this.normalizeXY(evt);
        var squareX = Math.floor(coords.x / 8);
        var squareY = Math.floor(coords.y / 8);

        if (this.world.data[squareY][squareX] === 0) {
            this.drawing = 1;
        } else {
            this.drawing = 0;
        }

        this.draw(evt);
    },

    stopDraw: function(evt) {
        this.drawing = null;
    },

    draw: function(evt) {
        coords = this.normalizeXY(evt);
        var squareX = Math.floor(coords.x / 8);
        var squareY = Math.floor(coords.y / 8);

        if (this.drawing !== null) {
            this.world.set(squareX, squareY, this.drawing);
        }
    },

    startAnimating: function() {
        this.animate(-1);
    },

    animate: function(timestamp) {
        this.render();

        this.reqAnimFrame(this.animate.bind(this));
    },

    render: function(dt) {
        for (var y = 0; y < 64; y++) {
            for (var x = 0; x < 64; x++) {
                var squareX = x * 8;
                var squareY = y * 8;

                if (this.world.data[y][x] === 1) {
                    this.context.fillStyle = "rgb(30, 170, 130)";
                } else {
                    this.context.fillStyle = "rgb(100, 230, 190)";
                }

                this.context.fillRect(squareX, squareY, 8, 8);

                if (this.world.data[y][x] === 1) {
                    this.context.fillStyle = "rgb(30, 170, 130)";
                } else {
                    this.context.fillStyle = "rgb(200, 255, 240)";
                }

                this.context.fillRect(squareX + 1, squareY + 1, 6, 6);
            }
        }
    },

    run: function(world) {
        this.world = world;

        this.world.create();

        var canvasContainer = document.getElementById("canvasContainer");

        if (this.testCanvas()) {
            this.createCanvas();
            canvasContainer.appendChild(this.canvas);

            var tickButton = document.createElement("button");
            tickButton.innerHTML = "Tick";
            tickButton.addEventListener("click", this.world.tick.bind(this.world));
            canvasContainer.appendChild(tickButton);

            var clearButton = document.createElement("button");
            clearButton.innerHTML = "Clear";
            clearButton.setAttribute("tabindex", -1);
            clearButton.addEventListener("click", this.world.clear.bind(this.world));
            canvasContainer.appendChild(clearButton);

            this.startAnimating();
        } else {
            var noCanvasErr = document.createElement("p");
            noCanvasErr.innerHTML = "Your browser does not appear to support the canvas API.";
            canvasContainer.appendChild(noCanvasErr);
        }
    }
};

Life.run(World);
