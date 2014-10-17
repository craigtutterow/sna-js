var num = [
    /* data is parsed from LinkedIn's API to take in a 2d array like this:
    
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
     [1, 0, 1, 1, 0, 0, 0, 0, 0, 1],
     [1, 1, 0, 1, 0, 0, 1, 0, 0, 0],
     [1, 1, 1, 0, 1, 1, 0, 0, 0, 0],
     [1, 0, 0, 1, 0, 1, 1, 0, 0, 0],
     [1, 0, 0, 1, 1, 0, 1, 1, 0, 0],
     [1, 0, 1, 0, 1, 1, 0, 1, 1, 0],
     [1, 0, 0, 0, 0, 1, 1, 0, 1, 1],
     [1, 0, 0, 0, 0, 0, 1, 1, 0, 1],
     [1, 1, 0, 0, 0, 0, 0, 1, 1, 0]  

    rows and columns representing an ordered list of one's contacts, producing
    an adjacency matrix. A 1 at the intersection of 2 contacts representing a 
    mutual connection between x and y. Note that the matrix is symmetric by definition 
    and that the diagonal is set to 0, as no ego can be connected to themselves)
    */
];

/*transpose function for matrix operations*/
Array.prototype.transpose = function () {
    var a = this,
        w = a.length ? a.length : 0,
        h = a[0] instanceof Array ? a[0].length : 0;
    if (h === 0 || w === 0) {
        return [];
    }
    var i, j, t = [];
    for (i = 0; i < h; i++) {
        t[i] = [];
        for (j = 0; j < w; j++) {
            t[i][j] = a[j][i];
        }
    }
    return t;
};

var totedges = 0;

/*row sum operation for matrix operations*/
function rowsums(mm) {
    var mmlen = mm.length;
    sumOfRows = new Array(mmlen);
    var sumR = 0;
    for (var row = 0; row < mmlen; row++) {
        for (var col = 0; col < mmlen; col++) {
            sumR += mm[row][col];
            totedges = totedges + (mm[row][col] / 2);
        }
        sumOfRows[row] = sumR;
        sumR = 0;
    }
    totedges = totedges - (2 * (mmlen - 1));
    return sumOfRows;
}

/*calculate the proportional strength of network edges (input for structural holes calculation)*/
function ptiestrength(Z) {
    Ztrans = Z.transpose();
    zlen = Z.length;
    znum = new Array(zlen);
    for (var l = 0; l < zlen; l++) {
        znum[l] = new Array(zlen);
    }
    for (var x = 0; x < zlen; x++) {
        for (var y = 0; y < zlen; y++) {
            znum[x][y] = Z[x][y] + Ztrans[x][y];
        }
    }
    dtemp = rowsums(znum);
    P = new Array(zlen);
    for (var k = 0; k < zlen; k++) {
        P[k] = new Array(zlen);
    }
    for (var i = 0; i < zlen; i++) {
        for (var j = 0; j < zlen; j++) {
            if (dtemp[i] > 0) {
                P[i][j] = znum[i][j] / dtemp[i];
            }
            if (dtemp[i] <= 0) {
                P[i][j] = 0;
            }
        }
    }
    return P;
}

/*calculate the structural holes index and its components*/
function structuralholes(Z) {
    aa = Z;
    var aalen = aa.length;
    var i = 0;
    P = ptiestrength(Z);
    var constraint = 0;
    var esize = 0;
    var csize = 0;
    var density = 0;
    var pubdensity = 0;
    var hierarchy = 0;
    var maxedges = (aalen - 1) * (aalen - 2) * 2;
    for (var j = 1; j < aalen; j++) {
        Pij = P[i][j];
        csize = csize + Math.pow(Pij, 2)
        var innersum = 0;
        for (var q = 1; q < aalen; q++) {
            if (q != j & q != i) {
                innersum = innersum + (P[i][q] * P[q][j])
            }
        }
        density = density + (2 * Pij * innersum)
        hierarchy = hierarchy + Math.pow(innersum, 2);
        esize = (aalen - 1) - ((totedges * 2) / (aalen - 1));
        asize = aalen - 1;
    }
    var betweenness=((aalen-1)*(aalen-2))/2;
    for(var i=1; i<aalen; i++)
    {
        var contacts=[];
        for (var j=i; j<aalen; j++) //start at i+1?
        {
            if(Z[i][j]==1)
            {
                betweenness=betweenness-1;
                contacts.push(j-1) //just j?
            }
        }
        for (var j=i+1; j<aalen; j++) //start at 1?
        {
            if(Z[i][j]==0)
            {
                var shared=0;
                for(k=0; k<contacts.length; k++)
                {
                    if (Z[j][contacts[k]]==1)
                    {
                        shared=shared+1;
                    }
                }
                if (shared>0)
                {
                    betweenness=betweenness-(shared/(shared+1));
                }
            }
        }
    }
    csize = csize * 100;
    density = density * 100;
    pubdensity=totedges/((aalen-1)*(aalen-2))/2*100;
    hierarchy = hierarchy * 100;
    constraint = csize + density + hierarchy;
    var asize = aalen - 1;
    var Csdhe = { constraint: constraint, csize: csize, density:density, hierarchy: hierarchy, esize: esize, asize: asize, pubdensity: pubdensity, betweenness: betweenness};
    return Csdhe;
}

/*processes user's sociomatrix and presents results*/
function processMatrix(matrix) {
    num = matrix;
    var ntr = num.transpose();
    var rsum = rowsums(num);
    var z = ptiestrength(num);
    var holes = structuralholes(num);
    document.getElementById('Instructions').innerHTML = 
        ""
    ;
    document.getElementById('asize_output').innerHTML = 
        "<b><font size=6.5px>" + holes.asize.toString() + "</b></font>" +
        "; This is the total number of contacts you have. It is not as informative as your unique (or 'effective') ties. The quality of your network isn't just about the total number of people you know, but the information, opportunities, and social support they provide. These factors are correlated with the structure of the ties between your contacts, not just their raw number.<br>" 
            + "<br>"
    ;
    document.getElementById('esize_output').innerHTML = 
        "<b><font size=6.5px>" + holes.esize.toFixed(1) + "</b></font>" +
        "; This is the 'effective size' of your network. Not every contact counts the same or adds the same value to your network. Some ties are 'redundant' because you both know all of the same people. They are not necessarily giving you unique information. This measure controls for that fact and gives an estimate of the unique number of clusters you are connected to.<br>"
            + "<br>"
    ;
    document.getElementById('constraint_output').innerHTML = 
        "<b><font size=6.5px>" + holes.constraint.toFixed(2) + "</b></font>" +
        "/100; This is an index measure that describes the extent to which your network spans different groups (i.e. bridging structural holes) or is concentrated in one or two areas. As the number approaches 100, you are in a closed, or focused network. As it approaches 0, your network is more open/dispersed, indicating that you have more vision across social groups.  Disconnected contacts may expose you to new information, but closure is required to develop a reputation or generate trust, among other things.<br>"
            + "<br>"
    ;
    document.getElementById('density_output').innerHTML = 
        "<b><font size=6.5px>" + holes.pubdensity.toFixed(2) + "</b></font>" +
        "/100; This is a percentage that represents the number of ties between your contacts divided by the total number of possible ties (i.e. how 'dense' or closed your network is). As the number approaches 100, it means that all of your contacts know each other. As it approaches 0, it means all of your contacts are disconnected from each other. Having a closed network can be good or bad depending on the task and social environment.<br>"
            + "<br>"
    ;
     document.getElementById('hierarchy_output').innerHTML = 
        "<b><font size=6.5px>" + holes.hierarchy.toFixed(2) + "</b></font>" +
        "/100; This number is a concentration index that represents how dependent you are on a few focal contacts. If all of your contacts know you through your boss or parent, then you have a 'hierarchical' network, and are dependent on them. This can work well in situations where you are considered an 'outsider' and need a strategic partner to get in the door, but is generally considered a handicap.<br>"
            + "<br>"
    ;
     document.getElementById('betweenness_output').innerHTML = 
        "<b><font size=6.5px>" + holes.betweenness.toFixed(1) + "</b></font>" +
        "; This number represents the number of structural holes, or bridging opportunities, to which you have exclusive access. You have exclusive access to a structural hole if you lie on the shortest path between two contacts in your network. If others in your network lie on an equidistant path between the two contacts, then you each own a proportional amount. This number is typically quite large, and is presented in raw form in order to emphasize the opportunities you have to move information between people in your network who don't know each other.<br>"
            + "<br>"
    ;
    console.log("JSON: " + JSON.stringify(holes));
    new socilabAnalysisReport(holes).save().getPercentile(function (data) {
        $("#percentiles").show();
        $("#p_constraint span").text(data.constraint.toFixed(2) + "%");
        $("#p_hierarchy span").text(data.hierarchy.toFixed(2)  + "%");
        $("#p_asize span").text(data.asize.toFixed(2)  + "%");
        $("#p_esize span").text(data.esize.toFixed(2)  + "%");
        $("#p_density span").text(data.density.toFixed(2)  + "%");
        $("#p_csize span").text(data.csize.toFixed(2)  + "%");
        $("#p_betweenness span").text(data.betweenness.toFixed(2)  + "%");

        $("#p_constraint div.bar").css({width: data.constraint.toFixed(2)  + "%"});
        $("#p_hierarchy div.bar").css({width: data.hierarchy.toFixed(2)  + "%"});
        $("#p_asize div.bar").css({width: data.asize.toFixed(2)  + "%"});
        $("#p_esize div.bar").css({width: data.esize.toFixed(2)  + "%"});
        $("#p_density div.bar").css({width: data.density.toFixed(2)  + "%"});
        $("#p_csize div.bar").css({width: data.csize.toFixed(2)  + "%"});
        $("#p_betweenness div.bar").css({width: data.betweenness.toFixed(2)  + "%"});
    });
    try {
        loader.hide();
    } catch (c) {
    }
}

/*database functionality to post metrics and receive percentiles*/
var socilab = {
    config: {
        urls: {
            saveReport: "/service/analysis/report/save",
            getPercentile: "/service/analysis/report/percentile"
        }
    },
    constructors: {
        UserDataProvider: function () {
            var username = $("meta[name='user-name']").attr("content");
            var userID = $("meta[name='user-id']").attr("content");
            this.getID = function () {
                return userID;
            };
            this.getUsername = function () {
                return username;
            };
        },
        socilabDataTransport: function (url) {
            this.post = function (data, callback) {
                $.post(url, data, callback);
            };
        },
        socilabAnalysisReport: function (holes) {
            var _this = this;
            var userDataProvider = new socilab.constructors.UserDataProvider();
            var data = $.extend(holes, {
                user_id: userDataProvider.getID(),
                user_login: userDataProvider.getUsername()
            });
            this.save = function (callback) {
                new socilab.constructors.socilabDataTransport(socilab.config.urls.saveReport).post(data, function () {
                    try {
                        console.log("Data Saved!");
                        if (typeof(callback) != 'undefined') callback();
                    } catch (c) {
                    }
                });
                return _this;
            };
            this.getPercentile = function (callback) {
                new socilab.constructors.socilabDataTransport(socilab.config.urls.getPercentile).post(data, function (data) {
                    callback(data);
                });
                return _this;
            };
        }
    },
    init: new function () {
        $(function () {
            socilab.constructor();
        });
    },
    constructor: function () {
        window.socilabAnalysisReport = socilab.constructors.socilabAnalysisReport;
    }
};