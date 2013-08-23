var World = {
    encodeChars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",

    create: function(width, height, born, survive) {
        this.width = width || 64;
        this.height = height || 64;

        this.born = born || [3];
        this.survive = survive || [2, 3];

        this.listeners = [];

        this.clear();
    },

    listen: function(fn) {
        this.listeners.push(fn);
    },

    emitData: function() {
        for (var i = 0; i < this.listeners.length; i++) {
            try {
                this.listeners[i](this.data.slice(0));
            } catch(e) {
                console.log("Listener failed: " + e)
            }
        }
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

        this.emitData();
    },

    load: function(savedWorld) {
        savedWorld = savedWorld.split(":");

        var newWidth = parseInt(savedWorld[0]);
        var newHeight = parseInt(savedWorld[1]);

        var flatWorld = [];

        for (var i = 0; i < savedWorld[2].length; i++) {
            var thisBlock = this.encodeChars.indexOf(savedWorld[2][i]);
            for (var j = 5; j >= 0; j--) {
                flatWorld.push((thisBlock & (1 << j)) >> j)
            }
        }

        var newWorld = [];

        for (var y = 0; y < newHeight; y++) {
            newWorld.push([]);

            for (var x = 0; x < newWidth; x++) {
                newWorld[y].push(flatWorld.shift());
            }
        }

        this.width = newWidth;
        this.height = newHeight;
        this.data = newWorld;

        this.emitData();
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
                    if (this.survive.indexOf(squareNeighbours[y][x]) < 0) {
                        this.data[y][x] = 0;
                    }
                } else {
                    if (this.born.indexOf(squareNeighbours[y][x]) > -1) {
                        this.data[y][x] = 1;
                    }
                }
            }
        }

        this.emitData();
    }
};


var CanvasToggleGrid = {
    create: function(width, height, squareSize) {
        this.width = width || 64;
        this.height = height || 64;
        this.squareSize = squareSize || 8;

        this.canvas = document.createElement("canvas");
        this.canvas.setAttribute("width", this.width * this.squareSize);
        this.canvas.setAttribute("height", this.height * this.squareSize);

        this.data = [];
        for (var y = 0; y < this.height; y++) {
            this.data.push([]);

            for (var x = 0; x < this.width; x++) {
                this.data[y].push(0);
            }
        }

        this.canvas.classList.add("clickable");

        this.drawing = null;

        this.canvas.addEventListener("mousedown", this.startDraw.bind(this));
        this.canvas.addEventListener("mousemove", this.draw.bind(this));
        this.canvas.addEventListener("mouseup", this.stopDraw.bind(this));
        this.canvas.addEventListener("mouseout", this.stopDraw.bind(this));

        this.context = this.canvas.getContext("2d");

        this.listeners = [];
    },

    listen: function(fn) {
        this.listeners.push(fn);
    },

    emitData: function() {
        for (var i = 0; i < this.listeners.length; i++) {
            try {
                this.listeners[i](this.data.slice(0));
            } catch(e) {
                console.log("Listener failed: " + e)
            }
        }
    },

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

    normalizeXY: function(evt) {
        var rect = this.canvas.getBoundingClientRect();

        var normalX = evt.clientX - rect.left;
        var normalY = evt.clientY - rect.top;

        return { "x": normalX, "y": normalY };
    },

    startDraw: function(evt) {
        coords = this.normalizeXY(evt);
        var squareX = Math.floor(coords.x / this.squareSize);
        var squareY = Math.floor(coords.y / this.squareSize);

        if (this.data[squareY][squareX] === 0) {
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
        var squareX = Math.floor(coords.x / this.squareSize);
        var squareY = Math.floor(coords.y / this.squareSize);

        if (this.drawing !== null) {
            this.data[squareY][squareX] = this.drawing;
            this.emitData();
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
        for (var y = 0; y < this.height; y++) {
            for (var x = 0; x < this.width; x++) {
                var squareX = x * this.squareSize;
                var squareY = y * this.squareSize;

                if (this.data[y][x] === 1) {
                    this.context.fillStyle = "rgb(30, 170, 130)";
                } else {
                    this.context.fillStyle = "rgb(100, 230, 190)";
                }

                this.context.fillRect(squareX, squareY, this.squareSize, this.squareSize);

                if (this.data[y][x] === 1) {
                    this.context.fillStyle = "rgb(30, 170, 130)";
                } else {
                    this.context.fillStyle = "rgb(200, 255, 240)";
                }

                this.context.fillRect(squareX + 1, squareY + 1, this.squareSize - 2, this.squareSize - 2);
            }
        }
    }
};


var Life = {
    init: function(world, grid) {
        this.world = world;
        this.grid = grid;

        this.world.create();
        this.grid.create();

        this.hasCanvas = this.grid.testCanvas();

        this.grid.listen((function(data) {
            this.world.data = data;
        }).bind(this));

        this.world.listen((function(data) {
            this.grid.data = data;
        }).bind(this));

        // abuse ko.computed to update the world when born's values change
        this.bornUpdater = ko.computed(function() {
            var newBorn = [];
            for (var n = 0; n <= 8; n++) {
                if (this.born[n]()) {
                    newBorn.push(n);
                }
            }

            this.world.born = newBorn.slice(0);

            return newBorn;
        }, this);

        // abuse ko.computed to update the world when survive's values change
        this.surviveUpdater = ko.computed(function() {
            var newSurvive = [];
            for (var n = 0; n <= 8; n++) {
                if (this.survive[n]()) {
                    newSurvive.push(n);
                }
            }

            this.world.survive = newSurvive.slice(0);

            return newSurvive;
        }, this);
    },

    playing: ko.observable(false),

    cycles: ko.observable(0),

    worldCode: ko.observable(""),

    ticksPerSecond: ko.observable(2),

    lessTicks: function() {
        this.ticksPerSecond(this.ticksPerSecond() - 1);
    },

    moreTicks: function() {
        this.ticksPerSecond(this.ticksPerSecond() + 1);
    },

    born: [
        ko.observable(false), // 0 neighbours
        ko.observable(false), // 1 neighbour
        ko.observable(false), // 2 neighbours
        ko.observable(true),  // 3 neighbours
        ko.observable(false), // 4 neighbours
        ko.observable(false), // 5 neighbours
        ko.observable(false), // 6 neighbours
        ko.observable(false), // 7 neighbours
        ko.observable(false)  // 8 neighbours
        ],

    survive: [
        ko.observable(false), // 0 neighbours
        ko.observable(false), // 1 neighbour
        ko.observable(true),  // 2 neighbours
        ko.observable(true),  // 3 neighbours
        ko.observable(false), // 4 neighbours
        ko.observable(false), // 5 neighbours
        ko.observable(false), // 6 neighbours
        ko.observable(false), // 7 neighbours
        ko.observable(false)  // 8 neighbours
        ],

    // Needed to preserve the world's this without bind.
    worldTick: function() {
        this.world.tick();
        this.cycles(this.cycles() + 1);
    },

    // Needed to preserve the world's this without bind.
    worldClear: function() {
        this.world.clear();
        this.cycles(0);
    },

    worldPlay: function() {
        this.playing(true);
        this.autoTick();
    },

    worldPause: function() {
        this.playing(false);
    },

    worldSave: function() {
        var worldCodeArray = this.world.save().replace("64:64:", "").split("");

        var worldCode = "";
        while (worldCodeArray.length > 0) {
            worldCode += worldCodeArray.splice(0, Math.min(72, worldCodeArray.length)).join("");
            if (worldCodeArray.length > 0) {
                worldCode += "\n";
            }
        }

        this.worldCode(worldCode);
    },

    worldLoad: function() {
        this.world.load("64:64:" + this.worldCode().split("\n").join(""));
        this.worldCode("");
        this.cycles(0);
    },

    autoTick: function() {
        if (this.playing()) {
            this.worldTick();
            setTimeout(this.autoTick.bind(this), Math.floor(1000 / this.ticksPerSecond()));
        }
    },
    
    run: function() {
        var canvasContainer = document.getElementById("canvasContainer");

        canvasContainer.appendChild(this.grid.canvas);

        this.grid.startAnimating();
    }
};

Life.init(World, CanvasToggleGrid);
ko.applyBindings(Life);
Life.run();
