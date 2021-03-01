class Node {
    /**
    * @param value: The text to be contained in the node
    * @param edges: A list of references to other nodes
    */
    constructor(value, edges = []) {
        this.value = value;
        this.placeholder = this.getPlaceholder(value);
        this.title = this.getTitle(value);
        this.edges = edges;

        // other attributes
        this.found = false;
        this.parent = false;
        this.startingNode = false;
        this.visible = false;
        this.htmlText = null;
        this.visualLinks = [];
        this.visuallyConnected = new Set();
        this.center = {
            'x': 100,
            'y': 100
        };
    }

    /**
    * @param otherNode: a reference to the new node we are connecting to
    */
    addConnection(otherNode) {
        this.edges.push(otherNode);
    }

    /**
    * @param value: The text that we are building a placeholder for
    */
    getPlaceholder(value) {
        let result = "";
        for (let i = 0; i < value.length; i++) {
            if (!isAlphaNumeric(value[i])) {
                result += value[i];
            } else {
                result += "●";
            }
        }

        return result;
    }

    /**
    * @param value: The text that we are building a title for
    */
    getTitle(value) {
        let tokens = value.split(" ");
        tokens = tokens.map((tok) => {
            return tok.length;
        });

        return tokens.join(" ");
    }

    /**
    * No params
    */
    entryString() {
        return this.edges.join(", ");
    }
    /**
    * No params
    */
    text() {
        return this.found ? this.value : this.placeholder;
    }
}

class NodeMap {
    constructor() {
        this.nodes = new Map();
    }

    /**
    * @param node: The node that we are adding to the map
    */
    add(node) {
        this.nodes.set(node.value.toLowerCase(), node);
    }

    /**
    * @param text: The text of the node that we want to get 
    */
    get(text) {
        return this.nodes.get(text.toLowerCase());
    }

    /**
    * @param node: The text of the node that we want to check for
    */
    has(text) {
        return this.nodes.has(text.toLowerCase());
    }

}

// CONSTANTS & GLOBALS
// document references and things like that
const guessInput = document.getElementById("guessInput");
const gameWrapper = document.getElementById("gameWrapper");
const gameSvg = document.getElementById("gameSvg");
const displayPanel = document.getElementById("displayPanel");
const guessPanel = document.getElementById("guessPanelWrapper");
const transformLayer = document.getElementById("transformLayer");
const loadingText = document.getElementById("loading");

const SVG_WIDTH = window.innerWidth * 1;
const SVG_HEIGHT = window.innerHeight * 1;
const CIRCLE_RADIUS = 15;

// this will store any node that is currently clicked/selected
let currentNode = null;

// this will store all strings, with references to their respective nodes
const nodeMap = new NodeMap();

// this will store our nodes in a graph format, for drawing
const graph = new Springy.Graph();

// will map strings to their Springy nodes
const springyMap = {};


// get our transform layer ready for dragging and scaling
transformLayer.x = 0;
transformLayer.y = 0;
transformLayer.scale = 1;
transformLayer.setAttribute("transform", `translate(${transformLayer.x},${transformLayer.y}) scale(${transformLayer.scale})`);

// LISTENERS
// setting up document listeners here
guessInput.onkeypress = (e) => {
    if (e.keyCode === 13) {
        submitGuess(guessInput.value.trim());
        guessInput.value = "";
    }
}

function onNodeClick(text) {
    if (currentNode !== null) {
        // we have an existing selected node we need to get rid of
        deselectNode(currentNode);
    }
    currentNode = nodeMap.get(text);
    selectNode(currentNode);
}

transformLayer.onmousedown = (e) => {
    transformLayer.xOffset = e.clientX - transformLayer.x;
    transformLayer.yOffset = e.clientY - transformLayer.y;
    transformLayer.onmousemove = handleScreenDrag;
}

transformLayer.onmouseup = (e) => {
    transformLayer.onmousemove = null;
}

transformLayer.onwheel = (e) => {
    e.preventDefault();
    transformLayer.scale += e.deltaY * -0.001;
    transformLayer.x += e.deltaY * 0.735;
    transformLayer.y += e.deltaY * 0.5;
    // Restrict scale
    transformLayer.scale = Math.min(Math.max(.3, transformLayer.scale), 2);

    // Apply scale transform
    transformLayer.setAttribute("transform", `translate(${transformLayer.x},${transformLayer.y}) scale(${transformLayer.scale})`);
}

// FUNCTIONS
// helper methods!

// straight from the overflow https://stackoverflow.com/a/25352300
function isAlphaNumeric(str) {
    let code, i, len;

    for (i = 0, len = str.length; i < len; i++) {
        code = str.charCodeAt(i);
        if (!(code > 47 && code < 58) && // numeric (0-9)
            !(code > 64 && code < 91) && // upper alpha (A-Z)
            !(code > 96 && code < 123)) { // lower alpha (a-z)
            return false;
        }
    }
    return true;
};

function handleScreenDrag(e) {
    transformLayer.x = e.clientX - transformLayer.xOffset;
    transformLayer.y = e.clientY - transformLayer.yOffset;

    transformLayer.setAttribute("transform", `translate(${transformLayer.x},${transformLayer.y}) scale(${transformLayer.scale})`);
}

// un-highlight links and clear the display pane
function deselectNode(node) {

    while (displayPanel.firstChild) {
        displayPanel.removeChild(displayPanel.firstChild);
    }

    // only continue if we have a node
    if (node === null) return;

    node.visualLinks.forEach((link) => {
        link.setAttribute("class", "link");
    });
}

// highlight links and update the display pane
function selectNode(node) {
    if (node === null) return;
    // update display panel title
    let title = document.createElement("p");
    title.innerText = node.text();
    title.className = "title";
    displayPanel.appendChild(title);

    // update display panel subitems
    node.edges.forEach((edge) => {
        if (edge.visible) {
            let subitem = document.createElement("p");
            subitem.innerText = edge.text();
            displayPanel.appendChild(subitem);

            // when clicked, they should focus the next thing
            subitem.onclick = (e) => {
                deselectNode(currentNode);
                selectNode(edge);
            }
        }
    });

    // highlight links
    node.visualLinks.forEach((link) => {
        link.setAttribute("class", "link active");
    });
}

function submitGuess(guess) {
    const p = document.createElement("p");

    const guessedNode = nodeMap.get(guess);
    // three cases: we have already found it, this is a new find, or it is a wrong guess
    if (guessedNode && guessedNode.found) {
        p.innerText = guessedNode.value + ": already found";
    } else if (guessedNode && guessedNode.visible) {
        // we reveal the node and add its children to the gui
        revealNode(guessedNode);

        // set guess text
        p.innerText = guessedNode.value + ": yep!";

        //update display panel
        deselectNode(currentNode);
        selectNode(currentNode);
    } else {
        // set guess text
        p.innerText = guess + ": nope";
        p.className = "incorrect";
    }

    // manage length
    if (guessPanel.childElementCount === 10) {
        guessPanel.removeChild(guessPanel.lastElementChild);
    }

    guessPanel.prepend(p);
}

// reveals a node and its connections
function revealNode(node) {
    node.found = true;
    node.htmlText.innerHTML = node.value;
    node.edges.forEach((edge) => {
        if (!edge.visible) {
            addNodeToGui(edge);
        }
        if (!node.visuallyConnected.has(edge.value)) {
            addConnectionToGui(node, edge);
        }
    });
}

// creates and returns node, plus handles the overhead of adding to nodeMap
function createNode(text, parent = false, edges = []) {
    const n = new Node(text);
    n.startingNode = parent;
    n.parent = parent;
    n.found = parent;
    n.visible = parent;

    nodeMap.add(n);
    springyMap[text] = graph.newNode({ label: text });
    return n;
}

// gets node from nodemap

// creates a connection between two nodes
function createConnection(node1, node2) {
    // create the data structure connnection
    node1.addConnection(node2);
    node2.addConnection(node1);

    const n1 = springyMap[node1.value];
    const n2 = springyMap[node2.value];
    graph.newEdge(n1, n2)
}

// draws a visual connection between two nodes
function addConnectionToGui(node1, node2) {
    // creates a visual connection between two nodes in the GUI
    let line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("class", "link");
    line.setAttribute("x1", node1.center.x);
    line.setAttribute("y1", node1.center.y);
    line.setAttribute("x2", node2.center.x);
    line.setAttribute("y2", node2.center.y);

    // add link to gui and store it in each node
    transformLayer.prepend(line);
    node1.visualLinks.push(line);
    node1.visuallyConnected.add(node2.value);
    node2.visualLinks.push(line);
    node2.visuallyConnected.add(node1.value);
}

// populates the graph with nodes
async function populateGraph() {
    // reads json file 
    // TODO: read localstorage to see if game exists already
    const response = await fetch("/data.json");
    const data = await response.json();

    // create nodes
    data['nodes'].forEach(node => {
        const parent = data['starting'].includes(node['name']);
        createNode(node['name'], parent);
    });

    // create links
    data['links'].forEach(link => {
        const n1 = nodeMap.get(link['source']);
        const n2 = nodeMap.get(link['target']);
        createConnection(n1, n2);
    });

}

// adds new node to the game
function addNodeToGui(node) {

    // add new canvas circle to game
    let g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", node.parent ? "node parent" : "node");

    g.setAttribute("transform", `translate(${node.center.x}, ${node.center.y})`);

    // add sub-components to new svg element
    let title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.innerHTML = node.title;

    let circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", CIRCLE_RADIUS);

    let text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.innerHTML = node.text();
    text.setAttribute("dy", "0.3em");

    g.appendChild(title);
    g.append(circle);
    g.append(text);
    transformLayer.append(g)

    // set up listener for node clicks
    g.onclick = (e) => {
        e.preventDefault();
        onNodeClick(node.value);
    }

    // update node properties
    node.visible = true;
    node.htmlText = text;
}

function spaceTaken(x, y, width, height) {
    let foundConflict = false;
    nodeMap.nodes.forEach((node) => {
        if (node.center) {
            let x1 = node.center.x - node.width / 2;
            let y1 = node.center.y - node.height / 2;
            let x2 = x - width / 2;
            let y2 = y - height / 2;

            if (x1 < x2 + width && x1 + node.width > x2 && y1 < y2 + height && y2 < y1 + node.height) {
                foundConflict = true;
            }
        }
    });
    return foundConflict;
}

// goes through each node and assigns it a position
// uses Springy library
function assignPositions() {
    const layout = new Springy.Layout.ForceDirected(
        graph,
        600.0, // Spring stiffness
        100.0, // Node repulsion
        0.5, // Damping
        10, // min energy to stop
    );

    const toScreen = function (p) {
        let currentBB = layout.getBoundingBox();
        var size = currentBB.topright.subtract(currentBB.bottomleft);
        var sx = p.subtract(currentBB.bottomleft).divide(size.x).x * SVG_WIDTH;
        var sy = p.subtract(currentBB.bottomleft).divide(size.y).y * SVG_HEIGHT;
        return new Springy.Vector(sx, sy);
    };

    const renderer = new Springy.Renderer(
        layout,
        function clear() {
            // code to clear screen
            transformLayer.innerHTML = `<rect />`;
        },
        function drawEdge(edge, p1, p2) {
            // draw an edge
            return;
        },
        function drawNode(node, p) {
            // draw a node
            const n = nodeMap.get(node.data.label);
            const coords = toScreen(p);
            n.center = {
                "x": coords.x,
                "y": coords.y
            }
        }, function onRenderStop() {
            nodeMap.nodes.forEach(n => {
                if (n.startingNode) {
                    // add node and children
                    addNodeToGui(n);
                    n.edges.forEach((edge) => {
                        addNodeToGui(edge);
                        // connect node and child
                        addConnectionToGui(n, edge);
                    });
                }
            });
            loadingText.style.display = "none";
        }
    );
}

function setup() {

    gameSvg.setAttribute("width", SVG_WIDTH);
    gameSvg.setAttribute("height", SVG_HEIGHT);

    populateGraph();

    assignPositions();
}

// BEGIN
// entry point to the program
setup();