var CellGrid = function(width, height) {
    this.width = width || 64;
    this.height = height || 64;
    this.data = [];

    for (var y = 0; y < this.height; y++) {
        this.data.push([]);

        for (var x = 0; x < this.width; x++) {
            this.data[y].push(0);
        }
    }
};

CellGrid.prototype.set = function(x, y, val) {
    this.data[y][x] = val;
};

CellGrid.prototype.fill = function(val) {
    for (var y = 0; y < this.height; y++) {
        for (var x = 0; x < this.width; x++) {
            this.set(x, y, val);
        }
    }
};

CellGrid.prototype.clear = function() {
    this.fill(0);
};

CellGrid.prototype.save = function() {
    return {
        "width": this.width,
        "height": this.height,
        "data": this.data.slice(0)
    };
};


var ListenableGrid = function(width, height) {
    CellGrid.call(this, width, height);
    this.listeners = {};
    this.nextListenerId = 0;
};
ListenableGrid.prototype = new CellGrid();
ListenableGrid.prototype.constructor = ListenableGrid;

ListenableGrid.prototype.addListener = function(listener) {
    this.listeners[this.nextListenerId] = listener;
    return this.nextListenerId++;
};

ListenableGrid.prototype.removeListener = function(listenerId) {
    if (this.listeners[listenerId]) {
        delete this.listeners[listenerId];
    } else {
        throw ("No such listener (id " + listenerId + ")");
    }
};

ListenableGrid.prototype.emitUpdate = function() {
    for (var listenerId in this.listeners) {
        if (this.listeners.hasOwnProperty(listenerId)) {
            try {
                this.listeners[listenerId](this.data.slice(0));
            } catch (e) {
                console.error("Listener " + listenerId + " failed: " + e);
            }
        }
    }
};

ListenableGrid.prototype.set = function(x, y, val) {
    CellGrid.prototype.set.call(this, x, y, val);
    this.emitUpdate();
};


var World = function(width, height, born, survive) {
    ListenableGrid.call(this, width, height);
    this.born = born || [3];
    this.survive = survive || [2, 3];
};
World.prototype = new ListenableGrid();
World.prototype.constructor = World;

World.prototype.tick = function() {
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
                    this.set(x, y, 0);
                }
            } else {
                if (this.born.indexOf(squareNeighbours[y][x]) > -1) {
                    this.set(x, y, 1);
                }
            }
        }
    }
};


var CanvasGrid = function(width, height, squareSize) {
    ListenableGrid.call(this, width, height);
    this.squareSize = squareSize || 8;

    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("width", this.width * this.squareSize);
    this.canvas.setAttribute("height", this.height * this.squareSize);

    this.canvas.addEventListener("mousedown", this.startDraw.bind(this));
    this.canvas.addEventListener("mousemove", this.draw.bind(this));
    this.canvas.addEventListener("mouseup", this.stopDraw.bind(this));
    this.canvas.addEventListener("mouseout", this.stopDraw.bind(this));
    this.canvas.classList.add("clickable");
    this.drawing = null;

    this.context = this.canvas.getContext("2d");
};
CanvasGrid.prototype = new ListenableGrid();
CanvasGrid.prototype.constructor = CanvasGrid;

CanvasGrid.prototype.testCanvas = function() {
    var c = document.createElement("canvas");
    if (c.getContext) {
        return true;
    } else {
        return false;
    }
};

CanvasGrid.prototype.squareXY = function(evt) {
    var rect = this.canvas.getBoundingClientRect();

    var normalX = evt.clientX - rect.left;
    var normalY = evt.clientY - rect.top;

    return {
        "x": Math.floor(normalX / this.squareSize),
        "y": Math.floor(normalY / this.squareSize)
    };
};

CanvasGrid.prototype.startDraw = function(evt) {
    coords = this.squareXY(evt);

    if (this.data[coords.y][coords.x] === 0) {
        this.drawing = 1;
    } else {
        this.drawing = 0;
    }

    this.draw(evt);
};

CanvasGrid.prototype.stopDraw = function(evt) {
    this.drawing = null;
};

CanvasGrid.prototype.draw = function(evt) {
    coords = this.squareXY(evt);

    if (this.drawing !== null) {
        this.set(coords.x, coords.y, this.drawing);
    }
};

CanvasGrid.prototype.animate = function(timestamp) {
    this.render();

    (window.requestAnimationFrame ||
     window.mozRequestAnimationFrame ||
     window.webkitRequestAnimationFrame)(this.animate.bind(this));
};

CanvasGrid.prototype.render = function(dt) {
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
};


var Life = {
    init: function(world, grid) {
        this.world = world;
        this.grid = grid;

        this.hasCanvas = this.grid.testCanvas();

        this.grid.addListener((function(data) {
            this.world.data = data;
        }).bind(this));

        this.world.addListener((function(data) {
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

        this.grid.animate();
    }
};

Life.init(new World(), new CanvasGrid());
ko.applyBindings(Life);
Life.run();
