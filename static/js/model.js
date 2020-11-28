let selected_model;
let model_data = null;
let result_data = null;
let view_interface_names = false;
let labelTarget;

const DISABLE_UPLOAD = false;

function model_init() {
    $("#model_selection form").prop("onclick", null).off("submit");
    $("#model_selection form").submit(function (e) {
        e.preventDefault();
        selected_model = $("#model").val();
        $("#model_selection .subheader").text(selected_model);        
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
        $("#router_right,#add-label-to-header,#copy-label-to-clipboard").hide();
        $("#add-interface-to-path,#copy-interface-to-clipboard").show();
        $("#router_list").show(200, set_sidebar_right_visibility);
        set_sidebar_right_visibility();
    });
    $("#preCondition,#postCondition").focus(function (e) {
        labelTarget = $(e.target);
        $("#router_right,#add-label-to-header,#copy-label-to-clipboard").show();
        $("#add-interface-to-path,#copy-interface-to-clipboard").hide();
        $("#router_list").show(200, set_sidebar_right_visibility);
        set_sidebar_right_visibility();
    });
    $("#preCondition,#path,#postCondition").blur(function (e) {
        // check later if not any other field has focus before hiding the dialog
        setTimeout(() => {
            if (!$("#preCondition,#path,#postCondition").is(":focus")) {
                $("#router_list").hide(200, set_sidebar_right_visibility);
            }
        }, 0);
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
    $("#copy-interface-to-clipboard").prop('disabled', true);
    $("#add-label-to-header").prop('disabled', true);
    $("#copy-label-to-clipboard").prop('disabled', true);
    $("#save-query").prop('disabled', true);
    $("#upload").prop('disabled', true).click(function () {
        uploadFile(false);
    });
    $("#uploadall").prop('disabled', true);
    if (DISABLE_UPLOAD) {
        $("#uploadall").prop("title", "Disabled for this Server.");
    } else {
        $("#uploadall").click(function () {
            uploadFile(true);
        });
    }
    $("#download").prop('disabled', true);
    $("#downloadall").prop('disabled', true);
    $("#file-selector").change(function () {
        checkUploadButtonDisabledProp();
    });
}

function uploadFile(toServer) {
    const file = $("#file-selector")[0].files[0];
    if (file) {
        const reader = new FileReader();
        reader.addEventListener('load', (event) => {
            const content = JSON.parse(event.target.result);
            if (toServer) {
                $("#wait").show(200);
                socket.emit("uploadModel", content);
            } else {
                const queries = content.queries;
                const savedQueries = JSON.parse(localStorage.getItem("savedQueries2") ?? "{}");
                savedQueries[selected_model] = queries;
                localStorage.setItem("savedQueries2", JSON.stringify(savedQueries));
                show_savedQueries(selected_model);
            }
        });
        reader.readAsText(file);
        $("#file-selector").val(null);
        checkUploadButtonDisabledProp();
        $("#queryresult").empty();
    }
}

function checkUploadButtonDisabledProp() {
    const file = $("#file-selector")[0].files[0];
    if (file) {
        if (model_data) {
            $("#upload").prop('disabled', false);
        }
        if (!DISABLE_UPLOAD) {
            $("#uploadall").prop('disabled', false);
        }
    } else {
        $("#upload").prop('disabled', true);
        $("#uploadall").prop('disabled', true);
    }
}

function download(content, fileName, contentType) {
    var a = document.createElement("a");
    var file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

function load_model_afterUpload(data) {
    $("#wait").hide(200);
    if (data.error === undefined) {
        selected_model = data.name;
        $("#model_selection .subheader").text(selected_model);
        $("#preCondition").val('.');
        $("#path").val('.*');
        $("#postCondition").val('.');
        $("#linkFailures").val('0');
        $("#result_query_string").text('');
        result_data = null;
        $("#queryresult").text('');
        $("#query_result .subheader").text('');
        show_finalQuery();
        $("#model_selection").children(".expand-icon").click();
        if ($("#query_entry").children(".expand-icon").text() == '+') {
            $("#query_entry").children(".expand-icon").click();
        }        
        load_model(data);
    } else {
        if ($("#query_result").children(".expand-icon").text() == '+') {
            $("#query_result").children(".expand-icon").click();
        }
        $("#queryresult").empty();
        $("#queryresult").append($("<p></p>").text(data.error));
        $("#rawresult").text(data.error);
    }
}

function load_model(data) {
    if (selected_model !== data.name) {
        return;
    }
    $("#run-validation").prop('disabled', false);
    model_fillGps(data.data);
    model_data = data.data;
    checkUploadButtonDisabledProp();
    convert_queries(selected_model, model_data.queries);
    show_savedQueries(selected_model);
    show_routerList(model_data);
    show_simulation(model_data, true);
    $("#save-query").prop('disabled', false).off('click').click(function () {
        save_query(selected_model);
    });
    $("#download").prop('disabled', false).off('click').click(function () {
        const savedQueries = get_saved_queries(selected_model);
        const data = JSON.stringify({ name: selected_model, queries: savedQueries });
        download(data, selected_model + "-queries.json", "application/json");
    });
    $("#downloadall").prop('disabled', false).off('click').click(function () {
        const savedQueries = get_saved_queries(selected_model);
        const data = JSON.stringify({ name: selected_model, ...model_data.definition, queries: savedQueries });
        download(data, selected_model + ".json", "application/json");
    });
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

function convert_queries(modelName, queryExamples) {
    const savedQueries2 = JSON.parse(localStorage.getItem("savedQueries2") ?? "{}");
    const savedQueries2ForModel = savedQueries2[modelName];
    if (savedQueries2ForModel) {
        return;
    }

    const savedQueries1 = JSON.parse(localStorage.getItem("savedQueries") ?? "{}");
    const savedQueries1ForModel = savedQueries1[modelName];
    if (savedQueries1ForModel) {
        const newQueries = Object.entries(savedQueries1ForModel).map(([key, value]) => ({...value, description: key}));
        savedQueries2[modelName] = newQueries;
        localStorage.setItem("savedQueries2", JSON.stringify(savedQueries2));
        return;
    }

    if (queryExamples) {
        const newQueries = queryExamples.map(example => {
            if (example.query) {
                var query_parts = example.query.match("^<([^>]*)>\\s*([^<]*?)\\s*<([^>]*)>\\s*(\\d+)$");
            }
            return {
                description: example.description ?? "",

                preCondition: example.preCondition ?? query_parts?.[1] ?? "",
                path: example.path ?? query_parts?.[2] ?? "",
                postCondition: example.postCondition ?? query_parts?.[3] ?? "",
                linkFailures: example.linkFailures ?? query_parts?.[4] ?? "",

                engine: example.engine ?? "2",
                sim_mode: example.sim_mode ?? "DUAL",
                reduction: example.reduction ?? "3",
                weights: example.weight ?? null
            };
        });
        savedQueries2[modelName] = newQueries;
        localStorage.setItem("savedQueries2", JSON.stringify(savedQueries2));
    }
}

function show_savedQueries(modelName) {
    $("#savedQueries").empty();

    const savedQueries = get_saved_queries(modelName);
    if (savedQueries.length > 0) {
        $("#savedQueries").append($("<div>Saved Queries:</div>"));
        savedQueries.forEach((query, ix) => {
            $("#savedQueries").append($("<div class='query-example'></div>")
                .click(() => {
                    load_query(modelName, ix);
                })
                .text(calc_finalQuery(query.preCondition, query.path, query.postCondition, query.linkFailures))
                .attr("title", query.description)
                .append($("<span class='delete'>x</span>")
                    .click((ev) => {
                        delete_query(modelName, ix);
                        ev.stopPropagation();
                    })
                    .attr("title", "DELETE this query")
                )
            );
        });
    }  
}

function get_saved_queries(modelName) {
    const savedQueries = JSON.parse(localStorage.getItem("savedQueries2") ?? "{}");
    const savedQueriesForModel = savedQueries[modelName] ?? (savedQueries[modelName] = []);
    return savedQueriesForModel;
}

function save_query(modelName) {
    let savedQueries = JSON.parse(localStorage.getItem("savedQueries2") ?? "{}");
    let savedQueriesForModel = savedQueries[modelName] ?? (savedQueries[modelName] = []);

    const data = {
        preCondition: $("#preCondition").val(),
        path: $("#path").val(),
        postCondition: $("#postCondition").val(),
        linkFailures: $("#linkFailures").val(),
        description: $("#description").val(),

        engine: $("#engine").val(),
        sim_mode: $("#sim-mode").val(),
        reduction: $("#reduction").val(),

        weights: getWeightList()
    };
    savedQueriesForModel.push(data);

    localStorage.setItem("savedQueries2", JSON.stringify(savedQueries));

    show_savedQueries(modelName);
}

function load_query(modelName, queryIx) {
    const savedQueries = JSON.parse(localStorage.getItem("savedQueries2") ?? "{}");
    const savedQueriesForModel = savedQueries[modelName] ?? (savedQueries[modelName] = []);
    const savedQuery = savedQueriesForModel[queryIx];
    if (savedQuery) {
        $("#preCondition").val(savedQuery.preCondition);
        $("#path").val(savedQuery.path);
        $("#postCondition").val(savedQuery.postCondition);
        $("#linkFailures").val(savedQuery.linkFailures);

        $("#engine").val(savedQuery.engine);
        $("#sim-mode").val(savedQuery.sim_mode);
        $("#reduction").val(savedQuery.reduction);

        $("#description").val(savedQuery.description);

        restoreWeightList(savedQuery.weights);

        show_finalQuery();
    }
}

function delete_query(modelName, queryIx) {
    let savedQueries = JSON.parse(localStorage.getItem("savedQueries2") ?? "{}");
    let savedQueriesForModel = savedQueries[modelName] ?? (savedQueries[modelName] = []);
    savedQueriesForModel.splice(queryIx, 1);
    localStorage.setItem("savedQueries2", JSON.stringify(savedQueries));
    show_savedQueries(modelName);
}

function show_routerList(data) {
    $("#router_list_routers").empty();
    $("#router_list_routers").append(
        $("<li class='router_list_router' id='router_list_router_ANYROUTER' onclick='set_router_list_anyrouter()'>Any Router [.]</li>"));
    $("#router_list_routers").append(Object.keys(data.routers).sort().map((routerName) =>
        $("<li class='router_list_router' id='router_list_router_" + routerName + "' onclick='set_router_list_router(\"" + routerName + "\")'>" + routerName + "</li>")));
    $("#router_list_interfaces").empty();
    $("#add-interface-to-path").prop('disabled', true);
    $("#copy-interface-to-clipboard").prop('disabled', true);
    set_router_list_anyrouter();
}

function set_router_list_anyrouter() {
    $('.router_list_router').removeClass('selected');
    $('#router_list_router_ANYROUTER').addClass('selected');
    $("#router_list_interfaces").empty();
    $("#add-interface-to-path").prop('disabled', false).val('Insert selected router in route restriction').off('click').click(e => {
        insert_in_textarea($("#path"), '.');
    });
    $("#copy-interface-to-clipboard").prop('disabled', false).val('Copy selected router to clipboard').off('click').click(e => {
        copy_to_clipboard('.');
    });
    show_label_list([]);
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
    $("#router_list_interfaces").append(Object.keys(model_data.routers[routerName].interfaces).sort().map((ifName) =>
        $("<li class='router_list_interface' id='router_list_interface_" + ifName + "' onclick='set_router_list_interface(\"" + routerName + "\", \"" + ifName + "\")'>" + ifName + "</li>")));
    $("#add-interface-to-path").prop('disabled', false).val('Insert selected router in route restriction').off('click').click(e => {
        insert_in_textarea($("#path"), quote_if_necessary(routerName));
    });
    $("#copy-interface-to-clipboard").prop('disabled', false).val('Copy selected router to clipboard').off('click').click(e => {
        copy_to_clipboard(quote_if_necessary(routerName));
    });
    show_label_list([]);
}

function set_router_list_interface(routerName, ifName) {
    $('.router_list_interface').removeClass('selected');
    $('#router_list_interface_' + ifName.replace(/(:|\.|\[|\]|,|=|@|\/)/g, "\\$1")).addClass('selected');
    $("#add-interface-to-path").prop('disabled', false).val('Insert selected interface in route restriction').off('click').click(e => {
        var finalName = quote_if_necessary(routerName) + "." + quote_if_necessary(ifName);
        insert_in_textarea($("#path"), finalName);
    });
    $("#copy-interface-to-clipboard").prop('disabled', false).val('Copy selected interface to clipboard').off('click').click(e => {
        var finalName = quote_if_necessary(routerName) + "." + quote_if_necessary(ifName);
        copy_to_clipboard(finalName);
    });
    show_label_list(model_data.routers[routerName].interfaces[ifName]);
}

function show_label_list(labels) {
    $("#router_list_labels").empty();
    $("#router_list_labels").append(
        $("<li class='router_list_label' id='router_list_label_ip' onclick='set_router_list_label(\"ip\")'>ip</li>"));
    $("#router_list_labels").append(
        $("<li class='router_list_label' id='router_list_label_mpls' onclick='set_router_list_label(\"mpls\")'>mpls</li>"));
    $("#router_list_labels").append(
        $("<li class='router_list_label' id='router_list_label_smpls' onclick='set_router_list_label(\"smpls\")'>smpls</li>"));
    $("#router_list_labels").append(
        labels.filter((labelName) => !["ip", "mpls", "smpls"].includes(labelName))
        .sort().map((labelName) =>
        $("<li class='router_list_label' id='router_list_label_" + labelName + "' onclick='set_router_list_label(\"" + labelName + "\")'>" + labelName + "</li>")));
    set_router_list_label("ip");
}

function set_router_list_label(labelName) {
    $('.router_list_label').removeClass('selected');
    $('#router_list_label_' + labelName.replace(/(:|\.|\[|\]|,|=|@|\/)/g, "\\$1")).addClass('selected');
    $("#add-label-to-header").prop('disabled', false).off('click').click(e => {
        insert_in_textarea(labelTarget, quote_if_necessary(labelName));
    });
    $("#copy-label-to-clipboard").prop('disabled', false).off('click').click(e => {
        copy_to_clipboard(quote_if_necessary(labelName));
    });
}

function insert_in_textarea(textarea, text) {
    const cursorPos = textarea[0].selectionStart;
    const oldContent = textarea.val().substring(0, cursorPos) + textarea.val().substring(textarea[0].selectionEnd);
    textarea.val(oldContent.substring(0, cursorPos) + text + oldContent.substring(cursorPos));
    textarea[0].selectionStart = textarea[0].selectionEnd = cursorPos + text.length;
    textarea.focus();
    show_finalQuery();
}

function copy_to_clipboard(text) {
    const currentFocus = document.activeElement;
    const clibpoard_buffer = $("<input>");
    $("body").append(clibpoard_buffer);
    clibpoard_buffer.val(text).select();
    document.execCommand("copy");
    clibpoard_buffer.remove();
    if (currentFocus && typeof currentFocus.focus === "function") {
        currentFocus.focus();
    }
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

function calc_finalQuery(preCondition, path, postCondition, linkFailures) {
    return '<' + preCondition + '> ' +
    path +
    ' <' + postCondition + '> ' +
    linkFailures;
}

function show_finalQuery() {
    var final_query = calc_finalQuery(
        $('#preCondition').val(),
        $('#path').val(),
        $('#postCondition').val(),
        $('#linkFailures').val());
    $('#final_query').text(final_query);
    $("#query_entry .subheader").text(final_query);

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
