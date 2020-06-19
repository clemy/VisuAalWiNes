let selected_model;
let model_data;
let result_data = null;
let view_interface_names = false;

function model_init() {
    $("#model_selection form").prop("onclick", null).off("submit");
    $("#model_selection form").submit(function (e) {
        e.preventDefault();
        selected_model = $("#model").val();
        $("#model_selection .subheader").text(selected_model);
        $("#query_entry .subheader").text('');
        $("#preCondition").val('.');
        $("#path").val('.*');
        $("#postCondition").val('.');
        $("#linkFailures").val('0');
        $("#result_query_string").text('');
        result_data = null;
        $("#queryresult").text('');
        $("#query_result .subheader").text('');
        show_finalQuery();
        $("#wait").show(200);
        socket.emit('getModelData', selected_model);
        $("#model_selection").children(".expand-icon").click();
        if ($("#query_entry").children(".expand-icon").text() == '+') {
            $("#query_entry").children(".expand-icon").click();
        }
    });

    $("#preCondition,#path,#postCondition,#linkFailures").on('input', show_finalQuery);

    $("#path").focus(function (e) {
        $("#router_list").show(200, set_sidebar_right_visibility);
        set_sidebar_right_visibility();
    });
    $("#path").blur(function (e) {
        $("#router_list").hide(200, set_sidebar_right_visibility);
    });
    $("#router_list").on('mousedown', function (e) {
        e.preventDefault();
    });

    $("#query_entry,#weight_entry form").prop("onclick", null).off("submit");
    $("#query_entry,#weight_entry form").submit(function (e) {
        e.preventDefault();
        if ($("#run-validation").is(":visible")) {
            $("#run-validation").click();
        }
    });
    $("#run-validation").click(function (e) {
        e.preventDefault();
        var query = $("#final_query").text();
        $("#query_entry .subheader").text(query);
        query += ' ' + $("#sim-mode").val();
        $("#result_query_string").text('');
        result_data = null;
        $("#queryresult").text('');
        $("#query_result .subheader").text('');
        $("#wait").show(200);
        $("#cancel-validation").show();
        $("#run-validation").hide();
        var options = {};
        var weight = getWeightList();
        if (weight) {
            // Weight is only implemented for engine 2: "Post*"
            $("#engine").val(2);
            options = { ...options, weight };
        }
        options = { ...options, engine: $("#engine").val(), reduction: $("#reduction").val() };
        socket.emit('doQuery', selected_model, query, options);
        //$("#query_entry").children(".expand-icon").click();
    });
    $("#run-validation").prop('disabled', true);

    $("#cancel-validation").click(function (e) {
        e.preventDefault();
        socket.emit('cancelQuery');
    });

    $("#view-interface-names").click(function () {
        view_interface_names = $("#view-interface-names").prop('checked');
        if (result_data !== null) {
            show_queryResult(result_data);
        }
    });

    $("#view-raw-result").click(function () {
        const view_raw_result = $("#view-raw-result").prop('checked');
        if (view_raw_result) {
            $("#raw_result").show(200, set_sidebar_right_visibility);
            set_sidebar_right_visibility();
        } else {
            $("#raw_result").hide(200, set_sidebar_right_visibility);
        }
    });

    $("#add-interface-to-path").prop('disabled', true);
}

function load_model(data) {
    if (selected_model !== data.name) {
        return;
    }
    $("#run-validation").prop('disabled', false);
    model_fillGps(data.data);
    model_data = data.data;
    show_queryExamples(model_data.queries);
    show_routerList(model_data);
    show_simulation(model_data, true);
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

function show_routerList(data) {
    $("#router_list_routers").empty();
    $("#router_list_routers").append(
        $("<li class='router_list_router' id='router_list_router_ANYROUTER' onclick='set_router_list_anyrouter()'>Any Router [.]</li>"));
    $("#router_list_routers").append(Object.keys(data.routers).sort().map((routerName) =>
        $("<li class='router_list_router' id='router_list_router_" + routerName + "' onclick='set_router_list_router(\"" + routerName + "\")'>" + routerName + "</li>")));
    $("#router_list_interfaces").empty();
    $("#add-interface-to-path").prop('disabled', true);
    set_router_list_anyrouter();
}

function set_router_list_anyrouter() {
    $('.router_list_router').removeClass('selected');
    $('#router_list_router_ANYROUTER').addClass('selected');
    $("#router_list_interfaces").empty();
    $("#add-interface-to-path").prop('disabled', false).val('Append selected router to route restriction').off('click').click(e => {
        $("#path").val($("#path").val() + '.');
        $("#path").focus();
        $("#path")[0].scrollLeft = $("#path")[0].scrollWidth;
        show_finalQuery();
    });
}

function quote_if_necessary(name) {
    if (name.match(/[^a-zA-Z0-9\_\-]/) === null) {
        return name;
    }
    return "'" + name.replace(/('|\\)/g, "\\$1") + "'";
}

function set_router_list_router(routerName) {
    $('.router_list_router').removeClass('selected');
    $('#router_list_router_' + routerName.replace(/(:|\.|\[|\]|,|=|@|\/)/g, "\\$1")).addClass('selected');
    $("#router_list_interfaces").empty();
    $("#router_list_interfaces").append(model_data.routers[routerName].interfaces.sort().map((ifName) =>
        $("<li class='router_list_interface' id='router_list_interface_" + ifName + "' onclick='set_router_list_interface(\"" + routerName + "\", \"" + ifName + "\")'>" + ifName + "</li>")));
    $("#add-interface-to-path").prop('disabled', false).val('Append selected router to route restriction').off('click').click(e => {
        $("#path").val($("#path").val() + quote_if_necessary(routerName));
        $("#path").focus();
        $("#path")[0].scrollLeft = $("#path")[0].scrollWidth;
        show_finalQuery();
    });
}

function set_router_list_interface(routerName, ifName) {
    $('.router_list_interface').removeClass('selected');
    $('#router_list_interface_' + ifName.replace(/(:|\.|\[|\]|,|=|@|\/)/g, "\\$1")).addClass('selected');
    $("#add-interface-to-path").prop('disabled', false).val('Append selected interface to route restriction').off('click').click(e => {
        var finalName = quote_if_necessary(routerName) + "." + quote_if_necessary(ifName);
        $("#path").val($("#path").val() + finalName);
        $("#path").focus();
        $("#path")[0].scrollLeft = $("#path")[0].scrollWidth;
        show_finalQuery();
    });
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
                var query_parts = query.query.match("^<([^>]*)>\\s*([^<]*?)\\s*<([^>]*)>\\s*(\\d+)$");
                if (query_parts) {
                    $("#preCondition").val(query_parts[1]);
                    $("#path").val(query_parts[2]);
                    $("#postCondition").val(query_parts[3]);
                    $("#linkFailures").val(query_parts[4]);
                }
                show_finalQuery();
                //$("#query_entry form").submit();
            }).text(query.query).attr("title", query.description));
        }
    }
}

function show_finalQuery() {
    var final_query = '<' + $('#preCondition').val() + '> ' +
        $('#path').val() +
        ' <' + $('#postCondition').val() + '> ' +
        $('#linkFailures').val();
    $('#final_query').text(final_query);

    adapt_TextArea_Height(document.getElementById("preCondition"));
    adapt_TextArea_Height(document.getElementById("path"));
    adapt_TextArea_Height(document.getElementById("postCondition"));
}

function adapt_TextArea_Height(el) {
    const origHeight = el.style.height;
    el.style.height = "1px";
    const newHeight = 2 + el.scrollHeight;
    if (newHeight <= 2) {
        el.style.height = origHeight;
    } else {
        el.style.height = newHeight + "px";
    }
}

function show_queryResult(data) {
    console.log(data);
    result_data = data;
    $("#cancel-validation").hide();
    $("#run-validation").show();
    $("#wait").hide(200);
    if ($("#query_result").children(".expand-icon").text() == '+') {
        $("#query_result").children(".expand-icon").click();
    }
    $("#result_query_string").text("Query: " + data.query.replace(/ DUAL$/, ""));
    $("#queryresult").empty();
    // deep copy
    current_data = JSON.parse(JSON.stringify(model_data));
    if (data.error === undefined) {
        var result = '';
        if (data.data.answers.Q1.result === undefined || data.data.answers.Q1.result === null) {
            $("#query_result .subheader").html('<span class="inconclusive">Inconclusive</span>');
        } else if (data.data.answers.Q1.result === false) {
            $("#query_result .subheader").html('<span class="not-satisfied">Not Satisfied</span>');
        } else {
            $("#query_result .subheader").html('<span class="satisfied">Satisfied</span>');
        }
        if (data.data.answers.Q1.trace !== undefined && data.data.answers.Q1.trace.length > 0) {
            var step = 0; // step 0 is no active edge
            result += '<table>';
            data.data.answers.Q1.trace.forEach(entry => {
                if (entry.to_router === undefined) {
                    if (entry.rule.ops) {
                        entry.rule.ops.forEach(op => {
                            result += '<tr onclick="set_current_step(' + (step - 1) + ')"><td class="rule">&nbsp;&nbsp;&nbsp;' +
                            (typeof op === 'string' ? op + '()' : Object.keys(op).map(key => key + '(' + op[key] + ')').join('; '))
                            ')</td></tr>';
                        });
                    }
                    return;
                }
                result += '<tr class="result_step" id="result_step_' + step + '" onclick="set_current_step(' + step + ')"><td>&lt;' +
                    entry.stack + '&gt; : [' +
                    (entry.from_router == 'NULL' ? '&#x1f30d;' : entry.from_router) + (view_interface_names ? ('.' + entry.from_interface) : '') + '#' +
                    (entry.to_router == 'NULL' ? '&#x1f30d;' : entry.to_router) + (view_interface_names ? ('.' + entry.to_interface) : '') +
                    ']</td></tr>';
                if (current_data.routers[entry.to_router] === undefined) {
                    // skip unknown routers (especially the last NULL router)
                    return;
                }
                if (current_data.routers[entry.to_router].mode === undefined) {
                    current_data.routers[entry.to_router].mode = step;
                }
                if (current_data.routers[entry.from_router] !== undefined) {
                    if (current_data.routers[entry.from_router].usedTargets === undefined) {
                        current_data.routers[entry.from_router].usedTargets = [];
                        current_data.routers[entry.from_router].traceInfo = [];
                    }
                    current_data.routers[entry.from_router].usedTargets.push(entry.to_router);
                    current_data.routers[entry.from_router].traceInfo.push({ target: entry.to_router, step });
                }
                step++;
            });
            result += '</table>';
        }
        $("#queryresult").html(result);
        $("#rawresult").text(data.data.raw.replace(/\r/gm, '\r\n'));
        show_simulation(current_data, false);
    } else {
        const errorpos = data.error.match("\\[1\\.([0-9]+)(-[0-9]+)?\\]");
        if (errorpos) {
            $("#queryresult").append($("<span class='error-begin'></span>").text(data.query.substring(0, errorpos[1] - 1)));
            $("#queryresult").append($("<span class='error-end'></span>").text(data.query.substring(errorpos[1] - 1, data.query.length - 5)));
        }
        $("#queryresult").append($("<p class='error-text'></p>").text(data.error));
        $("#rawresult").text(data.error);
    }
}
