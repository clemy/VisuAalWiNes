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
        socket.emit('doQuery', selected_model, query, options);
        $("#query_entry").children(".expand-icon").click();
    });
}

function load_model(data) {
    if (selected_model !== data.name) {
        return;
    }
    model_fillGps(data.data);
    model_data = data.data;
    show_simulation(model_data);
    $("#wait").hide(200);
}

function model_fillGps(data) {
    data.minLat = 57.013219;
    data.minLng = 9.991016;
    data.maxLat = 57.017997;
    data.maxLng = 10.001937;
    const routerCount = Object.keys(data.routers).length;
    const squareSideCount = Math.floor(Math.sqrt(routerCount));
    const dlat = (data.maxLat - data.minLat) / squareSideCount;
    const dlon = (data.maxLng - data.minLng) / squareSideCount;
    Object.keys(data.routers).forEach((routerName, i) => {
        data.routers[routerName].lat = data.minLat + Math.floor(i / squareSideCount) * dlat;
        data.routers[routerName].lng = data.minLng + Math.floor(i % squareSideCount) * dlon;
    });
    data.maxLat = data.minLat + Math.floor((routerCount - 1) / squareSideCount) * dlat;
    data.maxLng = data.minLng + Math.floor((routerCount - 1) % squareSideCount) * dlon;
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
                result += '<tr onclick="set_current_step(' + step + ')"><td>' + entry.router + '</td><td>' + entry.stack + '</td></tr>';
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
