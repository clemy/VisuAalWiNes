$(document).ready(function () {
    comm_init();
    map_init();
    model_init();
    weight_init();

    $(".expand-icon, .header").click(function () {
        $(this).siblings(".inner-container").toggle(200);
        // siblings does not work here, as it could be $(this)
        $(this).parent().children(".expand-icon").text(
            $(this).parent().children(".expand-icon").text() == '+' ? '-' : '+');
    });
    
    // model_selection is initial UI control
    $("#model_selection").children(".expand-icon").click();

    //$("#about").children(".expand-icon").click();
});

function set_sidebar_right_visibility() {
    if ($("#router_list,#raw_result").is(":visible")) {
        //$("#sidebar_right").hide(200);
    } else {
        //$("#sidebar_right").show(200);
    }
}
