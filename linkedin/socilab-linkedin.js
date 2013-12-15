//d3js option
var enableConnectionsToSelf = false;
var currentData;

//utilities for d3js visualization options
var byName = function (d) {
    return d.firstName + " " + d.lastName;
};
var byIndustry = function (d) {
    return d.industry;
};
var byLocation = function (d) {
    return d.location;
};
var colorization = byIndustry;

//test data can be uploaded for debugging
var testMode = false;
if (window.location.search.indexOf("test") >= 0) {
    testMode = true;
}

Object.size = function (obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

//linkedin authorization for api access
function onLinkedInLoad() {
    if (testMode) {
        setConnections(sampleData.connections);
        dataReady(sampleData);
    } else {
        IN.Event.on(IN, "auth", function () {
            onLinkedInLogin();
        });
        IN.Event.on(IN, "logout", function () {
            onLinkedInLogout();
        });
    }
}

function onLinkedInLogout() {
    setConnections({}, {total: 0});
}

function onLinkedInLogin() {
    //Get my info and also set the meta tags
    try{
        loader.show();
    }catch(c){}
    IN.API.Profile("me").result(function (result) {
        if(result.values.length){
            $("meta[name='user-name']").attr("content", result.values[0].firstName + " " +result.values[0].lastName);
            $("meta[name='user-id']").attr("content", result.values[0].id);
        }
        // pass the fields as individual string parameters
        IN.API.Connections("me")
            .fields("id", "firstName", "lastName", "pictureUrl", "publicProfileUrl", "industry")
            .result(function (result, metadata) {
                setConnections(result.values, metadata);
            });
    });
}

//process data and produce csv file of adjacency matrix for user download
function dataReady(resultData) {
    console.log(JSON.stringify(resultData));
   var myData='"",'+ '"me",';
    console.log(resultData.connections.length);
    for (var i=0; i<resultData.connections.length; i++) {
        var n1= '"'+resultData.connections[i].firstName + " " + resultData.connections[i].lastName + '"' + ",";
        myData=myData+n1;
    }
    myData = myData.substring(0, myData.length - 1);
    myData = myData + "\n" + '"'+ "me" + '"' + JSON.stringify(resultData.matrix[0]);
    console.log(resultData.matrix.length);
    console.log(resultData.connections[2].firstName + JSON.stringify(resultData.matrix[2]));
    for (var i=0; i<resultData.connections.length; i++) {
        var n1= '"'+resultData.connections[i].firstName + " " + resultData.connections[i].lastName + '"' + JSON.stringify(resultData.matrix[i+1]);
        myData=myData+n1;
    }
    myData = myData.replace(/\[/g,',');
    myData = myData.replace(/\]/g,'\n');
    console.log(myData);
    var contentType = 'text/csv';
    var csvFile = new Blob([myData], {type: contentType});
    var a = document.createElement('a');
    a.download = 'my-socilab-li-adj-matrix.csv';
    a.href = window.URL.createObjectURL(csvFile);
    a.textContent = 'Download my Network Data (as CSV adjacency matrix)';
    a.dataset.downloadurl = [contentType, a.download, a.href].join(':');
    document.getElementById('download').appendChild(a);
    currentData = resultData;
    processMatrix(resultData.matrix);
    visualizeConnections(resultData, enableConnectionsToSelf, colorization);
}


//interface with linkedin api to pull mutual connections data of contacts for ego network
function setConnections(connections) {
    var publicConnections = connections.filter(function (d) {
        return d.id != "private";
    });

    if (testMode) {
        return;
    }

    var connectionLimit = 499; //this is the max, as per linkedin api - after this many calls that user gets throttled/capped for the day until midnight UTC time
    var publicConnections = connections.filter(function (d) {
        return d.id != "private";
    });

    var connectsLength = Math.min(publicConnections.length, connectionLimit);
    $("#message").text((connectsLength < publicConnections.length) ? "Due to LinkedIn API limitations - we can only use " + connectionLimit + " of your contacts" : "");

    var mutualconnects = new Array(connectsLength);
    var connectionIdIndexMap = {};
    publicConnections.forEach(function (connection, connectionIndex) {
        connectionIdIndexMap[connection.id] = connectionIndex;
    });
    var getConnectionIndexById = function (d) {
        return connectionIdIndexMap[d.id];
    };

    var resultsLeftToArrive = connectsLength;
    var errorCount = 0;
    var callsMade = 0;

    publicConnections.forEach(function (connection, connectionIndex) {
        if (resultsLeftToArrive <= 0) {
            return;
        }


        var resultHandler = function () {
            console.log("All results arrived");
            if (errorCount > 0) {
                console.warn("Querying contacts has produced " + errorCount + " error" + (errorCount == 1 ? "" : "s"));
            }

            var sociomat = mutualConnectsToMatrix(mutualconnects);
            var reducedSociomat = mutualConnectsToReducedMatrix(mutualconnects);
            var resultData = { connections: connections, publicConnections: publicConnections, matrix: sociomat, reducedMatrix: reducedSociomat };
            console.log("SOCIOMAT", sociomat);
            dataReady(resultData);
        }

        callsMade++;
        console.log("Making call #" + callsMade);

        IN.API.Raw("/people/" + connection.id + "/relation-to-viewer/related-connections?count=99") //99 is the maximum number of mutual connections requests per contact
            .result(function (result) {
                mutualconnects[connectionIndex] = (result.values ? result.values.map(getConnectionIndexById).
                    filter(function (d) {
                        return d != null && d <= connectsLength;
                    }) : []) || [];
                resultsLeftToArrive--;
                if (resultsLeftToArrive == 0) {  // if all arrived
                    resultHandler();
                }
            })
            .error(function (error) {
                errorCount++;
                mutualconnects[connectionIndex] = [];
                resultsLeftToArrive--;
                if (resultsLeftToArrive == 0) {  // if all arrived
                    resultHandler();
                }
            });
    });
}

//converts mutual connections array to adjacency matrix
function mutualConnectsToMatrix(mutualconnects) {
    var len = mutualconnects.length;
    var result = [];

    for (var i = 0; i < len + 1; i++) {
        result.push(new Array(len + 1));
        result[i][i] = 0;
        for (var j = 0; j < i; j++) {
            var value = (i == 0 || j == 0 || (mutualconnects[i - 1] && mutualconnects[i - 1].indexOf(j - 1) >= 0)) ? 1 : 0;
            result[i][j] = result[j][i] = value;
        }
    }

    return result;
}

//reduces network by removing ego node - used in the 'disable links to self' d3js option to 
//make internal structure of contacts more visible.
function mutualConnectsToReducedMatrix(mutualconnects) {
    var len = mutualconnects.length;
    var result = [];

    for (var i = 0; i < len; i++) {
        result.push(new Array(len));
        result[i][i] = 0;
        for (var j = 0; j < i; j++) {
            var value = 0;
            if (mutualconnects[i] && mutualconnects[i].indexOf(j) >= 0) {
                value = 1;
            }
            result[i][j] = result[j][i] = value;
        }
    }

    return result;
}


$(function () {
    $("input[name=radio1]").click(function () {
        colorization = (this.value == "industry") ? byIndustry : byName;
        visualizeConnections(currentData, enableConnectionsToSelf, colorization);
    });

    $("input[name=radio2]").click(function () {
        enableConnectionsToSelf = (this.value == "self");
        visualizeConnections(currentData, enableConnectionsToSelf, colorization);
    });
});