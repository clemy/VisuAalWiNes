function weight_init() {
    var weightGroupTemplate = document.getElementById('weight_group_template');
    Sortable.create(weightGroupTemplate, {
        group: {
            name: 'weight_groups',
            pull: 'clone',
            put: false
        },
        sort: false,
        animation: 150
    });
    var weightTemplates = document.getElementById('weight_templates');
    Sortable.create(weightTemplates, {
        group: {
            name: 'weights',
            pull: 'clone',
            put: false
        },
        sort: false,
        animation: 150
    });

    var weightList = document.getElementById('weight_list');
    var weightListSortable = Sortable.create(weightList, {
        group: {
            name: 'weight_groups'
        },
        animation: 150,
        onSort: evt => {
            weightListChanged();
        },
        onAdd: evt => {
            initializeWeightGroup(evt.item);
            weightListChanged();
        }
    });
    addSortableOutsideDrop(weightListSortable, function(evt){
        var el = evt.item;
        if (el.className == "weight_group") {
            if (el.parentNode.childElementCount > 1) {
                el.parentNode.removeChild(el);
                weightListChanged();
            }
        }
    });

    $(".weight_add").click(function(evt){
        var el = evt.target.parentNode;
        if (el.className == "weight_group") {
            var newElement = $(el).clone(true);
            newElement.appendTo("#weight_list");
            initializeWeightGroup(newElement[0]);
            weightListChanged();
        }
    });

    $(".weight_del").click(function(evt){
        var el = evt.target.parentNode;
        if (el.className == "weight_group") {
            if (el.parentNode.childElementCount > 1) {
                el.parentNode.removeChild(el);
                weightListChanged();
            }
        }
    });

    var initialWeightGroup = document.getElementById('initial_weight_group');
    initializeWeightGroup(initialWeightGroup);
}

// From https://github.com/SortableJS/Sortable/issues/193
function addSortableOutsideDrop(sortableInstance, callback)
{
    var enableDragover = function(evt){ evt.preventDefault(); };
    document.documentElement.addEventListener("dragover", enableDragover);
    
    var setToInsideDrop = function(){ sortableInstance._isOutsideDrop = false; };
    // Set to inside drop if dropping inside the sortable element
    sortableInstance.el.addEventListener("drop", setToInsideDrop);
    // Set to inside drop if moving items across sortable lists
    Sortable.utils.on(sortableInstance.el, "add", setToInsideDrop);
    Sortable.utils.on(sortableInstance.el, "remove", setToInsideDrop);

    // On start, initialize to be outside drop
    Sortable.utils.on(sortableInstance.el, "start", function(evt){
        sortableInstance._isOutsideDrop = true;
    });
    // Check if is still outside drop, and if it is, do callback
    Sortable.utils.on(sortableInstance.el, "end", function(evt){
        if (sortableInstance._isOutsideDrop || typeof(sortableInstance._isOutsideDrop) == 'undefined')
            callback(evt);
    });
}

function initializeWeightGroup(group) {
    var initialWeightGroupSortable = Sortable.create(group, {
        group: {
            name: 'weights'
        },
        animation: 150,
        draggable: '.weight_item',
        onSort: evt => {
            weightListChanged();
        }
    });
    addSortableOutsideDrop(initialWeightGroupSortable, function(evt){
        var el = evt.item;
        el.parentNode.removeChild(el);
        weightListChanged();
    });
}

function weightListChanged() {
    /*
    if ($('#weight_list .weight_item').length > 0) {
        $("#weight_entry .subheader").text('Enabled');
    } else {
        $("#weight_entry .subheader").text('');
    }
    */
}

function getWeightList() {
    if ($('#weight_list .weight_item').length == 0) {
        return null;
    }
    return $('#weight_list .weight_group').map((ix, el) =>
        // return array in array to prevent flattening of jQuery map
        [$(el).children('.weight_item').map((ix, el) =>
            ({
                atom: el.innerText,
                factor: parseInt($(el).children('input').val())
            })
        ).get()]
    ).get();
}

function restoreWeightList(weightList) {
    $('#weight_list').empty();
    if (weightList == null) {
        const weightGroup = $('#weight_group_template .weight_group').clone(true);
        weightGroup.appendTo('#weight_list');
        initializeWeightGroup(weightGroup[0]);
    } else {
        weightList.forEach(group => {
            const weightGroup = $('#weight_group_template .weight_group').clone(true);
            weightGroup.appendTo('#weight_list');
            initializeWeightGroup(weightGroup[0]);
            group.forEach(element => {
                const weightElement = $('#weight_templates>:contains(' + element.atom + ')').clone();
                weightElement.children('input').val(element.factor);
                weightElement.appendTo(weightGroup);
            });
        });
    }
    weightListChanged();
}
