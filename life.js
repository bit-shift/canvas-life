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

CanvasGrid.testCanvas = function() {
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
    if (window.requestAnimationFrame) {
        CanvasGrid.prototype.animate = function(timestamp) {
            this.render();

            window.requestAnimationFrame(this.animate.bind(this));
        };
    } else if (window.mozRequestAnimationFrame) {
        CanvasGrid.prototype.animate = function(timestamp) {
            this.render();

            window.mozRequestAnimationFrame(this.animate.bind(this));
        };
    } else if (window.webkitRequestAnimationFrame) {
        CanvasGrid.prototype.animate = function(timestamp) {
            this.render();

            window.webkitRequestAnimationFrame(this.animate.bind(this));
        };
    } else {
        CanvasGrid.prototype.animate = function() {
            // no-op
        }
    }

    this.animate(timestamp);
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
    init: function() {
        // abuse ko.computed to update the world when born's values change
        this.bornAggregate = ko.computed(function() {
            var newBorn = [];
            for (var n = 0; n <= 8; n++) {
                if (this.born[n]()) {
                    newBorn.push(n);
                }
            }

            if (this.world) {
                this.world.born = newBorn.slice(0);
            }

            return newBorn;
        }, this);

        // abuse ko.computed to update the world when survive's values change
        this.surviveAggregate = ko.computed(function() {
            var newSurvive = [];
            for (var n = 0; n <= 8; n++) {
                if (this.survive[n]()) {
                    newSurvive.push(n);
                }
            }

            if (this.world) {
                this.world.survive = newSurvive.slice(0);
            }

            return newSurvive;
        }, this);

        this.worldUpdater = (function() {
            // bail out when loading a world, since that knows how to recreate everything anyway
            if (this.loading) {
                return;
            }

            // get ints whether or not ko has fucked up the types
            var worldWidth = parseInt("" + this.worldWidth());
            var worldHeight = parseInt("" + this.worldHeight());

            this.world = new World(worldWidth, worldHeight,
                     this.bornAggregate(), this.surviveAggregate());

            this.gridUpdater();  // run manually to rebuild the grid
        }).bind(this);

        this.gridUpdater = (function() {
            var canvasContainer = document.getElementById("canvasContainer");
            while (canvasContainer.firstChild) {
                canvasContainer.removeChild(canvasContainer.firstChild);
            }

            this.grid = new CanvasGrid(this.worldWidth.peek(), this.worldHeight.peek(), this.scale());

            this.grid.data = this.world.data.slice(0);

            this.grid.addListener((function(data) {
                this.world.data = data;
            }).bind(this));

            this.world.addListener((function(data) {
                this.grid.data = data;
            }).bind(this));

            canvasContainer.appendChild(this.grid.canvas);
            this.grid.animate();
        }).bind(this);

        this.worldWidth.subscribe(this.worldUpdater);
        this.worldHeight.subscribe(this.worldUpdater);
        this.scale.subscribe(this.gridUpdater);

        this.worldUpdater();
    },

    hasCanvas: CanvasGrid.testCanvas(),

    playing: ko.observable(false),

    cycles: ko.observable(0),

    worldCode: ko.observable(""),

    ticksPerSecond: ko.observable(2),

    worldWidth: ko.observable(64),

    worldHeight: ko.observable(64),

    scale: ko.observable(8),

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

    saveExactWorld: ko.observable(true),

    worldSave: function() {
        // determine minimum bounding rect, world-sized if exact world wanted
        var boundingRect = {
            "x1": 0,
            "y1": 0,
            "x2": this.world.width - 1,
            "y2": this.world.height - 1
        };

        if (this.saveExactWorld() === false) {
            var x1 = -1, y1 = -1, x2 = 0, y2 = 0;

            for (var y = 0; y < this.world.height; y++) {
                for (var x = 0; x < this.world.width; x++) {
                    if (this.world.data[y][x] === 1) {
                        // live cell, expand the rect if necessary

                        if (x1 === -1) {
                            x1 = x;
                        } else {
                            x1 = Math.min(x1, x)
                        }

                        if (y1 === -1) {
                            y1 = y;
                        } else {
                            y1 = Math.min(y1, y)
                        }

                        x2 = Math.max(x2, x);
                        y2 = Math.max(y2, y);
                    }
                }
            }

            if (x1 === -1) {  // no live cells
                x1 = 0;
            }
            if (y1 === -1) {  // no live cells
                y1 = 0;
            }

            boundingRect.x1 = x1;
            boundingRect.y1 = y1;
            boundingRect.x2 = x2;
            boundingRect.y2 = y2;
        }

        boundingRect.width = (boundingRect.x2 + 1) - boundingRect.x1;
        boundingRect.height = (boundingRect.y2 + 1) - boundingRect.y1;

        // header lines
        var worldCode = "#WW " + this.world.width + "\n";
        worldCode += "#WH " + this.world.height + "\n";
        worldCode += "x = " + boundingRect.width + ", ";
        worldCode += "y = " + boundingRect.height + ", ";

        worldCode += "rule = B";
        for (var b = 0; b < 9; b++) {
            if(this.born[b]()) {
                worldCode += b;
            }
        }
        worldCode += "/S";
        for (var s = 0; s < 9; s++) {
            if(this.survive[s]()) {
                worldCode += s;
            }
        }


        // serialize world
        var blocks = []

        for (var y = boundingRect.y1; y < boundingRect.y2 + 1; y++) {
            for (var x = boundingRect.x1; x < boundingRect.x2 + 1; x++) {
                var blockType = "b";
                if (this.world.data[y][x] === 1) {
                    blockType = "o"
                }

                if (blocks.length === 0 || blocks[blocks.length-1].type !== blockType) {
                    blocks.push({
                        "type": blockType,
                        "count": 1
                    });
                } else {
                    blocks[blocks.length-1].count += 1;
                }
            }

            if (blocks[blocks.length-1].type === "b") {
                blocks.pop();  // discard line-ending dead cells
            }

            if (y === boundingRect.y2) {
                blocks.push({
                    "type": "!",
                    "count": 1
                });
            } else {
                if (blocks.length === 0 || blocks[blocks.length-1].type !== "$") {
                    blocks.push({
                        "type": "$",
                        "count": 1
                    });
                } else {
                    blocks[blocks.length-1].count += 1;
                }
            }
        }

        var lines = [];
        for (var i = 0; i < blocks.length; i++) {
            var blockText = "";
            if (blocks[i].count > 1) {
                blockText += blocks[i].count;
            }
            blockText += blocks[i].type;

            if (lines.length === 0 || lines[lines.length-1].length + blockText.length > 70) {
                lines.push(blockText);
            } else {
                lines[lines.length-1] += blockText;
            }
        }

        worldCode += "\n" + lines.join("\n");

        this.worldCode(worldCode);
    },

    worldLoad: function() {
        this.loading = true;

        var worldWidth = 0, worldHeight = 0;

        var worldCode = this.worldCode().split("\n");
        var worldCodeLines = [];
        for (var i = 0; i < worldCode.length; i++) {
            var line = worldCode[i].replace(/^\s+/g, "");
            if (line !== "" && line[0] !== "#") {
                worldCodeLines.push(worldCode[i]);
            } else if (line !== "" && line.slice(0, 3) === "#WH") {
                worldHeight = parseInt(line.split(" ")[1]);
            } else if (line !== "" && line.slice(0, 3) === "#WW") {
                worldWidth = parseInt(line.split(" ")[1]);
            }
        }

        // parse header
        var header = {};
        var headerParts = worldCodeLines[0].split(",");
        for (var i = 0; i < headerParts.length; i++) {
            var headerItem = headerParts[i].replace(/\s+/g, "");
            var headerItemParts = headerItem.split("=");
            header[headerItemParts[0]] = headerItemParts[1];
        }

        // prepare new world based on header
        var patternWidth = parseInt(header["x"]);
        var patternHeight = parseInt(header["y"]);

        if (worldWidth === 0) {
            worldWidth = this.world.width;
        }

        if (worldHeight === 0) {
            worldHeight = this.world.height;
        }

        if (patternWidth > worldWidth) {
            throw "Pattern too wide.";
        }

        if (patternHeight > worldHeight) {
            throw "Pattern too wide.";
        }

        var xOffset = Math.floor((worldWidth - patternWidth) / 2);
        var yOffset = Math.floor((worldHeight - patternHeight) / 2);

        var rule = (header["rule"] || "B3/S23").split("/");
        var bornMap = [false, false, false, false, false, false, false, false, false];
        var surviveMap = [false, false, false, false, false, false, false, false, false];
        var born = [], survive = [];
        for (var i = 0; i < rule.length; i++) {
            var ruleType = rule[i][0];
            var ruleBody = rule[i].slice(1);
            for (var j = 0; j < ruleBody.length; j++) {
                var n = parseInt(ruleBody[j]);
                if (ruleType.toLowerCase() === "b") {
                    bornMap[n] = true;
                    born.push(n);
                } else if (ruleType.toLowerCase() === "s") {
                    surviveMap[n] = true;
                    survive.push(n);
                }
            }
        }

        var newWorld = new World(worldWidth, worldHeight, born, survive);

        // populate world by parsing data
        var worldData = worldCodeLines.slice(1).join("");
        var x = xOffset, y = yOffset;
        var curNum = "";
        var parsing = true;
        for (var i = 0; i < worldData.length; i++) {
            if (curNum === "" && (worldData[i] === "" || worldData[i] === "\t")) {
                // skip
            } else if (worldData[i] >= "0" && worldData[i] <= "9") {
                curNum += worldData[i];
            } else if (worldData[i].toLowerCase() === "b" ||
                       worldData[i].toLowerCase() === "o" ||
                       worldData[i] === "$" ||
                       worldData[i] === "!") {
                var count = 1;
                if (curNum !== "") {
                    count = parseInt(curNum);
                    curNum = "";
                }

                for (var j = 0; j < count; j++) {
                    if (worldData[i].toLowerCase() === "b") {
                        newWorld.data[y][x] = 0;
                        x += 1;
                    } else if (worldData[i].toLowerCase() === "o") {
                        newWorld.data[y][x] = 1;
                        x += 1;
                    } else if (worldData[i] === "$") {
                        y += 1;
                        x = xOffset;
                    } else if (worldData[i] === "!") {
                        parsing = false;
                        break;
                    }
                }
            }

            if (!parsing) {
                break;  // exit early if parsing done
            }
        }

        this.world = newWorld;

        this.worldWidth(worldWidth);
        this.worldHeight(worldHeight);

        for(var i = 0; i < 9; i++) {
            this.born[i](bornMap[i]);
            this.survive[i](surviveMap[i]);
        }

        this.gridUpdater();

        this.loading = false;

        this.worldCode("");
        this.cycles(0);
    },

    autoTick: function() {
        if (this.playing()) {
            this.worldTick();
            setTimeout(this.autoTick.bind(this), Math.floor(1000 / this.ticksPerSecond()));
        }
    }
};

Life.init();
ko.applyBindings(Life);
