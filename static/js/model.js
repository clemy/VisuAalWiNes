let selected_model;
let model_data;

function model_init() {
    $("#model_selection form").prop("onclick", null).off("submit");
    $("#model_selection form").submit(function (e) {
        e.preventDefault();
        selected_model = $("#model").val();
        $("#model_selection .subheader").text(selected_model);
        $("#query_entry .subheader").text('');
        $("#queryresult").text('');
        $("#wait").show(200);
        socket.emit('getModelData', selected_model);
        $("#model_selection").children(".expand-icon").click();
        if ($("#query_entry").children(".expand-icon").text() == '+') {
            $("#query_entry").children(".expand-icon").click();
        }
    });

    $("#query_entry form").prop("onclick", null).off("submit");
    $("#query_entry form").submit(function (e) {
        e.preventDefault();
        var query = $("#query").val();
        $("#query_entry .subheader").text(query);
        $("#queryresult").text('');
        $("#wait").show(200);
        var options = {
            engine: $("#engine").val()
        };
        socket.emit('doQuery', selected_model, query + " DUAL", options);
        //$("#query_entry").children(".expand-icon").click();
    });
}

function load_model(data) {
    if (selected_model !== data.name) {
        return;
    }
    model_fillGps(data.data);
    model_data = data.data;
    show_queryExamples(model_data.queries);
    show_simulation(model_data);
    $("#wait").hide(200);
}

function model_fillGps(data) {
    data.minLat = 57.013219;
    data.minLng = 9.991016;
    data.maxLat = 57.017997;
    data.maxLng = 10.001937;
    // How many routers do not have a location assigned
    const routerCount = Object.keys(data.routers)
        .filter(routerName => data.routers[routerName].lat == null || data.routers[routerName].lng == null)
        .length;
    console.log("From " + Object.keys(data.routers).length + " routers " + routerCount + " do not have a valid location assigned");
    const squareSideCount = Math.floor(Math.sqrt(routerCount));
    const dlat = (data.maxLat - data.minLat) / squareSideCount;
    const dlon = (data.maxLng - data.minLng) / squareSideCount;
    // Assign coordinates to routers without location
    Object.keys(data.routers)
        .filter(routerName => data.routers[routerName].lat == null || data.routers[routerName].lng == null)
        .forEach((routerName, i) => {
            data.routers[routerName].lat = data.minLat + Math.floor(i / squareSideCount) * dlat;
            data.routers[routerName].lng = data.minLng + Math.floor(i % squareSideCount) * dlon;
        }
    );
    // Check for duplicate locations and move them away
    const usedLocations = new Map();
    Object.keys(data.routers)
        .forEach((routerName) => {
            usedLats = usedLocations.get(data.routers[routerName].lng);
            if (usedLats == null) {
                const usedLats = new Set();
                usedLats.add(data.routers[routerName].lat);
                usedLocations.set(data.routers[routerName].lng, usedLats);
            } else {
                while (usedLats.has(data.routers[routerName].lat)) {
                    // move away
                    data.routers[routerName].lat += 0.01; //~1km
                    console.log("moved router " + routerName + " due to using same coordinates as another router");
                }
                usedLats.add(data.routers[routerName].lat);
            }
        }
    );
    // Get real coordinate range for view
    Object.keys(data.routers)
        .forEach((routerName) => {
            data.minLat = Math.min(data.routers[routerName].lat, data.minLat);
            data.maxLat = Math.max(data.routers[routerName].lat, data.maxLat);
            data.minLng = Math.min(data.routers[routerName].lng, data.minLng);
            data.maxLng = Math.max(data.routers[routerName].lng, data.maxLng);
        }
    );
}

function add_models(models) {
    let data = "";
    for (let i in models) {
        let first = (data.length === 0);
        data += "<option value='" + models[i] + "' ";
        if (first)
            data += "selected=selected "
        data += ">" + models[i] + "</option>";
    }
    $("#model").html(data);
}

function show_queryExamples(data) {
    $("#query-examples").empty();
    if (data) {
        $("#query-examples").append($("<div>Examples:</div>"));
        for (const query of data) {
            $("#query-examples").append($("<div class='query-example'></div>").click(() => {
                $("#query").val(query.query);
                //$("#query_entry form").submit();
            }).text(query.query).attr("title", query.description));
        }
    }
}

function show_queryResult(data) {
    console.log(data);
    $("#wait").hide(200);
    if ($("#query_result").children(".expand-icon").text() == '+') {
        $("#query_result").children(".expand-icon").click();
    }
    // deep copy
    current_data = JSON.parse(JSON.stringify(model_data));
    if (data.error === undefined) {
        var result = '<div>Found Trace: ' + (data.data.answers.Q1.result ? 'Yes' : 'No') + '</div>';
        var prevRouter;
        if (data.data.answers.Q1.trace !== undefined && data.data.answers.Q1.trace.length > 0) {
            result += '<table><tr><th>Router</th><th>Stack / Rule</th></tr>';
            var step = 0; // step 0 is no active edge
            data.data.answers.Q1.trace.forEach(entry => {
                if (entry.router === undefined) {
                    result += '<tr onclick="set_current_step(' + step + ')"><td> </td><td>' + entry.ingoing + '->' + entry.rule.via + ' (' + entry.rule.weight + ')</td></tr>';
                    return;
                }
                result += '<tr onclick="set_current_step(' + step + ')"><td>' + entry.router + '</td><td>' + entry.stack + '</td></tr>';
                if (current_data.routers[entry.router] === undefined) {
                    // skip unknown routers (especially the last NULL router)
                    return;
                }
                if (current_data.routers[entry.router].mode === undefined) {
                    current_data.routers[entry.router].mode = step;
                }
                if (prevRouter !== undefined) {
                    if (current_data.routers[prevRouter].usedTargets === undefined) {
                        current_data.routers[prevRouter].usedTargets = [];
                        current_data.routers[prevRouter].traceInfo = [];
                    }
                    current_data.routers[prevRouter].usedTargets.push(entry.router);
                    current_data.routers[prevRouter].traceInfo.push({ target: entry.router, step });
                }
                prevRouter = entry.router;
                step++;
            });
            result += '</table>';
        }
        $("#queryresult").html(result);
        show_simulation(current_data);
    } else {
        $("#queryresult").text(data.query + ': ' + data.error);
    }
}
