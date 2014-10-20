/*D3.js code to visualize a user's LinkedIn network from 2d array. Adjacency matrix of user's contacts
is received after being parsed from LinkedIn API.*/
function visualizeConnections(data, enableConnectionsToSelf, colorization) {
    var matrix = enableConnectionsToSelf ? data.matrix : data.reducedMatrix;
    var connections = data.publicConnections;
    var me = { firstName: "Me", lastName: "" };
    var ggraph = d3.graph();
    ggraph.matrix(matrix);
    var nodes = enableConnectionsToSelf ? [ me ].concat(connections) : connections;
    ggraph.nodes(nodes);
    var glinks = ggraph.links().filter(function(d) {return d.value > 0;});
    var gnodes = ggraph.nodes();
    var radius = 5;
    var defaultLinkStrength = 1;
    var myLinkStrength = 0.2;
    var showText = true;

    //console.log('nodes', ggraph.nodes());
    //console.log('links', JSON.stringify(ggraph.links());
    //console.log('description', ggraph.description());

    var color = d3.scale.category20();

    var width = 960,
        height = 800;



    var linkDistance = function(link) {
        var len1 = glinks.filter(function(d) {return (d.source.id == link.source.id);}).length;
        var len2 = glinks.filter(function(d) {return  d.target.id == link.target.id;}).length;
        //console.log(len1, len2);
        return 160;
    };

    var force = d3.layout.force()
        .nodes(gnodes)
        .links(glinks)
        .size([width, height])
        //.linkDistance(linkDistance)
        .linkStrength(function(d) { return (d.source.id && d.target.id) ? d.value * defaultLinkStrength : d.value * myLinkStrength; } )
        .charge(-900)
		.gravity(.8)
        //.on("tick", tick)
        .start();

    d3.select("body").selectAll("svg").remove();
    var svg = d3.select("div#d3_viewport").append("svg")
        .attr("width", width)
        .attr("height", height)        
        .call(d3.behavior.zoom()
        .on("zoom", redraw))
        .append("g");

    function redraw() {
        svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }

    // add the links and the arrows
    var glink = svg.selectAll(".link")
        .data(force.links());
    var glinkEnter = glink
        .enter().append("line")
        .attr("class", "link")
        .style("stroke-width", function (d) {
        return Math.sqrt(d.value);
    });
    glink.exit().remove();


    // define the nodes
    var gnode = svg.selectAll(".node")
        .data(force.nodes());
    var gnodeEnter = gnode
        .enter()
        .append("g");
    gnodeEnter
        .append("circle")
        .attr("class", "node")
        .attr("r", radius)
        .call(force.drag);

    console.log("Colorization now: " + colorization);
    gnode.selectAll(".node")
        .style("fill", function (d) { return color(colorization(d)); });

    gnodeEnter.append("text")
        .text(function (d) { return d.firstName + " " + d.lastName; })
        .attr("transform", "translate(7, 0)")
        .style("pointer-events", "none")
        .style("cursor", "default")
        .style("display", showText ? "block" : "none")
		.style("font-size", 8)
    ;
    glink.exit().remove();


    force.on("tick", function () {
        glink.attr("x1", function (d) {
            return d.source.x;
        })
            .attr("y1", function (d) {
            return d.source.y;
        })
            .attr("x2", function (d) {
            return d.target.x;
        })
            .attr("y2", function (d) {
            return d.target.y;
        });

        gnode.select("circle").attr("cx", function(d) {return d.x;});
        gnode.select("circle").attr("cy", function(d) {return d.y;});
        gnode.select("text").attr("transform", function (d) {
            return "translate(" + (d.x + 6) + "," + (d.y + 4) + ")";
        });
    });

     //add curvy lines?
    /*function tick() {
        glink.attr("d", function (d) {
            var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y,
                dr = Math.sqrt(dx * dx + dy * dy);
            return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
        });

        gnode.attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        });
    }   */
}