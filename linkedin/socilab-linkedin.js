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
var byCountryCode = function (d) {
    return d.location.country.code;
};
var byLocation = function (d) {
	var result = "";
	if (d.location.country.code !== 'undefined') {
		result = d.location.name + ", " + d.location.country.code;
	} else {
		result = d.location.name;
	}
	return result;
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
    console.log(JSON.stringify(resultData.connections[2].firstName + " " + resultData.connections[2].lastName));
    var myData='"",'+ '"Me",';
    console.log(resultData.connections.length);
    var nverts=resultData.connections.length+1;
    var myPajData='*Vertices '+ nverts.toString() + "\n" + '1 "Me"' + "\n";
    for (var i=0; i<resultData.publicConnections.length; i++) {
        var n1= '"'+resultData.publicConnections[i].firstName + " " + resultData.publicConnections[i].lastName + '"';
        myData=myData+n1+",";
        var ip=i+2;
        myPajData=myPajData+ip.toString()+" "+n1+'\n';
    }
    myData = myData.substring(0, myData.length - 1);
    myData = myData + "\n" + '"'+ "Me" + '"' + JSON.stringify(resultData.matrix[0]);
    myPajData = myPajData + '*Edges' + "\n";
    console.log(resultData.matrix.length);
    console.log(resultData.publicConnections[2].firstName + JSON.stringify(resultData.matrix[2][3]));
    for (var i=0; i<resultData.publicConnections.length; i++) {
        var ip=i+1;
        var n1= '"'+resultData.publicConnections[i].firstName + " " + resultData.publicConnections[i].lastName + '"' + JSON.stringify(resultData.matrix[ip]);
        myData=myData+n1;
        for(var j=i; j<resultData.matrix.length; j++){
            if(resultData.matrix[i][j]==1){
                var jp=j+1;
                myPajData=myPajData+ip.toString()+" "+jp.toString() + "\n";
            }
        }
    }
    myData = myData.replace(/\[/g,',');
    myData = myData.replace(/\]/g,'\n');
    console.log(myData);
    console.log(myPajData);
    document.getElementById('download').innerHTML="Download my data: <br>";
    var csvContent = myData;
    var encodedUri = encodeURI(csvContent);
    var csvlink = document.createElement("a");
    csvlink.setAttribute("href", "data:text/csv;charset=utf-8,\uFEFF" + encodedUri);
    csvlink.setAttribute("download","li-data.csv");
    csvlink.textContent = '[CSV adjacency matrix]';
    document.getElementById('download').appendChild(csvlink);
    var pajData = myPajData;
    var encodedUri2 = encodeURI(pajData);
    var pajlink = document.createElement("a");
    pajlink.setAttribute("href", "data:text/net;charset=utf-8,\uFEFF" + encodedUri2);
    pajlink.setAttribute("download","li-data.net");
    pajlink.textContent = ' [Pajek .net edge list]';
    document.getElementById('download').appendChild(pajlink);

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

    var connectsLength = Math.min(publicConnections.length, connectionLimit);
    $("#message").text((connectsLength < publicConnections.length) ? "Due to LinkedIn API limitations - we can only use " + connectionLimit + " of your contacts" : "");

    var mutualconnects;
    var connectionIdIndexMap = {};
    publicConnections.forEach(function (connection, connectionIndex) {
        connectionIdIndexMap[connection.id] = connectionIndex;
    });
    var getConnectionIndexById = function (d) {
        return connectionIdIndexMap[d.id];
    };

    var errorCount = 0;
    var callsMade = 0;

    async.map(publicConnections.slice(0, connectsLength), function (connection, callback) {
        var arr = [];

        function fetch(offset, callback) {
            callsMade++;
            console.log("[Paginated] Making call #" + callsMade);
            IN.API.Raw(
                "/people/" + connection.id +
                "/relation-to-viewer/related-connections" +
                "?format=json" +
                "&start=" + offset +
                '&count=' + 99 
            )
                .result(function (result) {
                    arr.push.apply(arr, (result.values ? result.values.map(getConnectionIndexById).
                        filter(function (d) {
                            return d != null && d <= connectsLength;
                        }) : []) || []);
                    if (result.values && result.values.length) fetch(offset + result.values.length + 1, callback);
                    else callback(null, arr);
                })
                .error(function (error) {
                    console.log(error);
                    errorCount++;
                    callback(null, arr);
                });
        }

        fetch(0, callback);

    }, function (err, results) {
        mutualconnects = results;
        console.log("All results arrived");
        if (errorCount > 0) {
            console.warn("Querying contacts has produced " + errorCount + " error" + (errorCount == 1 ? "" : "s"));
        }

        var sociomat = mutualConnectsToMatrix(mutualconnects);
        var reducedSociomat = mutualConnectsToReducedMatrix(mutualconnects);
        var resultData = {
            connections: connections,
            publicConnections: publicConnections,
            matrix: sociomat,
            reducedMatrix: reducedSociomat
        };
        console.log("SOCIOMAT", sociomat);
        try {
            console.log('saving to local storage');
            localStorage.setItem(inId, JSON.stringify(resultData));
        } catch (c) {

        }
        dataReady(resultData);
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
		switch (this.value) {
			case "industry":
				colorization = byIndustry;
				break;
			case "name":
				colorization = byName;
				break;
			case "countryCode":
				colorization = byCountryCode;
				break;
			case "location": colorization = byLocation;
				break;
			default:
				colorization = byIndustry;
		}
        visualizeConnections(currentData, enableConnectionsToSelf, colorization);
    });

    $("input[name=radio2]").click(function () {
        enableConnectionsToSelf = (this.value == "self");
        visualizeConnections(currentData, enableConnectionsToSelf, colorization);
    });
});
